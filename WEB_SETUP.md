# Prediction Market Web Application Setup

Complete guide to set up and run the Prediction Market web application locally.

## Project Structure

```
INTERVIEW-Blockchain/
├── contracts/          # Smart contracts
├── frontend/           # Next.js frontend
├── backend/            # NestJS backend
└── scripts/            # Deployment scripts
```

## Prerequisites

- Node.js 18+ and npm
- Hardhat node running locally
- MetaMask or compatible wallet

## Step 1: Deploy Multi-Coin Contract

1. **Start Hardhat node:**
   ```bash
   npm run node
   ```

2. **In a new terminal, deploy the multi-coin contract:**
   ```bash
   npx hardhat run scripts/deploy-multi-coin.js --network localhost
   ```

3. **Copy the contract addresses** from the output.

## Step 2: Setup Backend

1. **Navigate to backend:**
   ```bash
   cd backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env` file:**
   ```bash
   cp .env.example .env
   ```

4. **Update `.env` with your contract address:**
   ```
   CONTRACT_ADDRESS=0x... (from deployment)
   RPC_URL=http://127.0.0.1:8545
   ```

5. **Start backend:**
   ```bash
   npm run start:dev
   ```

   Backend will run on `http://localhost:3001`

## Step 3: Setup Frontend

1. **Navigate to frontend:**
   ```bash
   cd frontend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Create `.env.local` file:**
   ```bash
   cp .env.local.example .env.local
   ```

4. **Update `.env.local`:**
   ```
   NEXT_PUBLIC_RPC_URL=http://127.0.0.1:8545
   NEXT_PUBLIC_CHAIN_ID=1337
   NEXT_PUBLIC_CONTRACT_ADDRESS=0x... (from deployment)
   NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
   ```

5. **Update contract ABI:**
   
   Copy the ABI from `artifacts/contracts/MultiCoinPredictionMarket.sol/MultiCoinPredictionMarket.json` 
   to `frontend/config/contract.ts` (replace the CONTRACT_ABI array).

6. **Start frontend:**
   ```bash
   npm run dev
   ```

   Frontend will run on `http://localhost:3000`

## Step 4: Connect Wallet

1. Open `http://localhost:3000` in your browser
2. Click "Connect Wallet" in the top right
3. Select MetaMask or your preferred wallet
4. Connect to Localhost network (Chain ID: 1337)

## Step 5: Test the Application

1. **Select a coin** (BTC, ETH, or BNB)
2. **View current round** information
3. **Place a bet:**
   - Select Bull (UP) or Bear (DOWN)
   - Enter bet amount
   - Click "Bet"
   - Confirm transaction in MetaMask
4. **Wait for round to lock** (5 minutes)
5. **Wait for round to close** (another 5 minutes)
6. **Claim winnings** if you won

## Features

### Frontend
- ✅ Multi-coin support (BTC, ETH, BNB)
- ✅ Real-time round information
- ✅ Betting interface
- ✅ Wallet connection (RainbowKit)
- ✅ User bet tracking
- ✅ Claim winnings
- ✅ Responsive design

### Backend
- ✅ REST API for contract data
- ✅ Round information endpoints
- ✅ Price fetching
- ✅ User bet queries
- ✅ Payout calculations

## API Endpoints

### Backend (http://localhost:3001)

- `GET /api/prediction/round/:coin` - Get current round
- `GET /api/prediction/round/:coin/:roundId` - Get specific round
- `GET /api/prediction/price/:coin` - Get current price
- `GET /api/prediction/user-bet/:coin/:address/:roundId` - Get user bet
- `GET /api/prediction/payout/:coin/:roundId?position=bull&amount=0.1` - Calculate payout

## Troubleshooting

### Contract not found
- Make sure contract is deployed
- Check contract address in `.env.local`
- Verify Hardhat node is running

### Wallet connection issues
- Make sure MetaMask is connected to Localhost (Chain ID: 1337)
- Add network manually if needed:
  - Network Name: Localhost
  - RPC URL: http://127.0.0.1:8545
  - Chain ID: 1337
  - Currency Symbol: ETH

### Backend errors
- Check contract address in backend `.env`
- Verify Hardhat node is accessible
- Check contract ABI path in `prediction.service.ts`

### Frontend errors
- Verify contract ABI in `config/contract.ts`
- Check browser console for errors
- Ensure all environment variables are set

## Development

### Running all services

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

**Terminal 4 - Automation (optional):**
```bash
npm run automate
```

## Next Steps

- Add more UI components
- Implement round history
- Add charts and statistics
- Improve error handling
- Add loading states
- Implement notifications


