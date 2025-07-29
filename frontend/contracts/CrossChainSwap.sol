// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

contract CrossChainSwap is ReentrancyGuard {
    struct Swap {
        bytes32 hashlock;
        uint256 timelock;
        address recipient;
        address initiator;
        uint256 amount;
        address token;
        bool active;
        bool completed;
        bool refunded;
    }

    mapping(bytes32 => Swap) public swaps;
    
    event SwapInitiated(
        bytes32 indexed swapId,
        address indexed initiator,
        bytes32 hashlock,
        address recipient,
        uint256 amount,
        address token,
        uint256 timelock
    );
    
    event SwapCompleted(bytes32 indexed swapId, bytes32 secret);
    event SwapRefunded(bytes32 indexed swapId);

    // Timelock constraints
    uint256 public constant MIN_TIMELOCK = 300; // 5 minutes
    uint256 public constant MAX_TIMELOCK = 86400; // 24 hours

    modifier validTimelock(uint256 timelock) {
        require(timelock > block.timestamp, "Timelock must be in future");
        require(timelock <= block.timestamp + MAX_TIMELOCK, "Timelock too far in future");
        require(timelock >= block.timestamp + MIN_TIMELOCK, "Timelock too soon");
        _;
    }

    modifier swapExists(bytes32 swapId) {
        require(swaps[swapId].active, "Swap does not exist");
        _;
    }

    modifier swapNotExpired(bytes32 swapId) {
        require(block.timestamp < swaps[swapId].timelock, "Swap has expired");
        _;
    }

    modifier swapExpired(bytes32 swapId) {
        require(block.timestamp >= swaps[swapId].timelock, "Swap has not expired");
        _;
    }

    function initiateSwap(
        bytes32 swapId,
        bytes32 hashlock,
        address recipient,
        uint256 amount,
        address token,
        uint256 timelock
    ) external nonReentrant validTimelock(timelock) {
        require(!swaps[swapId].active, "Swap already exists");
        require(recipient != address(0), "Invalid recipient");
        require(amount > 0, "Amount must be greater than 0");

        // Transfer tokens from initiator to this contract
        if (token == address(0)) {
            // ETH swap
            require(msg.value == amount, "ETH amount mismatch");
        } else {
            // ERC20 swap
            require(msg.value == 0, "ETH not allowed for token swaps");
            IERC20(token).transferFrom(msg.sender, address(this), amount);
        }

        // Store swap details
        swaps[swapId] = Swap({
            hashlock: hashlock,
            timelock: timelock,
            recipient: recipient,
            initiator: msg.sender,
            amount: amount,
            token: token,
            active: true,
            completed: false,
            refunded: false
        });

        emit SwapInitiated(swapId, msg.sender, hashlock, recipient, amount, token, timelock);
    }

    function completeSwap(bytes32 swapId, bytes32 secret) 
        external 
        nonReentrant 
        swapExists(swapId) 
        swapNotExpired(swapId) 
    {
        Swap storage swap = swaps[swapId];
        require(!swap.completed, "Swap already completed");
        require(!swap.refunded, "Swap already refunded");
        require(keccak256(abi.encode(secret)) == swap.hashlock, "Invalid secret");

        swap.completed = true;
        swap.active = false;

        // Transfer tokens to recipient
        if (swap.token == address(0)) {
            // ETH transfer
            payable(swap.recipient).transfer(swap.amount);
        } else {
            // ERC20 transfer
            IERC20(swap.token).transfer(swap.recipient, swap.amount);
        }

        emit SwapCompleted(swapId, secret);
    }

    function refund(bytes32 swapId) 
        external 
        nonReentrant 
        swapExists(swapId) 
        swapExpired(swapId) 
    {
        Swap storage swap = swaps[swapId];
        require(!swap.completed, "Swap already completed");
        require(!swap.refunded, "Swap already refunded");
        require(msg.sender == swap.initiator, "Only initiator can refund");

        swap.refunded = true;
        swap.active = false;

        // Return tokens to initiator
        if (swap.token == address(0)) {
            // ETH refund
            payable(swap.initiator).transfer(swap.amount);
        } else {
            // ERC20 refund
            IERC20(swap.token).transfer(swap.initiator, swap.amount);
        }

        emit SwapRefunded(swapId);
    }

    function getSwapDetails(bytes32 swapId) 
        external 
        view 
        returns (
            bytes32 hashlock,
            uint256 timelock,
            address recipient,
            address initiator,
            uint256 amount,
            address token,
            bool active,
            bool completed,
            bool refunded
        ) 
    {
        Swap storage swap = swaps[swapId];
        return (
            swap.hashlock,
            swap.timelock,
            swap.recipient,
            swap.initiator,
            swap.amount,
            swap.token,
            swap.active,
            swap.completed,
            swap.refunded
        );
    }

    function isSwapActive(bytes32 swapId) external view returns (bool) {
        return swaps[swapId].active;
    }

    // Emergency function to check current timestamp
    function getCurrentTimestamp() external view returns (uint256) {
        return block.timestamp;
    }

    // Function to check if timelock is valid (for testing)
    function isValidTimelock(uint256 timelock) external view returns (bool) {
        return timelock > block.timestamp && 
               timelock <= block.timestamp + MAX_TIMELOCK && 
               timelock >= block.timestamp + MIN_TIMELOCK;
    }
}