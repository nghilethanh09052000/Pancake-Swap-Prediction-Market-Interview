// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title MockPriceOracle
 * @dev Mock Chainlink price oracle for testing purposes
 */
contract MockPriceOracle is AggregatorV3Interface {
    int256 private price;
    uint8 private _decimals;
    string private _description;
    
    constructor(int256 _initialPrice, uint8 decimalsValue) {
        price = _initialPrice;
        _decimals = decimalsValue;
        _description = "Mock BNB/USD Price Feed";
    }
    
    function setPrice(int256 _price) external {
        price = _price;
    }
    
    function latestRoundData()
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            1,
            price,
            block.timestamp - 300,
            block.timestamp,
            1
        );
    }
    
    function getRoundData(uint80 _roundId)
        external
        view
        override
        returns (
            uint80 roundId,
            int256 answer,
            uint256 startedAt,
            uint256 updatedAt,
            uint80 answeredInRound
        )
    {
        return (
            _roundId,
            price,
            block.timestamp - 300,
            block.timestamp,
            _roundId
        );
    }
    
    function decimals() external view override returns (uint8) {
        return _decimals;
    }
    
    function description() external view override returns (string memory) {
        return _description;
    }
    
    function version() external pure override returns (uint256) {
        return 1;
    }
}

