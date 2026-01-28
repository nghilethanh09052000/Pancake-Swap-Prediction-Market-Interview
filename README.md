# Prediction Market - PancakeSwap Style

A decentralized prediction market on BNB Chain where users can bet on BNB price movements in 5-minute rounds.

## Overview

This project implements a PancakeSwap-style prediction market where users bet on whether the BNB price will go **UP (Bull)** or **DOWN (Bear)** within a 5-minute timeframe.

## Smart Contract Flow

### 1. Round Structure (5-Minute Cycles)

Each prediction round operates in **three phases**:

```
┌─────────────────────────────────────────────────────────┐
│                    ROUND TIMELINE                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Phase 1: BETTING (0-5 min)                            │
│  ────────────────────────────                           │
│  • Users place Bull (UP) or Bear (DOWN) bets            │
│  • Bets accumulate in Bull pool or Bear pool           │
│  • Round status: Open                                   │
│                                                         │
│  Phase 2: LOCK (5 min)                                  │
│  ────────────────────────────                           │
│  • Betting stops                                        │
│  • Chainlink oracle fetches lock price                 │
│  • Round status: Locked                                │
│  • New round automatically starts                       │
│                                                         │
│  Phase 3: CLOSE (5-10 min)                              │
│  ────────────────────────────                           │
│  • Final close price fetched from oracle               │
│  • Winners determined:                                 │
│    - If closePrice > lockPrice → Bull wins            │
│    - If closePrice < lockPrice → Bear wins            │
│    - If closePrice == lockPrice → Tie (house wins)    │
│  • Round status: Closed                                │
│  • Users can claim winnings                            │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

### 2. Betting Flow

```solidity
User → bet(Position) → Contract
  ├─ Check: Round is open
  ├─ Check: User hasn't bet yet
  ├─ Record bet in userBets mapping
  ├─ Update round.totalBullAmount or round.totalBearAmount
  └─ Emit BetPlaced event
```

**Example:**
- User bets 1 BNB on Bull
- `round.totalBullAmount += 1 BNB`
- User cannot bet again in same round

### 3. Lock Phase Flow

```solidity
Time >= lockTimestamp → lockRound(roundId)
  ├─ Fetch price from Chainlink oracle
  ├─ Set round.lockPrice = oracle price
  ├─ Set round.status = Locked
  ├─ currentRound++ (start new round)
  └─ Emit RoundLocked event
```

**Key Points:**
- Lock price is the reference point for determining winners
- New round starts immediately after lock
- Users can continue betting on new round

### 4. Close Phase Flow

```solidity
Time >= closeTimestamp → closeRound(roundId)
  ├─ Fetch price from Chainlink oracle
  ├─ Set round.closePrice = oracle price
  ├─ Determine winner:
  │   ├─ closePrice > lockPrice → Bull wins
  │   ├─ closePrice < lockPrice → Bear wins
  │   └─ closePrice == lockPrice → Tie (house wins)
  ├─ Set round.status = Closed
  └─ Emit RoundClosed event
```

### 5. Claim Flow

```solidity
User → claim(roundId)
  ├─ Check: Round is closed
  ├─ Check: User placed a bet
  ├─ Check: User hasn't claimed yet
  ├─ Check: User bet on winning position
  ├─ Calculate payout:
  │   payout = (totalPool * userBet) / winnerPool
  │   fee = payout * 3% / 100%
  │   userPayout = payout - fee
  ├─ Transfer fee to treasury
  ├─ Transfer userPayout to user
  ├─ Mark bet as claimed
  └─ Emit BetClaimed event
```

**Payout Formula:**
```
Total Pool = totalBullAmount + totalBearAmount
Winner Pool = (user bet on Bull) ? totalBullAmount : totalBearAmount

Payout = (Total Pool × User Bet Amount) / Winner Pool
Fee = Payout × 3% / 100%
User Receives = Payout - Fee
```

**Example:**
- Total Pool: 10 BNB (Bull: 6 BNB, Bear: 4 BNB)
- User bet: 2 BNB on Bull
- Bull wins
- Payout = (10 × 2) / 6 = 3.333 BNB
- Fee = 3.333 × 3% = 0.1 BNB
- User receives = 3.233 BNB

### 6. Edge Cases

**Tie Scenario:**
- If `lockPrice == closePrice`, it's a tie
- House wins: all bets go to treasury
- Users cannot claim

**Oracle Failure:**
- Emergency refund function available (treasury only)
- All users get refunded

## Contract Architecture

### Main Contract: `PredictionMarket.sol`

**Key State Variables:**
- `currentRound`: Current active round number
- `rounds[roundId]`: Round data mapping
- `userBets[user][roundId]`: User bet data mapping
- `priceOracle`: Chainlink AggregatorV3Interface

**Key Functions:**
- `bet(Position)`: Place a bet
- `lockRound(uint256)`: Lock round and fetch lock price
- `closeRound(uint256)`: Close round and determine winners
- `claim(uint256)`: Claim winnings
- `calculatePayout(...)`: View function to calculate potential payout

### Supporting Contract: `MockPriceOracle.sol`

- Mock Chainlink oracle for testing
- Allows setting prices manually
- Implements `AggregatorV3Interface`

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Compile Contracts

```bash
npm run compile
```

### 3. Run Tests

```bash
npm run test
```

### 4. Deploy Contracts

**Local Network:**
```bash
npx hardhat node
# In another terminal:
npm run deploy
```

**BSC Testnet:**
```bash
# Update hardhat.config.js with your private key
npx hardhat run scripts/deploy.js --network bscTestnet
```

**BSC Mainnet:**
```bash
# Update hardhat.config.js with your private key
# Use real Chainlink oracle: 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE
npx hardhat run scripts/deploy.js --network bsc
```

## Chainlink Oracle Addresses

### BSC Mainnet
- **BNB/USD**: `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`

### BSC Testnet
- **BNB/USD**: `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526`

## Key Features

✅ **5-minute round cycles** - Fast-paced betting  
✅ **Chainlink oracle integration** - Reliable price feeds  
✅ **Proportional payouts** - Winners share the pool  
✅ **3% treasury fee** - Sustainable revenue model  
✅ **Tie handling** - House wins on ties  
✅ **Emergency refunds** - Oracle failure protection  

## Security Considerations

- Uses Chainlink's proven oracle infrastructure
- Prevents double betting in same round
- Validates oracle responses
- Reentrancy protection (using checks-effects-interactions)
- Access control for treasury functions

## Future Enhancements

- [ ] Frontend interface
- [ ] Round history tracking
- [ ] Leaderboard system
- [ ] Multiple token support (ETH, BTC, etc.)
- [ ] Staking mechanism
- [ ] Referral system

## License

MIT

