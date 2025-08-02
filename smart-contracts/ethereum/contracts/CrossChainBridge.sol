// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/**
 * @title CrossChainBridge
 * @notice Enables single-sided cross-chain transfers with liquidity pools
 * @dev Users deposit tokens on source chain, bridge releases from destination reserves
 */
contract CrossChainBridge is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    // Constants
    uint256 public constant MIN_BRIDGE_AMOUNT = 1000; // 0.001 tokens minimum
    uint256 public constant MAX_BRIDGE_AMOUNT = 1000000 * 10**6; // 1M tokens maximum
    uint256 public constant REQUEST_EXPIRY = 24 hours;
    uint256 public constant BRIDGE_FEE = 10; // 0.1% (10/10000)
    uint256 public constant FEE_DENOMINATOR = 10000;

    // Supported chains
    string public constant CHAIN_APTOS = "aptos";
    string public constant CHAIN_ETHEREUM = "ethereum";

    // Supported tokens
    address public immutable MOCK_USDC;
    
    struct BridgeRequest {
        bytes32 requestId;
        address user;
        string destinationChain;
        string destinationAddress; // Aptos address
        uint256 amount;
        address token;
        uint256 timestamp;
        bool processed;
    }

    struct TokenReserves {
        uint256 balance;
        uint256 totalBridgedIn;
        uint256 totalBridgedOut;
        uint256 feesCollected;
    }

    // State variables
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    mapping(address => TokenReserves) public tokenReserves;
    mapping(address => bool) public relayers;
    mapping(address => bool) public supportedTokens;
    
    bool public bridgePaused;
    uint256 public totalRequests;

    // Events
    event BridgeRequestCreated(
        bytes32 indexed requestId,
        address indexed user,
        string destinationChain,
        string destinationAddress,
        uint256 amount,
        address indexed token,
        uint256 timestamp
    );

    event BridgeRequestProcessed(
        bytes32 indexed requestId,
        address indexed user,
        uint256 amount,
        address indexed token,
        address relayer,
        uint256 timestamp
    );

    event ReservesAdded(
        address indexed token,
        uint256 amount,
        uint256 newBalance,
        uint256 timestamp
    );

    event RelayerAdded(address indexed relayer);
    event RelayerRemoved(address indexed relayer);
    event BridgePaused();
    event BridgeUnpaused();

    // Modifiers
    modifier onlyRelayer() {
        require(relayers[msg.sender], "Not authorized relayer");
        _;
    }

    modifier whenNotPaused() {
        require(!bridgePaused, "Bridge is paused");
        _;
    }

    modifier validAmount(uint256 amount) {
        require(amount >= MIN_BRIDGE_AMOUNT && amount <= MAX_BRIDGE_AMOUNT, "Invalid amount");
        _;
    }

    modifier supportedToken(address token) {
        require(supportedTokens[token], "Token not supported");
        _;
    }

    constructor(address _mockUSDC) Ownable(msg.sender) {
        MOCK_USDC = _mockUSDC;
        
        // Add supported tokens
        supportedTokens[_mockUSDC] = true;
        
        // Add owner as first relayer
        relayers[msg.sender] = true;
        emit RelayerAdded(msg.sender);
    }

    /**
     * @notice Bridge mUSDC to Aptos
     * @dev User deposits mUSDC, relayer releases from Aptos reserves
     * @param amount Amount to bridge (in token units)
     * @param aptosAddress Destination address on Aptos
     */
    function bridgeToAptos(
        uint256 amount,
        string calldata aptosAddress
    ) external nonReentrant whenNotPaused validAmount(amount) supportedToken(MOCK_USDC) {
        require(bytes(aptosAddress).length > 0, "Invalid Aptos address");
        
        // Check user balance
        IERC20 token = IERC20(MOCK_USDC);
        require(token.balanceOf(msg.sender) >= amount, "Insufficient balance");

        // Generate unique request ID
        bytes32 requestId = generateRequestId(msg.sender, CHAIN_APTOS, amount, block.timestamp);
        require(bridgeRequests[requestId].requestId == bytes32(0), "Request already exists");

        // Calculate fee and net amount
        uint256 feeAmount = (amount * BRIDGE_FEE) / FEE_DENOMINATOR;
        uint256 netAmount = amount - feeAmount;

        // Transfer tokens from user to bridge
        token.safeTransferFrom(msg.sender, address(this), amount);

        // Update reserves and statistics
        TokenReserves storage reserves = tokenReserves[MOCK_USDC];
        reserves.balance += netAmount;
        reserves.totalBridgedOut += netAmount;
        reserves.feesCollected += feeAmount;

        // Create bridge request
        BridgeRequest memory request = BridgeRequest({
            requestId: requestId,
            user: msg.sender,
            destinationChain: CHAIN_APTOS,
            destinationAddress: aptosAddress,
            amount: netAmount,
            token: MOCK_USDC,
            timestamp: block.timestamp,
            processed: false
        });

        bridgeRequests[requestId] = request;
        totalRequests++;

        // Emit event for relayers
        emit BridgeRequestCreated(
            requestId,
            msg.sender,
            CHAIN_APTOS,
            aptosAddress,
            netAmount,
            MOCK_USDC,
            block.timestamp
        );
    }

    /**
     * @notice Process bridge request from Aptos (called by relayer)
     * @dev Releases tokens from Ethereum reserves to user
     * @param requestId Unique identifier for the bridge request
     * @param user Recipient address on Ethereum
     * @param amount Amount to release
     * @param token Token address to release
     */
    function processAptosToEthereum(
        bytes32 requestId,
        address user,
        uint256 amount,
        address token
    ) external onlyRelayer whenNotPaused supportedToken(token) {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Invalid amount");

        // Check reserves
        TokenReserves storage reserves = tokenReserves[token];
        require(reserves.balance >= amount, "Insufficient reserves");

        // Transfer tokens from bridge reserves to user
        IERC20(token).safeTransfer(user, amount);

        // Update reserves and statistics
        reserves.balance -= amount;
        reserves.totalBridgedIn += amount;

        // Emit event
        emit BridgeRequestProcessed(
            requestId,
            user,
            amount,
            token,
            msg.sender,
            block.timestamp
        );
    }

    /**
     * @notice Add reserves to the bridge (owner only)
     * @param token Token address to add reserves for
     * @param amount Amount to add
     */
    function addReserves(address token, uint256 amount) 
        external 
        onlyOwner 
        supportedToken(token) 
    {
        require(amount > 0, "Invalid amount");

        // Transfer tokens from owner to bridge
        IERC20(token).safeTransferFrom(msg.sender, address(this), amount);

        // Update reserves
        TokenReserves storage reserves = tokenReserves[token];
        reserves.balance += amount;

        emit ReservesAdded(token, amount, reserves.balance, block.timestamp);
    }

    /**
     * @notice Emergency withdraw reserves (owner only)
     * @param token Token address to withdraw
     * @param amount Amount to withdraw
     * @param to Recipient address
     */
    function emergencyWithdraw(address token, uint256 amount, address to) 
        external 
        onlyOwner 
    {
        require(to != address(0), "Invalid recipient");
        require(amount > 0, "Invalid amount");

        IERC20(token).safeTransfer(to, amount);

        // Update reserves if it's a supported token
        if (supportedTokens[token]) {
            TokenReserves storage reserves = tokenReserves[token];
            if (reserves.balance >= amount) {
                reserves.balance -= amount;
            } else {
                reserves.balance = 0;
            }
        }
    }

    // Admin functions
    function addRelayer(address relayer) external onlyOwner {
        require(relayer != address(0), "Invalid relayer address");
        relayers[relayer] = true;
        emit RelayerAdded(relayer);
    }

    function removeRelayer(address relayer) external onlyOwner {
        relayers[relayer] = false;
        emit RelayerRemoved(relayer);
    }

    function pauseBridge() external onlyOwner {
        bridgePaused = true;
        emit BridgePaused();
    }

    function unpauseBridge() external onlyOwner {
        bridgePaused = false;
        emit BridgeUnpaused();
    }

    function addSupportedToken(address token) external onlyOwner {
        require(token != address(0), "Invalid token address");
        supportedTokens[token] = true;
    }

    function removeSupportedToken(address token) external onlyOwner {
        supportedTokens[token] = false;
    }

    // View functions
    function getReserves(address token) external view returns (TokenReserves memory) {
        return tokenReserves[token];
    }

    function getBridgeRequest(bytes32 requestId) external view returns (BridgeRequest memory) {
        return bridgeRequests[requestId];
    }

    function isRelayer(address account) external view returns (bool) {
        return relayers[account];
    }

    function getContractBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }

    // Helper functions
    function generateRequestId(
        address user,
        string memory chain,
        uint256 amount,
        uint256 timestamp
    ) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(user, chain, amount, timestamp));
    }
}