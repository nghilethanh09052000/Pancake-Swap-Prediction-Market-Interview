# Prediction Market - Full Stack Web Application

A complete PancakeSwap-style prediction market with Next.js frontend and NestJS backend, supporting BTC, ETH, and BNB.

## 🎯 Features

- ✅ **Multi-Coin Support**: Bet on BTC, ETH, or BNB price movements
- ✅ **Real-time Updates**: Live round information and price feeds
- ✅ **Modern UI**: Beautiful, responsive design similar to PancakeSwap
- ✅ **Wallet Integration**: Connect with MetaMask or any Web3 wallet
- ✅ **Automated Rounds**: Rounds automatically progress every 5 minutes
- ✅ **Full Stack**: Next.js frontend + NestJS backend + Smart contracts

## 📦 What's Included

### Smart Contracts
- `MultiCoinPredictionMarket.sol` - Main contract supporting 3 coins
- `MockPriceOracle.sol` - Mock oracle for local testing
- Full test suite

### Frontend (Next.js)
- Modern React with TypeScript
- RainbowKit for wallet connection
- Wagmi for Web3 interactions
- Tailwind CSS for styling
- Real-time round updates

### Backend (NestJS)
- RESTful API
- Contract interaction service
- Price fetching
- Round data aggregation

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- MetaMask browser extension

### 1. Install Root Dependencies
```bash
npm install
```

### 2. Start Hardhat Node
```bash
npm run node
```
Keep this terminal running!

### 3. Deploy Multi-Coin Contract
In a new terminal:
```bash
npm run deploy:multi
```
Copy the contract address from the output.

### 4. Extract Contract ABI
```bash
npm run extract-abi
```
This updates the frontend with the correct ABI.

### 5. Setup Backend
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add: CONTRACT_ADDRESS=0x... (from step 3)
npm run start:dev
```

### 6. Setup Frontend
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local and add: NEXT_PUBLIC_CONTRACT_ADDRESS=0x... (from step 3)
npm run dev
```

### 7. Open Browser
Navigate to `http://localhost:3000`

### 8. Connect Wallet
- Click "Connect Wallet"
- Select MetaMask
- If needed, add Localhost network:
  - Network Name: Localhost
  - RPC URL: http://127.0.0.1:8545
  - Chain ID: 1337
  - Currency: ETH

## 📁 Project Structure

```
INTERVIEW-Blockchain/
├── contracts/
│   ├── MultiCoinPredictionMarket.sol  # Multi-coin contract
│   └── MockPriceOracle.sol            # Mock oracle
├── frontend/                           # Next.js app
│   ├── app/                           # Next.js 14 app directory
│   ├── components/                    # React components
│   └── config/                        # Contract config
├── backend/                            # NestJS API
│   └── src/
│       ├── prediction/                # Prediction module
│       └── main.ts                    # Entry point
├── scripts/
│   ├── deploy-multi-coin.js           # Deploy script
│   └── extract-abi.js                 # ABI extractor
└── test/                               # Contract tests
```

## 🎮 How to Use

1. **Select Coin**: Choose BTC, ETH, or BNB
2. **View Round**: See current round status and countdown
3. **Place Bet**: 
   - Select Bull (UP) or Bear (DOWN)
   - Enter bet amount
   - Confirm transaction
4. **Wait**: Round locks after 5 minutes, closes after 10 minutes
5. **Claim**: If you won, claim your winnings!

## 🔧 Configuration

### Environment Variables

**Backend (.env):**
```
CONTRACT_ADDRESS=0x...
RPC_URL=http://127.0.0.1:8545
```

**Frontend (.env.local):**
```
NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
NEXT_PUBLIC_CHAIN_ID=1337
NEXT_PUBLIC_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

## 📡 API Endpoints

### Backend (http://localhost:3001)

- `GET /api/prediction/round/:coin` - Get current round (BTC/ETH/BNB)
- `GET /api/prediction/round/:coin/:roundId` - Get specific round
- `GET /api/prediction/price/:coin` - Get current price
- `GET /api/prediction/user-bet/:coin/:address/:roundId` - Get user bet
- `GET /api/prediction/payout/:coin/:roundId?position=bull&amount=0.1` - Calculate payout

## 🛠️ Development

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

### Compiling Contracts
```bash
npm run compile
```

### Running Tests
```bash
npm run test
```

## 🐛 Troubleshooting

### Contract Not Found
- Verify contract is deployed
- Check contract address in `.env` files
- Ensure Hardhat node is running

### Wallet Connection Issues
- Add Localhost network to MetaMask
- Check Chain ID is 1337
- Verify RPC URL is correct

### Backend Errors
- Check contract address in backend `.env`
- Verify Hardhat node is accessible
- Check contract ABI path

### Frontend Not Loading
- Check browser console for errors
- Verify all environment variables
- Ensure contract ABI is updated

## 📚 Documentation

- `WEB_SETUP.md` - Detailed setup guide
- `QUICK_START.md` - Quick start guide
- `SMART_CONTRACT_FLOW.md` - Contract flow documentation

## 🎨 UI Features

- **Coin Selector**: Switch between BTC, ETH, BNB
- **Round Timer**: Countdown to lock/close
- **Betting Cards**: Visual Bull/Bear selection
- **Pool Display**: Show total bets per side
- **Odds Calculator**: Real-time payout odds
- **User Dashboard**: View your bets and winnings

## 🔐 Security Notes

- This is for **local testing only**
- Use real Chainlink oracles for production
- Add proper error handling
- Implement rate limiting
- Add input validation

## 🚀 Production Deployment

For production:
1. Deploy to BSC Testnet/Mainnet
2. Use real Chainlink price feeds
3. Set up Chainlink Automation
4. Configure proper CORS
5. Add environment-specific configs
6. Enable HTTPS
7. Add monitoring and logging

## 📝 License

MIT

## 🙏 Credits

Inspired by PancakeSwap Prediction Market

