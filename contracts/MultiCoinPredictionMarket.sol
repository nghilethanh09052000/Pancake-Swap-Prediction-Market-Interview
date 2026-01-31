// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";

/**
 * @title MultiCoinPredictionMarket
 * @dev PancakeSwap-style prediction market supporting BTC, ETH, and BNB
 * @notice Users bet on whether crypto prices will go UP (Bull) or DOWN (Bear) in 5-minute rounds
 */
contract MultiCoinPredictionMarket {
    // Round duration: 5 minutes (300 seconds) - betting period
    uint256 public constant ROUND_DURATION = 300;
    
    // Close delay: 60 seconds after lock for oracle call
    uint256 public constant CLOSE_DELAY = 60;
    
    // Treasury fee: 3% (30 basis points out of 1000)
    uint256 public constant TREASURY_FEE = 30;
    uint256 public constant BASIS_POINTS = 1000;
    
    // Coin enum
    enum Coin {
        BTC,
        ETH,
        BNB
    }
    
    // Oracle mapping: Coin => Oracle address
    mapping(Coin => AggregatorV3Interface) public priceOracles;
    
    // Treasury address to receive fees
    address public treasury;
    
    // Current round number per coin
    mapping(Coin => uint256) public currentRound;
    
    // Round structure
    struct Round {
        uint256 roundId;
        Coin coin;
        uint256 startTimestamp;
        uint256 lockTimestamp;
        uint256 closeTimestamp;
        int256 lockPrice;
        int256 closePrice;
        uint256 totalBullAmount;
        uint256 totalBearAmount;
        bool oracleCalled;
        RoundStatus status;
    }
    
    enum RoundStatus {
        Open,
        Locked,
        Closed
    }
    
    // User bet structure
    struct Bet {
        address user;
        uint256 roundId;
        Coin coin;
        Position position;
        uint256 amount;
        bool claimed;
    }
    
    enum Position {
        Bull,
        Bear
    }
    
    // Mapping: Coin => roundId => Round
    mapping(Coin => mapping(uint256 => Round)) public rounds;
    
    // Mapping: Coin => roundId => user => Bet
    mapping(Coin => mapping(uint256 => mapping(address => Bet))) public userBets;
    
    // Mapping: Coin => roundId => user => bool
    mapping(Coin => mapping(uint256 => mapping(address => bool))) public hasBet;
    
    // Events
    event RoundCreated(Coin indexed coin, uint256 indexed roundId, uint256 startTimestamp);
    event BetPlaced(
        address indexed user,
        Coin indexed coin,
        uint256 indexed roundId,
        Position position,
        uint256 amount
    );
    event RoundLocked(Coin indexed coin, uint256 indexed roundId, int256 lockPrice);
    event RoundClosed(Coin indexed coin, uint256 indexed roundId, int256 closePrice, Position winner);
    event BetClaimed(
        address indexed user,
        Coin indexed coin,
        uint256 indexed roundId,
        uint256 amount
    );
    
    modifier onlyTreasury() {
        require(msg.sender == treasury, "Only treasury");
        _;
    }
    
    modifier validRound(Coin coin, uint256 roundId) {
        require(rounds[coin][roundId].roundId != 0, "Round does not exist");
        _;
    }
    
    /**
     * @dev Constructor
     * @param _btcOracle BTC/USD price feed address
     * @param _ethOracle ETH/USD price feed address
     * @param _bnbOracle BNB/USD price feed address
     * @param _treasury Treasury address
     */
    constructor(
        address _btcOracle,
        address _ethOracle,
        address _bnbOracle,
        address _treasury
    ) {
        require(_btcOracle != address(0), "Invalid BTC oracle");
        require(_ethOracle != address(0), "Invalid ETH oracle");
        require(_bnbOracle != address(0), "Invalid BNB oracle");
        require(_treasury != address(0), "Invalid treasury");
        
        priceOracles[Coin.BTC] = AggregatorV3Interface(_btcOracle);
        priceOracles[Coin.ETH] = AggregatorV3Interface(_ethOracle);
        priceOracles[Coin.BNB] = AggregatorV3Interface(_bnbOracle);
        
        treasury = _treasury;
        
        // Initialize first round for each coin
        currentRound[Coin.BTC] = 1;
        currentRound[Coin.ETH] = 1;
        currentRound[Coin.BNB] = 1;
        
        _createRound(Coin.BTC);
        _createRound(Coin.ETH);
        _createRound(Coin.BNB);
    }
    
    /**
     * @dev Create a new round for a coin
     */
    function _createRound(Coin coin) internal {
        uint256 roundId = currentRound[coin];
        uint256 startTimestamp = block.timestamp;
        uint256 lockTimestamp = startTimestamp + ROUND_DURATION; // 5 minutes for betting
        uint256 closeTimestamp = lockTimestamp + CLOSE_DELAY; // 60 seconds after lock to close
        
        rounds[coin][roundId] = Round({
            roundId: roundId,
            coin: coin,
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
        
        emit RoundCreated(coin, roundId, startTimestamp);
    }
    
    /**
     * @dev Get current round for a coin
     */
    function getCurrentRound(Coin coin) external view returns (Round memory) {
        return rounds[coin][currentRound[coin]];
    }
    
    /**
     * @dev Get round by ID
     */
    function getRound(Coin coin, uint256 roundId) external view returns (Round memory) {
        return rounds[coin][roundId];
    }
    
    /**
     * @dev Get user's bet
     */
    function getUserBet(Coin coin, address user, uint256 roundId) external view returns (Bet memory) {
        return userBets[coin][roundId][user];
    }
    
    /**
     * @dev Place a bet
     */
    function bet(Coin coin, Position position) external payable {
        require(msg.value > 0, "Bet amount must be greater than 0");
        
        uint256 roundId = currentRound[coin];
        Round storage round = rounds[coin][roundId];
        
        require(block.timestamp < round.lockTimestamp, "Round is locked");
        require(round.status == RoundStatus.Open, "Round not open");
        require(!hasBet[coin][roundId][msg.sender], "Already bet in this round");
        
        // Check if previous round needs to be closed
        if (roundId > 1) {
            Round storage previousRound = rounds[coin][roundId - 1];
            if (previousRound.status == RoundStatus.Locked && 
                block.timestamp >= previousRound.closeTimestamp && 
                !previousRound.oracleCalled) {
                _closeRound(coin, roundId - 1);
            }
        }
        
        userBets[coin][roundId][msg.sender] = Bet({
            user: msg.sender,
            roundId: roundId,
            coin: coin,
            position: position,
            amount: msg.value,
            claimed: false
        });
        
        hasBet[coin][roundId][msg.sender] = true;
        
        if (position == Position.Bull) {
            round.totalBullAmount += msg.value;
        } else {
            round.totalBearAmount += msg.value;
        }
        
        emit BetPlaced(msg.sender, coin, roundId, position, msg.value);
        
        // Auto-lock and start next round if time reached
        if (block.timestamp >= round.lockTimestamp) {
            lockRound(coin, roundId);
        }
    }
    
    /**
     * @dev Lock the round and start next round
     */
    function lockRound(Coin coin, uint256 roundId) public validRound(coin, roundId) {
        Round storage round = rounds[coin][roundId];
        
        require(block.timestamp >= round.lockTimestamp, "Too early to lock");
        require(round.status == RoundStatus.Open, "Round already locked");
        
        int256 price = _getLatestPrice(coin);
        require(price > 0, "Invalid price from oracle");
        
        round.lockPrice = price;
        round.status = RoundStatus.Locked;
        
        emit RoundLocked(coin, roundId, price);
        
        // Start next round immediately so users can bet while current round closes
        currentRound[coin]++;
        _createRound(coin);
        
        // If enough time has passed, also close the round
        if (block.timestamp >= round.closeTimestamp) {
            _closeRound(coin, roundId);
        }
    }
    
    /**
     * @dev Close the round (internal function)
     */
    function _closeRound(Coin coin, uint256 roundId) internal validRound(coin, roundId) {
        Round storage round = rounds[coin][roundId];
        
        require(block.timestamp >= round.closeTimestamp, "Too early to close");
        require(round.status == RoundStatus.Locked, "Round must be locked first");
        require(!round.oracleCalled, "Round already closed");
        
        int256 price = _getLatestPrice(coin);
        require(price > 0, "Invalid price from oracle");
        
        round.closePrice = price;
        round.oracleCalled = true;
        round.status = RoundStatus.Closed;
        
        Position winner;
        if (round.closePrice > round.lockPrice) {
            winner = Position.Bull;
        } else if (round.closePrice < round.lockPrice) {
            winner = Position.Bear;
        } else {
            winner = Position.Bull; // Placeholder for tie
        }
        
        emit RoundClosed(coin, roundId, price, winner);
    }
    
    /**
     * @dev Close the round (external function)
     */
    function closeRound(Coin coin, uint256 roundId) external validRound(coin, roundId) {
        _closeRound(coin, roundId);
    }
    
    /**
     * @dev Claim winnings
     */
    function claim(Coin coin, uint256 roundId) external validRound(coin, roundId) {
        Round storage round = rounds[coin][roundId];
        Bet storage userBet = userBets[coin][roundId][msg.sender];
        
        require(round.oracleCalled, "Round not closed");
        require(userBet.amount > 0, "No bet placed");
        require(!userBet.claimed, "Already claimed");
        
        if (round.lockPrice == round.closePrice) {
            userBet.claimed = true;
            return;
        }
        
        Position winner;
        if (round.closePrice > round.lockPrice) {
            winner = Position.Bull;
        } else {
            winner = Position.Bear;
        }
        
        require(userBet.position == winner, "Not a winning bet");
        
        uint256 totalAmount = round.totalBullAmount + round.totalBearAmount;
        uint256 winnerPool = (userBet.position == Position.Bull) 
            ? round.totalBullAmount 
            : round.totalBearAmount;
        
        require(winnerPool > 0, "No winners in this round");
        
        uint256 payout = (totalAmount * userBet.amount) / winnerPool;
        uint256 fee = (payout * TREASURY_FEE) / BASIS_POINTS;
        uint256 userPayout = payout - fee;
        
        if (fee > 0) {
            (bool feeSuccess, ) = treasury.call{value: fee}("");
            require(feeSuccess, "Fee transfer failed");
        }
        
        userBet.claimed = true;
        
        (bool success, ) = msg.sender.call{value: userPayout}("");
        require(success, "Transfer failed");
        
        emit BetClaimed(msg.sender, coin, roundId, userPayout);
    }
    
    /**
     * @dev Get latest price from oracle
     */
    function _getLatestPrice(Coin coin) internal view returns (int256) {
        AggregatorV3Interface oracle = priceOracles[coin];
        
        (
            ,
            int256 price,
            ,
            uint256 timeStamp,
            
        ) = oracle.latestRoundData();
        
        require(timeStamp > 0, "Round not complete");
        require(price > 0, "Invalid price");
        
        return price;
    }
    
    /**
     * @dev Get current price
     */
    function getCurrentPrice(Coin coin) external view returns (int256) {
        return _getLatestPrice(coin);
    }
    
    /**
     * @dev Calculate potential payout
     */
    function calculatePayout(
        Coin coin,
        uint256 roundId,
        Position position,
        uint256 amount
    ) external view validRound(coin, roundId) returns (uint256) {
        Round memory round = rounds[coin][roundId];
        
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
     * @dev Create next round if current is closed
     */
    function createNextRound(Coin coin) external {
        uint256 roundId = currentRound[coin];
        Round storage round = rounds[coin][roundId];
        
        require(round.status == RoundStatus.Closed, "Current round must be closed");
        require(rounds[coin][roundId + 1].roundId == 0, "Next round already exists");
        
        currentRound[coin]++;
        _createRound(coin);
    }
    
    /**
     * @dev Check if upkeep is needed
     */
    function checkUpkeep(bytes calldata) 
        external 
        view 
        returns (bool upkeepNeeded, bytes memory) 
    {
        for (uint256 i = 0; i < 3; i++) {
            Coin coin = Coin(i);
            uint256 roundId = currentRound[coin];
            Round storage round = rounds[coin][roundId];
            
            bool shouldLock = block.timestamp >= round.lockTimestamp && 
                              round.status == RoundStatus.Open;
            
            bool shouldClose = block.timestamp >= round.closeTimestamp && 
                               round.status == RoundStatus.Locked &&
                               !round.oracleCalled;
            
            bool shouldCreate = round.status == RoundStatus.Closed && 
                               rounds[coin][roundId + 1].roundId == 0;
            
            if (shouldLock || shouldClose || shouldCreate) {
                return (true, "");
            }
        }
        
        return (false, "");
    }
    
    /**
     * @dev Perform upkeep
     */
    function performUpkeep(bytes calldata) external {
        for (uint256 i = 0; i < 3; i++) {
            Coin coin = Coin(i);
            uint256 roundId = currentRound[coin];
            Round storage round = rounds[coin][roundId];
            
            // Lock if needed
            if (block.timestamp >= round.lockTimestamp && 
                round.status == RoundStatus.Open) {
                this.lockRound(coin, roundId);
                continue;
            }
            
            // Close if needed
            if (round.status == RoundStatus.Locked &&
                block.timestamp >= round.closeTimestamp &&
                !round.oracleCalled) {
                this.closeRound(coin, roundId);
                round = rounds[coin][roundId];
                if (round.status == RoundStatus.Closed && 
                    rounds[coin][roundId + 1].roundId == 0) {
                    currentRound[coin]++;
                    _createRound(coin);
                }
                continue;
            }
            
            // Create next round if needed
            if (round.status == RoundStatus.Closed && 
                rounds[coin][roundId + 1].roundId == 0) {
                currentRound[coin]++;
                _createRound(coin);
            }
        }
    }
}


