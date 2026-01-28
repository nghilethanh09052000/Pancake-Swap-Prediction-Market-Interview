# Smart Contract Flow - Detailed Documentation

## Table of Contents
1. [Architecture Overview](#architecture-overview)
2. [Round Lifecycle](#round-lifecycle)
3. [Betting Mechanism](#betting-mechanism)
4. [Oracle Integration](#oracle-integration)
5. [Payout System](#payout-system)
6. [State Transitions](#state-transitions)
7. [Security Features](#security-features)

---

## Architecture Overview

### Contract Structure

```
PredictionMarket.sol
├── Round Management
│   ├── Round creation
│   ├── Round locking
│   └── Round closing
├── Betting System
│   ├── Place bets (Bull/Bear)
│   ├── Track bet amounts
│   └── Prevent double betting
├── Oracle Integration
│   ├── Fetch lock price
│   ├── Fetch close price
│   └── Handle oracle failures
└── Payout System
    ├── Calculate winnings
    ├── Distribute payouts
    └── Collect fees
```

---

## Round Lifecycle

### Phase 1: Open (Betting Phase)

**Duration:** 0-5 minutes from round start

**State:** `RoundStatus.Open`

**What Happens:**
1. Round is created with `startTimestamp = block.timestamp`
2. `lockTimestamp = startTimestamp + 300 seconds`
3. Users can place bets via `bet(Position)` function
4. Bets accumulate in either `totalBullAmount` or `totalBearAmount`

**Code Flow:**
```solidity
bet(Position position) {
    require(block.timestamp < round.lockTimestamp);
    require(round.status == RoundStatus.Open);
    require(!hasBet[roundId][user]);
    
    // Record bet
    userBets[user][roundId] = Bet(...);
    
    // Update totals
    if (position == Bull) {
        round.totalBullAmount += msg.value;
    } else {
        round.totalBearAmount += msg.value;
    }
}
```

**Events:**
- `BetPlaced(user, roundId, position, amount)`

---

### Phase 2: Locked (Lock Phase)

**Duration:** Exactly at 5 minutes

**State:** `RoundStatus.Locked`

**What Happens:**
1. Betting stops (no new bets accepted)
2. Chainlink oracle is called to get current price
3. `lockPrice` is set to oracle price
4. New round is automatically created
5. Users can start betting on the new round

**Code Flow:**
```solidity
lockRound(uint256 roundId) {
    require(block.timestamp >= round.lockTimestamp);
    require(round.status == RoundStatus.Open);
    
    // Fetch price from oracle
    int256 price = _getLatestPrice();
    
    // Lock the round
    round.lockPrice = price;
    round.status = RoundStatus.Locked;
    
    // Start new round
    currentRound++;
    _createRound();
}
```

**Oracle Call:**
```solidity
_getLatestPrice() {
    (roundId, price, startedAt, timestamp, answeredInRound) 
        = priceOracle.latestRoundData();
    
    require(timestamp > 0);
    require(price > 0);
    
    return price;
}
```

**Events:**
- `RoundLocked(roundId, lockPrice)`
- `RoundCreated(newRoundId, startTimestamp)`

---

### Phase 3: Closed (Close Phase)

**Duration:** 5-10 minutes from round start

**State:** `RoundStatus.Closed`

**What Happens:**
1. Oracle is called again to get final price
2. `closePrice` is set
3. Winner is determined by comparing `closePrice` vs `lockPrice`
4. Users can claim their winnings

**Code Flow:**
```solidity
closeRound(uint256 roundId) {
    require(block.timestamp >= round.closeTimestamp);
    require(round.status == RoundStatus.Locked);
    require(!round.oracleCalled);
    
    // Fetch final price
    int256 price = _getLatestPrice();
    
    // Close the round
    round.closePrice = price;
    round.oracleCalled = true;
    round.status = RoundStatus.Closed;
    
    // Determine winner
    Position winner;
    if (closePrice > lockPrice) {
        winner = Position.Bull;
    } else if (closePrice < lockPrice) {
        winner = Position.Bear;
    } else {
        // Tie - handled in claim function
    }
}
```

**Winner Determination:**
```
if (closePrice > lockPrice) → Bull wins
if (closePrice < lockPrice) → Bear wins
if (closePrice == lockPrice) → Tie (house wins)
```

**Events:**
- `RoundClosed(roundId, closePrice, winner)`

---

## Betting Mechanism

### Bet Structure

```solidity
struct Bet {
    address user;           // User address
    uint256 roundId;        // Round ID
    Position position;      // Bull (0) or Bear (1)
    uint256 amount;         // Bet amount in BNB
    bool claimed;           // Whether winnings claimed
}
```

### Betting Rules

1. **Minimum Bet:** Must be > 0
2. **One Bet Per Round:** Users can only bet once per round
3. **Timing:** Must bet before `lockTimestamp`
4. **Position:** Must choose Bull (UP) or Bear (DOWN)

### Bet Flow Diagram

```
User sends BNB + bet(Position)
    │
    ├─ Validate round is open
    ├─ Validate user hasn't bet
    ├─ Record bet in userBets mapping
    ├─ Update round totals
    └─ Emit BetPlaced event
```

---

## Oracle Integration

### Chainlink Price Feed

**Contract Interface:** `AggregatorV3Interface`

**Mainnet Address (BNB/USD):** `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`

**Testnet Address (BNB/USD):** `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526`

### Price Fetching

```solidity
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
```

### Oracle Failures

**Handling:**
- If oracle returns invalid data, transaction reverts
- Emergency refund function available (treasury only)
- Users can be refunded if oracle fails

---

## Payout System

### Payout Calculation

**Formula:**
```
Total Pool = totalBullAmount + totalBearAmount
Winner Pool = (user bet Bull) ? totalBullAmount : totalBearAmount

Payout = (Total Pool × User Bet Amount) / Winner Pool
Fee = Payout × 3% / 100%
User Receives = Payout - Fee
```

### Example Scenarios

#### Scenario 1: Simple Win
- **Total Pool:** 10 BNB
- **Bull Pool:** 6 BNB
- **Bear Pool:** 4 BNB
- **User Bet:** 2 BNB on Bull
- **Result:** Bull wins

**Calculation:**
```
Payout = (10 × 2) / 6 = 3.333 BNB
Fee = 3.333 × 0.03 = 0.1 BNB
User Receives = 3.233 BNB
Profit = 1.233 BNB
```

#### Scenario 2: Uneven Pools
- **Total Pool:** 20 BNB
- **Bull Pool:** 18 BNB
- **Bear Pool:** 2 BNB
- **User Bet:** 1 BNB on Bear
- **Result:** Bear wins

**Calculation:**
```
Payout = (20 × 1) / 2 = 10 BNB
Fee = 10 × 0.03 = 0.3 BNB
User Receives = 9.7 BNB
Profit = 8.7 BNB
```

#### Scenario 3: Tie
- **Total Pool:** 10 BNB
- **Result:** Tie (lockPrice == closePrice)

**Outcome:**
- No winners
- All bets go to treasury
- Users cannot claim

### Claim Flow

```solidity
claim(uint256 roundId) {
    // Validations
    require(round.oracleCalled);
    require(userBet.amount > 0);
    require(!userBet.claimed);
    
    // Check tie
    if (lockPrice == closePrice) {
        userBet.claimed = true;
        return; // No payout
    }
    
    // Determine winner
    Position winner = (closePrice > lockPrice) ? Bull : Bear;
    require(userBet.position == winner);
    
    // Calculate payout
    uint256 totalAmount = totalBullAmount + totalBearAmount;
    uint256 winnerPool = (userBet.position == Bull) 
        ? totalBullAmount 
        : totalBearAmount;
    
    uint256 payout = (totalAmount * userBet.amount) / winnerPool;
    uint256 fee = (payout * TREASURY_FEE) / BASIS_POINTS;
    uint256 userPayout = payout - fee;
    
    // Transfer fee to treasury
    treasury.call{value: fee}();
    
    // Transfer to user
    user.call{value: userPayout}();
    
    userBet.claimed = true;
}
```

---

## State Transitions

### Round State Machine

```
┌─────────┐
│  Open   │ ← Round created
└────┬────┘
     │ lockRound()
     │ (time >= lockTimestamp)
     ▼
┌─────────┐
│ Locked  │ ← Lock price fetched
└────┬────┘
     │ closeRound()
     │ (time >= closeTimestamp)
     ▼
┌─────────┐
│ Closed  │ ← Close price fetched, winners determined
└─────────┘
```

### Bet State Machine

```
┌──────────┐
│  None    │ ← User hasn't bet
└────┬─────┘
     │ bet()
     ▼
┌──────────┐
│  Placed  │ ← Bet recorded
└────┬─────┘
     │ claim()
     ▼
┌──────────┐
│ Claimed  │ ← Winnings claimed
└──────────┘
```

---

## Security Features

### 1. Reentrancy Protection
- Uses checks-effects-interactions pattern
- State updated before external calls

### 2. Access Control
- Treasury functions protected by `onlyTreasury` modifier
- Users can only claim their own bets

### 3. Input Validation
- Oracle price validation (must be > 0)
- Round existence checks
- Bet amount validation

### 4. Overflow Protection
- Solidity 0.8.20 built-in overflow checks
- Safe math operations

### 5. Oracle Security
- Chainlink's proven oracle infrastructure
- Timestamp validation
- Price validation

### 6. Double Betting Prevention
- `hasBet` mapping prevents multiple bets per round
- Checked before accepting new bets

---

## Gas Optimization

### Storage Optimization
- Packed structs where possible
- Use `uint256` for round IDs (no overflow risk)

### Function Optimization
- View functions for calculations
- Batch operations where possible

### Event Optimization
- Emit only essential data
- Indexed parameters for filtering

---

## Testing Scenarios

### Happy Path
1. ✅ User places Bull bet
2. ✅ Round locks with price
3. ✅ Round closes with higher price
4. ✅ User claims winnings

### Edge Cases
1. ✅ Tie scenario (lockPrice == closePrice)
2. ✅ Oracle failure handling
3. ✅ Double betting prevention
4. ✅ Claiming losing bets
5. ✅ Claiming before round closes

### Stress Tests
1. ✅ Multiple users betting
2. ✅ Uneven pool distribution
3. ✅ Large bet amounts
4. ✅ Rapid round transitions

---

## Deployment Checklist

- [ ] Deploy MockOracle (testing) or use Chainlink (production)
- [ ] Deploy PredictionMarket with oracle address
- [ ] Set treasury address
- [ ] Verify contract on BSCScan
- [ ] Test betting functionality
- [ ] Test round locking
- [ ] Test round closing
- [ ] Test claim functionality
- [ ] Monitor gas usage
- [ ] Set up monitoring/alerts

---

## References

- [PancakeSwap Prediction Docs](https://docs.pancakeswap.finance/products/prediction/prediction-faq)
- [Chainlink Price Feeds](https://docs.chain.link/docs/bnb-chain-addresses/)
- [PancakeSwap Prediction Contract](https://github.com/pancakeswap/pancake-smart-contracts/blob/master/projects/predictions/v3/contracts/PancakePredictionV3.sol)

