# Prediction Market - PancakeSwap Style

A full-stack decentralized prediction market application where users can bet on BTC, ETH, and BNB price movements in 5-minute rounds.

## Overview

This project implements a PancakeSwap-style prediction market with a complete web application stack:
- **Smart Contracts**: Multi-coin prediction market supporting BTC, ETH, and BNB
- **Frontend**: Modern Next.js application with wallet integration
- **Backend**: NestJS API for contract interactions and data aggregation

Users bet on whether crypto prices will go **UP (Bull)** or **DOWN (Bear)** within 5-minute timeframes.

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

## Project Architecture

### Smart Contracts

**Main Contract: `MultiCoinPredictionMarket.sol`**
- Multi-coin support (BTC, ETH, BNB)
- Separate rounds per coin
- Chainlink oracle integration per coin
- Key State Variables:
  - `currentRound[Coin]`: Current active round number per coin
  - `rounds[Coin][roundId]`: Round data mapping
  - `userBets[Coin][user][roundId]`: User bet data mapping
  - `priceOracles[Coin]`: Chainlink oracle per coin
- Key Functions:
  - `bet(Coin, Position)`: Place a bet on a specific coin
  - `lockRound(Coin, uint256)`: Lock round and fetch lock price
  - `closeRound(Coin, uint256)`: Close round and determine winners
  - `claim(Coin, uint256)`: Claim winnings
  - `calculatePayout(...)`: View function to calculate potential payout

**Legacy Contract: `PredictionMarket.sol`**
- Single-coin (BNB) version
- Still available for reference

**Supporting Contract: `MockPriceOracle.sol`**
- Mock Chainlink oracle for local testing
- Allows setting prices manually
- Implements `AggregatorV3Interface`

### Frontend (Next.js)

- **Framework**: Next.js 14 with TypeScript
- **Wallet Integration**: RainbowKit + Wagmi
- **Styling**: Tailwind CSS
- **Features**:
  - Multi-coin selector (BTC, ETH, BNB)
  - Real-time round information
  - Betting interface with Bull/Bear selection
  - User bet tracking and history
  - Claim winnings functionality
  - Responsive design

### Backend (NestJS)

- **Framework**: NestJS with TypeScript
- **Features**:
  - RESTful API endpoints
  - Contract interaction service
  - Price fetching from oracles
  - Round data aggregation
  - User bet queries
  - Payout calculations

## Quick Start

For a complete setup guide, see **[QUICK_START.md](./QUICK_START.md)** or **[WEB_SETUP.md](./WEB_SETUP.md)**.

### Quick Setup (5 minutes)

1. **Start Hardhat Node:**
   ```bash
   npm run node
   ```

2. **Deploy Multi-Coin Contract:**
   ```bash
   npm run deploy:multi
   ```
   Copy the contract address from output.

3. **Setup Backend:**
   ```bash
   cd backend
   npm install
   # Create .env with CONTRACT_ADDRESS from step 2
   npm run start:dev
   ```

4. **Setup Frontend:**
   ```bash
   cd frontend
   npm install
   # Create .env.local with NEXT_PUBLIC_CONTRACT_ADDRESS from step 2
   npm run dev
   ```

5. **Open Browser:**
   Navigate to `http://localhost:3000` and connect your wallet.

## Setup Instructions

### 1. Install Root Dependencies

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

**Local Network (Multi-Coin):**
```bash
npm run node
# In another terminal:
npm run deploy:multi
```

**Local Network (Single-Coin BNB):**
```bash
npm run node
# In another terminal:
npm run deploy
```

**BSC Testnet:**
```bash
# Update hardhat.config.js with your private key
npx hardhat run scripts/deploy-multi-coin.js --network bscTestnet
```

**BSC Mainnet:**
```bash
# Update hardhat.config.js with your private key
# Use real Chainlink oracles (see Chainlink Oracle Addresses section)
npx hardhat run scripts/deploy-multi-coin.js --network bsc
```

### 5. Extract Contract ABI (for frontend)

```bash
npm run extract-abi
```

This updates the frontend with the latest contract ABI.

## Chainlink Oracle Addresses

### BSC Mainnet
- **BNB/USD**: `0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE`
- **BTC/USD**: `0x264990fbd0A4796A3E3d8E37C4d5F87a3ALE5F0`
- **ETH/USD**: `0x9ef1B8c0E4F7dc8bF5719Ea496883DC6401d5b2e`

### BSC Testnet
- **BNB/USD**: `0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526`
- **BTC/USD**: `0x5741306c21795FdCBb9b265Ea0255F499DFe515C`
- **ETH/USD**: `0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7`

## Key Features

### Smart Contracts
✅ **Multi-coin support** - Bet on BTC, ETH, and BNB  
✅ **5-minute round cycles** - Fast-paced betting  
✅ **Chainlink oracle integration** - Reliable price feeds per coin  
✅ **Proportional payouts** - Winners share the pool  
✅ **3% treasury fee** - Sustainable revenue model  
✅ **Tie handling** - House wins on ties  
✅ **Emergency refunds** - Oracle failure protection

### Frontend
✅ **Modern UI** - Beautiful, responsive design similar to PancakeSwap  
✅ **Wallet integration** - Connect with MetaMask or any Web3 wallet  
✅ **Real-time updates** - Live round information and countdowns  
✅ **Multi-coin selector** - Switch between BTC, ETH, and BNB  
✅ **Betting interface** - Easy Bull/Bear selection  
✅ **User dashboard** - Track your bets and winnings

### Backend
✅ **RESTful API** - Clean API endpoints for contract data  
✅ **Round aggregation** - Efficient round data queries  
✅ **Price fetching** - Oracle price retrieval  
✅ **Payout calculations** - Real-time payout estimates  

## Security Considerations

- Uses Chainlink's proven oracle infrastructure
- Prevents double betting in same round
- Validates oracle responses
- Reentrancy protection (using checks-effects-interactions)
- Access control for treasury functions

## API Endpoints

The backend provides the following endpoints (default: `http://localhost:3001`):

- `GET /api/prediction/round/:coin` - Get current round (BTC/ETH/BNB)
- `GET /api/prediction/round/:coin/:roundId` - Get specific round
- `GET /api/prediction/price/:coin` - Get current price
- `GET /api/prediction/user-bet/:coin/:address/:roundId` - Get user bet
- `GET /api/prediction/payout/:coin/:roundId?position=bull&amount=0.1` - Calculate payout

## Development

### Running All Services

**Terminal 1 - Hardhat Node:**
```bash
npm run node
```

**Terminal 2 - Backend:**
```bash
cd backend && npm run start:dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend && npm run dev
```

**Terminal 4 - Automation (Optional):**
```bash
npm run automate
```

## Documentation

- **[QUICK_START.md](./QUICK_START.md)** - Quick 5-minute setup guide
- **[WEB_SETUP.md](./WEB_SETUP.md)** - Detailed web application setup
- **[README_WEB.md](./README_WEB.md)** - Full-stack application overview
- **[SMART_CONTRACT_FLOW.md](./SMART_CONTRACT_FLOW.md)** - Detailed contract flow documentation
- **[scripts/AUTOMATION_README.md](./scripts/AUTOMATION_README.md)** - Round automation guide

## Future Enhancements

- [ ] Round history tracking UI
- [ ] Leaderboard system
- [ ] Staking mechanism
- [ ] Referral system
- [ ] Mobile app
- [ ] Advanced analytics and charts
- [ ] Social features (sharing bets, following users)

## Project Structure

```
INTERVIEW-Blockchain/
├── contracts/                    # Smart contracts
│   ├── MultiCoinPredictionMarket.sol  # Main multi-coin contract
│   ├── PredictionMarket.sol           # Legacy single-coin contract
│   └── MockPriceOracle.sol            # Mock oracle for testing
├── frontend/                     # Next.js frontend application
│   ├── app/                      # Next.js 14 app directory
│   ├── components/               # React components
│   └── config/                   # Contract configuration
├── backend/                      # NestJS backend API
│   └── src/
│       ├── prediction/           # Prediction module
│       └── main.ts               # Entry point
├── scripts/                      # Deployment and utility scripts
│   ├── deploy-multi-coin.js     # Multi-coin deployment
│   ├── deploy.js                # Single-coin deployment
│   ├── extract-abi.js           # ABI extraction
│   └── automate-rounds.js       # Round automation
└── test/                         # Contract tests
```

## License

MIT

## Credits

Inspired by PancakeSwap Prediction Market

