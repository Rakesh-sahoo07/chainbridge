// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

contract TokenManager is Ownable, Pausable {
    struct TokenInfo {
        bool isSupported;
        uint256 minAmount;
        uint256 maxAmount;
        uint256 addedAt;
        string name;
        string symbol;
        uint8 decimals;
    }

    mapping(address => TokenInfo) public tokenInfo;
    address[] public supportedTokensList;
    
    mapping(address => mapping(string => address)) public crossChainTokenMapping;

    event TokenAdded(
        address indexed token,
        string name,
        string symbol,
        uint8 decimals,
        uint256 minAmount,
        uint256 maxAmount
    );
    
    event TokenRemoved(address indexed token);
    event TokenLimitsUpdated(address indexed token, uint256 minAmount, uint256 maxAmount);
    event CrossChainMappingSet(address indexed ethToken, string chainName, address chainToken);

    constructor() Ownable(msg.sender) {}

    function addToken(
        address _token,
        string memory _name,
        string memory _symbol,
        uint8 _decimals,
        uint256 _minAmount,
        uint256 _maxAmount
    ) external onlyOwner {
        require(_token != address(0), "Invalid token address");
        require(!tokenInfo[_token].isSupported, "Token already supported");
        require(_maxAmount >= _minAmount, "Invalid amount limits");
        require(bytes(_name).length > 0, "Name cannot be empty");
        require(bytes(_symbol).length > 0, "Symbol cannot be empty");

        tokenInfo[_token] = TokenInfo({
            isSupported: true,
            minAmount: _minAmount,
            maxAmount: _maxAmount,
            addedAt: block.timestamp,
            name: _name,
            symbol: _symbol,
            decimals: _decimals
        });

        supportedTokensList.push(_token);

        emit TokenAdded(_token, _name, _symbol, _decimals, _minAmount, _maxAmount);
    }

    function removeToken(address _token) external onlyOwner {
        require(tokenInfo[_token].isSupported, "Token not supported");

        tokenInfo[_token].isSupported = false;

        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (supportedTokensList[i] == _token) {
                supportedTokensList[i] = supportedTokensList[supportedTokensList.length - 1];
                supportedTokensList.pop();
                break;
            }
        }

        emit TokenRemoved(_token);
    }

    function updateTokenLimits(
        address _token,
        uint256 _minAmount,
        uint256 _maxAmount
    ) external onlyOwner {
        require(tokenInfo[_token].isSupported, "Token not supported");
        require(_maxAmount >= _minAmount, "Invalid amount limits");

        tokenInfo[_token].minAmount = _minAmount;
        tokenInfo[_token].maxAmount = _maxAmount;

        emit TokenLimitsUpdated(_token, _minAmount, _maxAmount);
    }

    function setCrossChainMapping(
        address _ethToken,
        string memory _chainName,
        address _chainToken
    ) external onlyOwner {
        require(tokenInfo[_ethToken].isSupported, "Ethereum token not supported");
        require(_chainToken != address(0), "Invalid chain token address");
        require(bytes(_chainName).length > 0, "Chain name cannot be empty");

        crossChainTokenMapping[_ethToken][_chainName] = _chainToken;

        emit CrossChainMappingSet(_ethToken, _chainName, _chainToken);
    }

    function isTokenSupported(address _token) external view returns (bool) {
        return tokenInfo[_token].isSupported;
    }

    function getTokenInfo(address _token)
        external
        view
        returns (
            bool isSupported,
            uint256 minAmount,
            uint256 maxAmount,
            uint256 addedAt,
            string memory name,
            string memory symbol,
            uint8 decimals
        )
    {
        TokenInfo memory info = tokenInfo[_token];
        return (
            info.isSupported,
            info.minAmount,
            info.maxAmount,
            info.addedAt,
            info.name,
            info.symbol,
            info.decimals
        );
    }

    function getSupportedTokens() external view returns (address[] memory) {
        address[] memory activeTokens = new address[](supportedTokensList.length);
        uint256 activeCount = 0;

        for (uint256 i = 0; i < supportedTokensList.length; i++) {
            if (tokenInfo[supportedTokensList[i]].isSupported) {
                activeTokens[activeCount] = supportedTokensList[i];
                activeCount++;
            }
        }

        address[] memory result = new address[](activeCount);
        for (uint256 i = 0; i < activeCount; i++) {
            result[i] = activeTokens[i];
        }

        return result;
    }

    function getCrossChainToken(address _ethToken, string memory _chainName)
        external
        view
        returns (address)
    {
        return crossChainTokenMapping[_ethToken][_chainName];
    }

    function isAmountValid(address _token, uint256 _amount) external view returns (bool) {
        TokenInfo memory info = tokenInfo[_token];
        return info.isSupported && 
               _amount >= info.minAmount && 
               _amount <= info.maxAmount;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }
}