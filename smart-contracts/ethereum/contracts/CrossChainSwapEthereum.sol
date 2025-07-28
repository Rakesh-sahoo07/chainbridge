// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract CrossChainSwapEthereum is ReentrancyGuard, Ownable, Pausable {
    using SafeERC20 for IERC20;

    struct Swap {
        bytes32 hashlock;
        uint256 timelock;
        address initiator;
        address recipient;
        uint256 amount;
        address token;
        bool completed;
        bool refunded;
        uint256 createdAt;
    }

    mapping(bytes32 => Swap) public swaps;
    mapping(address => bool) public supportedTokens;
    
    uint256 public constant MIN_TIMELOCK = 2 hours;
    uint256 public constant MAX_TIMELOCK = 48 hours;
    uint256 public swapFee = 10; // 0.1% (10/10000)
    uint256 public constant FEE_DENOMINATOR = 10000;
    
    address public feeRecipient;

    event SwapInitiated(
        bytes32 indexed swapId,
        bytes32 indexed hashlock,
        address indexed initiator,
        address recipient,
        uint256 amount,
        address token,
        uint256 timelock,
        uint256 createdAt
    );

    event SwapCompleted(
        bytes32 indexed swapId,
        bytes32 indexed hashlock,
        bytes32 secret,
        address indexed completer
    );

    event SwapRefunded(
        bytes32 indexed swapId,
        bytes32 indexed hashlock,
        address indexed initiator
    );

    event TokenAdded(address indexed token);
    event TokenRemoved(address indexed token);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event FeeRecipientUpdated(address indexed oldRecipient, address indexed newRecipient);

    constructor(address _feeRecipient) Ownable(msg.sender) {
        require(_feeRecipient != address(0), "Invalid fee recipient");
        feeRecipient = _feeRecipient;
    }

    modifier validTimelock(uint256 _timelock) {
        require(
            _timelock >= block.timestamp + MIN_TIMELOCK &&
            _timelock <= block.timestamp + MAX_TIMELOCK,
            "Invalid timelock"
        );
        _;
    }

    modifier swapExists(bytes32 _swapId) {
        require(swaps[_swapId].initiator != address(0), "Swap does not exist");
        _;
    }

    modifier swapNotCompleted(bytes32 _swapId) {
        require(!swaps[_swapId].completed, "Swap already completed");
        _;
    }

    modifier swapNotRefunded(bytes32 _swapId) {
        require(!swaps[_swapId].refunded, "Swap already refunded");
        _;
    }

    function initiateSwap(
        bytes32 _swapId,
        bytes32 _hashlock,
        address _recipient,
        uint256 _amount,
        address _token,
        uint256 _timelock
    ) 
        external 
        nonReentrant 
        whenNotPaused 
        validTimelock(_timelock)
    {
        require(_recipient != address(0), "Invalid recipient");
        require(_amount > 0, "Amount must be greater than 0");
        require(supportedTokens[_token], "Token not supported");
        require(swaps[_swapId].initiator == address(0), "Swap ID already exists");
        require(_hashlock != bytes32(0), "Invalid hashlock");

        uint256 feeAmount = (_amount * swapFee) / FEE_DENOMINATOR;
        uint256 swapAmount = _amount - feeAmount;

        IERC20(_token).safeTransferFrom(msg.sender, address(this), _amount);
        
        if (feeAmount > 0) {
            IERC20(_token).safeTransfer(feeRecipient, feeAmount);
        }

        swaps[_swapId] = Swap({
            hashlock: _hashlock,
            timelock: _timelock,
            initiator: msg.sender,
            recipient: _recipient,
            amount: swapAmount,
            token: _token,
            completed: false,
            refunded: false,
            createdAt: block.timestamp
        });

        emit SwapInitiated(
            _swapId,
            _hashlock,
            msg.sender,
            _recipient,
            swapAmount,
            _token,
            _timelock,
            block.timestamp
        );
    }

    function completeSwap(bytes32 _swapId, bytes32 _secret)
        external
        nonReentrant
        whenNotPaused
        swapExists(_swapId)
        swapNotCompleted(_swapId)
        swapNotRefunded(_swapId)
    {
        Swap storage swap = swaps[_swapId];
        require(block.timestamp <= swap.timelock, "Swap expired");
        require(keccak256(abi.encodePacked(_secret)) == swap.hashlock, "Invalid secret");

        swap.completed = true;

        IERC20(swap.token).safeTransfer(swap.recipient, swap.amount);

        emit SwapCompleted(_swapId, swap.hashlock, _secret, msg.sender);
    }

    function refund(bytes32 _swapId)
        external
        nonReentrant
        swapExists(_swapId)
        swapNotCompleted(_swapId)
        swapNotRefunded(_swapId)
    {
        Swap storage swap = swaps[_swapId];
        require(msg.sender == swap.initiator, "Only initiator can refund");
        require(block.timestamp > swap.timelock, "Swap not yet expired");

        swap.refunded = true;

        IERC20(swap.token).safeTransfer(swap.initiator, swap.amount);

        emit SwapRefunded(_swapId, swap.hashlock, swap.initiator);
    }

    function addSupportedToken(address _token) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(!supportedTokens[_token], "Token already supported");
        
        supportedTokens[_token] = true;
        emit TokenAdded(_token);
    }

    function removeSupportedToken(address _token) external onlyOwner {
        require(supportedTokens[_token], "Token not supported");
        
        supportedTokens[_token] = false;
        emit TokenRemoved(_token);
    }

    function updateSwapFee(uint256 _newFee) external onlyOwner {
        require(_newFee <= 100, "Fee too high"); // Max 1%
        
        uint256 oldFee = swapFee;
        swapFee = _newFee;
        emit FeeUpdated(oldFee, _newFee);
    }

    function updateFeeRecipient(address _newRecipient) external onlyOwner {
        require(_newRecipient != address(0), "Invalid recipient");
        
        address oldRecipient = feeRecipient;
        feeRecipient = _newRecipient;
        emit FeeRecipientUpdated(oldRecipient, _newRecipient);
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function getSwapDetails(bytes32 _swapId) 
        external 
        view 
        returns (
            bytes32 hashlock,
            uint256 timelock,
            address initiator,
            address recipient,
            uint256 amount,
            address token,
            bool completed,
            bool refunded,
            uint256 createdAt
        ) 
    {
        Swap memory swap = swaps[_swapId];
        return (
            swap.hashlock,
            swap.timelock,
            swap.initiator,
            swap.recipient,
            swap.amount,
            swap.token,
            swap.completed,
            swap.refunded,
            swap.createdAt
        );
    }

    function isSwapActive(bytes32 _swapId) external view returns (bool) {
        Swap memory swap = swaps[_swapId];
        return swap.initiator != address(0) && 
               !swap.completed && 
               !swap.refunded && 
               block.timestamp <= swap.timelock;
    }

    function emergencyWithdraw(address _token, uint256 _amount) external onlyOwner {
        require(_token != address(0), "Invalid token");
        IERC20(_token).safeTransfer(owner(), _amount);
    }
}