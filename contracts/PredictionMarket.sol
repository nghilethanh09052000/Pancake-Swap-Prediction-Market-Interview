// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title PredictionMarket
 * @dev PancakeSwap-style prediction market for BNB price movements
 * @notice Users bet on whether BNB price will go UP (Bull) or DOWN (Bear) in 5-minute rounds
 */
contract PredictionMarket {
    // Round duration: 5 minutes (300 seconds)
    uint256 public constant ROUND_DURATION = 300;
    
    // Treasury fee: 3% (30 basis points out of 1000)
    uint256 public constant TREASURY_FEE = 30;
    uint256 public constant BASIS_POINTS = 1000;
    
    // Oracle interface for price feeds
    AggregatorV3Interface public priceOracle;
    
    // Treasury address to receive fees
    address public treasury;
    
    // Current round number
    uint256 public currentRound;
    
    // Round structure
    struct Round {
        uint256 roundId;
        uint256 startTimestamp;
        uint256 lockTimestamp;
        uint256 closeTimestamp;
        int256 lockPrice;      // Price at lock phase
        int256 closePrice;     // Price at close phase
        uint256 totalBullAmount;
        uint256 totalBearAmount;
        bool oracleCalled;
        RoundStatus status;
    }
    
    enum RoundStatus {
        Open,      // Betting phase (0-5 min)
        Locked,    // Lock phase (5 min)
        Closed     // Close phase (5-10 min)
    }
    
    // User bet structure
    struct Bet {
        address user;
        uint256 roundId;
        Position position;  // Bull or Bear
        uint256 amount;
        bool claimed;
    }
    
    enum Position {
        Bull,  // Price will go UP
        Bear   // Price will go DOWN
    }
    
    // Mapping: roundId => Round
    mapping(uint256 => Round) public rounds;
    
    // Mapping: user => roundId => Bet
    mapping(address => mapping(uint256 => Bet)) public userBets;
    
    // Mapping: roundId => user => bool (to track if user has bet in this round)
    mapping(uint256 => mapping(address => bool)) public hasBet;
    
    // Events
    event RoundCreated(uint256 indexed roundId, uint256 startTimestamp);
    event BetPlaced(
        address indexed user,
        uint256 indexed roundId,
        Position position,
        uint256 amount
    );
    event RoundLocked(uint256 indexed roundId, int256 lockPrice);
    event RoundClosed(uint256 indexed roundId, int256 closePrice, Position winner);
    event BetClaimed(
        address indexed user,
        uint256 indexed roundId,
        uint256 amount
    );
    
    // Modifiers
    modifier onlyTreasury() {
        require(msg.sender == treasury, "Only treasury");
        _;
    }
    
    modifier validRound(uint256 roundId) {
        require(rounds[roundId].roundId != 0, "Round does not exist");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _priceOracle Chainlink price feed address for BNB/USD
     * @param _treasury Treasury address to receive fees
     */
    constructor(address _priceOracle, address _treasury) {
        require(_priceOracle != address(0), "Invalid oracle address");
        require(_treasury != address(0), "Invalid treasury address");
        
        priceOracle = AggregatorV3Interface(_priceOracle);
        treasury = _treasury;
        currentRound = 1;
        
        // Initialize first round
        _createRound();
    }
    
    /**
     * @dev Create a new round
     */
    function _createRound() internal {
        uint256 startTimestamp = block.timestamp;
        uint256 lockTimestamp = startTimestamp + ROUND_DURATION;
        uint256 closeTimestamp = lockTimestamp + ROUND_DURATION;
        
        rounds[currentRound] = Round({
            roundId: currentRound,
            startTimestamp: startTimestamp,
            lockTimestamp: lockTimestamp,
            closeTimestamp: closeTimestamp,
            lockPrice: 0,
            closePrice: 0,
            totalBullAmount: 0,
            totalBearAmount: 0,
            oracleCalled: false,
            status: RoundStatus.Open
        });
        
        emit RoundCreated(currentRound, startTimestamp);
    }
    
    /**
     * @dev Get current round information
     */
    function getCurrentRound() external view returns (Round memory) {
        return rounds[currentRound];
    }
    
    /**
     * @dev Get round information by ID
     */
    function getRound(uint256 roundId) external view returns (Round memory) {
        return rounds[roundId];
    }
    
    /**
     * @dev Get user's bet for a specific round
     */
    function getUserBet(address user, uint256 roundId) external view returns (Bet memory) {
        return userBets[user][roundId];
    }
    
    /**
     * @dev Place a bet on current round
     * @param position Bull (UP) or Bear (DOWN)
     */
    function bet(Position position) external payable {
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        Round storage round = rounds[currentRound];
        
        // Check if round is still open for betting
        require(block.timestamp < round.lockTimestamp, "Round is locked");
        require(round.status == RoundStatus.Open, "Round not open");
        
        // Check if user already bet in this round
        require(!hasBet[currentRound][msg.sender], "Already bet in this round");
        
        // Record the bet
        userBets[msg.sender][currentRound] = Bet({
            user: msg.sender,
            roundId: currentRound,
            position: position,
            amount: msg.value,
            claimed: false
        });
        
        hasBet[currentRound][msg.sender] = true;
        
        // Update round totals
        if (position == Position.Bull) {
            round.totalBullAmount += msg.value;
        } else {
            round.totalBearAmount += msg.value;
        }
        
        emit BetPlaced(msg.sender, currentRound, position, msg.value);
        
        // Check if we need to lock the round
        if (block.timestamp >= round.lockTimestamp) {
            lockRound(currentRound);
        }
    }
    
    /**
     * @dev Lock the round and fetch lock price from oracle
     * @param roundId Round ID to lock
     */
    function lockRound(uint256 roundId) public validRound(roundId) {
        Round storage round = rounds[roundId];
        
        require(block.timestamp >= round.lockTimestamp, "Too early to lock");
        require(round.status == RoundStatus.Open, "Round already locked");
        
        // Fetch price from Chainlink oracle
        int256 price = _getLatestPrice();
        require(price > 0, "Invalid price from oracle");
        
        round.lockPrice = price;
        round.status = RoundStatus.Locked;
        
        emit RoundLocked(roundId, price);
        
        // Move to next round
        currentRound++;
        _createRound();
    }
    
    /**
     * @dev Close the round and determine winners
     * @param roundId Round ID to close
     */
    function closeRound(uint256 roundId) external validRound(roundId) {
        Round storage round = rounds[roundId];
        
        require(block.timestamp >= round.closeTimestamp, "Too early to close");
        require(round.status == RoundStatus.Locked, "Round must be locked first");
        require(!round.oracleCalled, "Round already closed");
        
        // Fetch close price from oracle
        int256 price = _getLatestPrice();
        require(price > 0, "Invalid price from oracle");
        
        round.closePrice = price;
        round.oracleCalled = true;
        round.status = RoundStatus.Closed;
        
        // Determine winner
        Position winner;
        if (round.closePrice > round.lockPrice) {
            winner = Position.Bull;
        } else if (round.closePrice < round.lockPrice) {
            winner = Position.Bear;
        } else {
            // Tie: house wins (no winner)
            winner = Position.Bull; // Placeholder, will be handled in claim
        }
        
        emit RoundClosed(roundId, price, winner);
    }
    
    /**
     * @dev Claim winnings from a closed round
     * @param roundId Round ID to claim from
     */
    function claim(uint256 roundId) external validRound(roundId) {
        Round storage round = rounds[roundId];
        Bet storage userBet = userBets[msg.sender][roundId];
        
        require(round.oracleCalled, "Round not closed");
        require(userBet.amount > 0, "No bet placed");
        require(!userBet.claimed, "Already claimed");
        
        // Check if it's a tie (lock price == close price)
        if (round.lockPrice == round.closePrice) {
            // House wins: users don't get refunded
            userBet.claimed = true;
            return;
        }
        
        // Determine winner position
        Position winner;
        if (round.closePrice > round.lockPrice) {
            winner = Position.Bull;
        } else {
            winner = Position.Bear;
        }
        
        // Check if user bet on winning position
        require(userBet.position == winner, "Not a winning bet");
        
        // Calculate payout
        uint256 totalAmount = round.totalBullAmount + round.totalBearAmount;
        uint256 winnerPool = (userBet.position == Position.Bull) 
            ? round.totalBullAmount 
            : round.totalBearAmount;
        
        require(winnerPool > 0, "No winners in this round");
        
        // Calculate user's share (proportional to their bet)
        uint256 payout = (totalAmount * userBet.amount) / winnerPool;
        
        // Apply treasury fee (3%)
        uint256 fee = (payout * TREASURY_FEE) / BASIS_POINTS;
        uint256 userPayout = payout - fee;
        
        // Transfer fee to treasury
        if (fee > 0) {
            (bool feeSuccess, ) = treasury.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        // Mark as claimed
        userBet.claimed = true;
        
        // Transfer winnings to user
        (bool success, ) = msg.sender.call{value: userPayout}("");
        require(success, "Transfer failed");
        
        emit BetClaimed(msg.sender, roundId, userPayout);
    }
    
    /**
     * @dev Get latest price from Chainlink oracle
     * @return price Current price from oracle
     */
    function _getLatestPrice() internal view returns (int256) {
        (
            uint80 roundID,
            int256 price,
            uint256 startedAt,
            uint256 timeStamp,
            uint80 answeredInRound
        ) = priceOracle.latestRoundData();
        
        require(timeStamp > 0, "Round not complete");
        require(price > 0, "Invalid price");
        
        return price;
    }
    
    /**
     * @dev Get current price (public view function)
     */
    function getCurrentPrice() external view returns (int256) {
        return _getLatestPrice();
    }
    
    /**
     * @dev Calculate potential payout for a bet
     * @param roundId Round ID
     * @param position Bull or Bear
     * @param amount Bet amount
     * @return payout Potential payout amount
     */
    function calculatePayout(
        uint256 roundId,
        Position position,
        uint256 amount
    ) external view validRound(roundId) returns (uint256) {
        Round memory round = rounds[roundId];
        
        uint256 totalAmount = round.totalBullAmount + round.totalBearAmount;
        uint256 positionPool = (position == Position.Bull) 
            ? round.totalBullAmount 
            : round.totalBearAmount;
        
        if (positionPool == 0) {
            return 0;
        }
        
        uint256 payout = (totalAmount * amount) / positionPool;
        uint256 fee = (payout * TREASURY_FEE) / BASIS_POINTS;
        
        return payout - fee;
    }
    
    /**
     * @dev Update treasury address (only treasury)
     */
    function setTreasury(address _treasury) external onlyTreasury {
        require(_treasury != address(0), "Invalid address");
        treasury = _treasury;
    }
    
    /**
     * @dev Emergency function to refund users if oracle fails
     * @param roundId Round ID to refund
     */
    function emergencyRefund(uint256 roundId) external onlyTreasury validRound(roundId) {
        Round storage round = rounds[roundId];
        require(round.status == RoundStatus.Locked || round.status == RoundStatus.Open, "Cannot refund");
        
        // This would require tracking all bettors, simplified here
        // In production, you'd want to iterate through all bets
        round.status = RoundStatus.Closed;
    }
}

