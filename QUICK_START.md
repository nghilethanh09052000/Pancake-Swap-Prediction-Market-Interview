# Quick Start Guide - Prediction Market Web App

## 🚀 Quick Setup (5 minutes)

### 1. Start Hardhat Node
```bash
npm run node
```
Keep this terminal open!

### 2. Deploy Contracts (New Terminal)
```bash
npx hardhat run scripts/deploy-multi-coin.js --network localhost
```
**Copy the contract address** from output!

### 3. Setup Backend (New Terminal)
```bash
cd backend
npm install
cp .env.example .env
# Edit .env and add CONTRACT_ADDRESS from step 2
npm run start:dev
```

### 4. Setup Frontend (New Terminal)
```bash
cd frontend
npm install
cp .env.local.example .env.local
# Edit .env.local and add NEXT_PUBLIC_CONTRACT_ADDRESS from step 2
npm run dev
```

### 5. Open Browser
Go to: `http://localhost:3000`

### 6. Connect Wallet
- Click "Connect Wallet"
- Select MetaMask
- Add Localhost network if needed:
  - Network: Localhost 8545
  - Chain ID: 1337
  - Currency: ETH

## 📋 What You Get

✅ **Multi-Coin Support**: BTC, ETH, BNB  
✅ **Real-time Updates**: Live round information  
✅ **Betting Interface**: Easy Bull/Bear betting  
✅ **Wallet Integration**: MetaMask/RainbowKit  
✅ **Auto Round Management**: Rounds progress automatically  

## 🎯 Test Flow

1. Select a coin (BTC/ETH/BNB)
2. Place a bet (Bull or Bear)
3. Wait 5 minutes → Round locks
4. Wait another 5 minutes → Round closes
5. Claim winnings if you won!

## 📁 Project Structure

```
frontend/          → Next.js app (port 3000)
backend/           → NestJS API (port 3001)
contracts/         → Smart contracts
scripts/           → Deployment scripts
```

## ⚠️ Important Notes

- **Hardhat node must be running** for everything to work
- **Update contract addresses** in both `.env` files after deployment
- **Use Localhost network** in MetaMask (Chain ID: 1337)
- **Test accounts** have 10,000 ETH each (from Hardhat node)

## 🐛 Troubleshooting

**Can't connect wallet?**
→ Add Localhost network to MetaMask manually

**Contract not found?**
→ Check contract address in `.env.local`

**Backend errors?**
→ Verify Hardhat node is running on port 8545

**Frontend not loading?**
→ Check browser console for errors

## 📚 Full Documentation

See `WEB_SETUP.md` for detailed setup instructions.

