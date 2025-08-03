// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title CrossChainBridge
 * @dev Bidirectional bridge for cross-chain token transfers with liquidity pools
 * Supports both ETH→Aptos and Aptos→ETH transfers with single-sided operations
 */
contract CrossChainBridge is ReentrancyGuard, Ownable {
    
    struct BridgeRequest {
        bytes32 requestId;
        address user;
        string destinationChain;
        string destinationAddress;
        uint256 amount;
        address token;
        uint256 timestamp;
        bool processed;
    }
    
    struct TokenReserves {
        uint256 balance;           // Available reserves for releases
        uint256 totalBridgedIn;    // Total amount bridged TO this chain
        uint256 totalBridgedOut;   // Total amount bridged FROM this chain
        uint256 feesCollected;     // Total fees collected
    }
    
    // State variables
    mapping(bytes32 => BridgeRequest) public bridgeRequests;
    mapping(address => TokenReserves) public tokenReserves;
    mapping(address => bool) public authorizedRelayers;
    
    // Bridge fee (0.1% = 1000 basis points out of 1,000,000)
    uint256 public constant BRIDGE_FEE_BASIS_POINTS = 1000;
    uint256 public constant BASIS_POINTS_DENOMINATOR = 1000000;
    
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
    
    event AptosToEthereumProcessed(
        bytes32 indexed requestId,
        address indexed recipient,
        uint256 amount,
        address indexed token,
        address relayer
    );
    
    event ReservesDeposited(
        address indexed token,
        uint256 amount,
        address indexed depositor
    );
    
    event RelayerAuthorized(address indexed relayer, bool authorized);
    
    // Modifiers
    modifier onlyAuthorizedRelayer() {
        require(authorizedRelayers[msg.sender] || msg.sender == owner(), "Not authorized relayer");
        _;
    }
    
    modifier validBridgeRequest(bytes32 requestId) {
        require(bridgeRequests[requestId].requestId != bytes32(0), "Bridge request does not exist");
        require(!bridgeRequests[requestId].processed, "Bridge request already processed");
        _;
    }
    
    constructor() {
        // Owner is automatically authorized
        authorizedRelayers[msg.sender] = true;
        emit RelayerAuthorized(msg.sender, true);
    }
    
    /**
     * @dev Bridge tokens from Ethereum to Aptos
     * User locks tokens on Ethereum, relayer releases from Aptos reserves
     */
    function bridgeToAptos(
        uint256 amount, 
        string calldata aptosAddress
    ) external nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(bytes(aptosAddress).length > 0, "Invalid Aptos address");
        
        // For now, we'll hardcode mUSDC address - can be made configurable later
        address mockUSDC = 0x7a265Db61E004f4242fB322fa72F8a52D2B06664;
        
        // Calculate fee
        uint256 fee = (amount * BRIDGE_FEE_BASIS_POINTS) / BASIS_POINTS_DENOMINATOR;
        uint256 amountAfterFee = amount - fee;
        
        // Transfer tokens from user to bridge contract
        IERC20(mockUSDC).transferFrom(msg.sender, address(this), amount);
        
        // Update reserves and stats
        tokenReserves[mockUSDC].balance += amountAfterFee;
        tokenReserves[mockUSDC].totalBridgedOut += amountAfterFee;
        tokenReserves[mockUSDC].feesCollected += fee;
        
        // Generate unique request ID
        bytes32 requestId = keccak256(
            abi.encodePacked(
                msg.sender,
                "aptos",
                aptosAddress,
                amount,
                block.timestamp,
                block.number
            )
        );
        
        // Store bridge request
        bridgeRequests[requestId] = BridgeRequest({
            requestId: requestId,
            user: msg.sender,
            destinationChain: "aptos",
            destinationAddress: aptosAddress,
            amount: amountAfterFee,
            token: mockUSDC,
            timestamp: block.timestamp,
            processed: false
        });
        
        emit BridgeRequestCreated(
            requestId,
            msg.sender,
            "aptos",
            aptosAddress,
            amountAfterFee,
            mockUSDC,
            block.timestamp
        );
    }
    
    /**
     * @dev Process Aptos to Ethereum bridge request (called by relayer)
     * Releases tokens from Ethereum reserves when user bridges from Aptos
     */
    function processAptosToEthereum(
        bytes32 requestId,
        address recipient,
        uint256 amount,
        address token
    ) external onlyAuthorizedRelayer nonReentrant {
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");
        
        // Check if we have sufficient reserves
        require(
            tokenReserves[token].balance >= amount,
            "Insufficient bridge reserves"
        );
        
        // Update reserves
        tokenReserves[token].balance -= amount;
        tokenReserves[token].totalBridgedIn += amount;
        
        // Transfer tokens to recipient
        IERC20(token).transfer(recipient, amount);
        
        emit AptosToEthereumProcessed(
            requestId,
            recipient,
            amount,
            token,
            msg.sender
        );
    }
    
    /**
     * @dev Mark an ETH→Aptos bridge request as processed (called by relayer)
     */
    function markRequestProcessed(
        bytes32 requestId
    ) external onlyAuthorizedRelayer validBridgeRequest(requestId) {
        bridgeRequests[requestId].processed = true;
        
        emit BridgeRequestProcessed(
            requestId,
            bridgeRequests[requestId].user,
            bridgeRequests[requestId].amount,
            bridgeRequests[requestId].token,
            msg.sender,
            block.timestamp
        );
    }
    
    /**
     * @dev Deposit tokens to bridge reserves (only owner)
     */
    function depositReserves(
        address token,
        uint256 amount
    ) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        
        // Transfer tokens from owner to bridge
        IERC20(token).transferFrom(msg.sender, address(this), amount);
        
        // Update reserves
        tokenReserves[token].balance += amount;
        
        emit ReservesDeposited(token, amount, msg.sender);
    }
    
    /**
     * @dev Emergency withdraw reserves (only owner)
     */
    function emergencyWithdrawReserves(
        address token,
        uint256 amount,
        address to
    ) external onlyOwner nonReentrant {
        require(amount > 0, "Amount must be greater than 0");
        require(to != address(0), "Invalid recipient");
        
        // Check available balance
        uint256 contractBalance = IERC20(token).balanceOf(address(this));
        require(contractBalance >= amount, "Insufficient contract balance");
        
        // Transfer tokens
        IERC20(token).transfer(to, amount);
        
        // Update reserves if needed
        if (tokenReserves[token].balance >= amount) {
            tokenReserves[token].balance -= amount;
        } else {
            tokenReserves[token].balance = 0;
        }
    }
    
    /**
     * @dev Authorize/deauthorize relayer (only owner)
     */
    function setRelayerAuthorization(
        address relayer,
        bool authorized
    ) external onlyOwner {
        require(relayer != address(0), "Invalid relayer address");
        authorizedRelayers[relayer] = authorized;
        emit RelayerAuthorized(relayer, authorized);
    }
    
    /**
     * @dev Get bridge request details
     */
    function getBridgeRequest(
        bytes32 requestId
    ) external view returns (BridgeRequest memory) {
        return bridgeRequests[requestId];
    }
    
    /**
     * @dev Get token reserves information
     */
    function getReserves(
        address token
    ) external view returns (TokenReserves memory) {
        return tokenReserves[token];
    }
    
    /**
     * @dev Check if address is authorized relayer
     */
    function isAuthorizedRelayer(address relayer) external view returns (bool) {
        return authorizedRelayers[relayer];
    }
    
    /**
     * @dev Get contract's token balance
     */
    function getTokenBalance(address token) external view returns (uint256) {
        return IERC20(token).balanceOf(address(this));
    }
}