# Prediction Market Automation

This document explains how to use the automation features for the Prediction Market contract.

## New Functions Added

### 1. `createNextRound()`
Public function to manually create a new round when the current round is closed.

```solidity
function createNextRound() external
```

**Usage:**
```javascript
await market.createNextRound();
```

### 2. `checkUpkeep()` and `performUpkeep()`
Functions for Chainlink Automation (formerly Keepers) integration.

- `checkUpkeep()`: Checks if any round operations are needed
- `performUpkeep()`: Automatically executes lock, close, or create operations

## Automation Script

### Setup

1. **Make sure Hardhat node is running:**
   ```bash
   npm run node
   ```

2. **Deploy contracts:**
   ```bash
   npm run deploy -- --network localhost
   ```

3. **Update the contract address in `automate-rounds.js`:**
   ```javascript
   const MARKET_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
   ```
   (Use the address from your deployment)

### Running the Automation Bot

**In a new terminal (while Hardhat node is running):**

```bash
npm run automate
```

Or directly:
```bash
node scripts/automate-rounds.js
```

### What the Bot Does

The automation bot:
1. ✅ Checks every 60 seconds for round status
2. ✅ Automatically locks rounds when 5 minutes pass
3. ✅ Automatically closes rounds after another 5 minutes
4. ✅ Automatically creates new rounds when current is closed
5. ✅ Shows countdown timers until next action

### Example Output

```
🤖 Starting Prediction Market Automation Bot...

✅ Connected to PredictionMarket contract
📍 Contract Address: 0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512

📊 Initial State:
   Current Round: 3
   Status: Open ✅
   Bull Pool: 0.0 ETH
   Bear Pool: 0.0 ETH

⏱️  Checking every 60 seconds...
   Press Ctrl+C to stop

[10:45:00 PM] Checking Round 3...
   Status: Open
   Current Time: 10:45:00 PM
   ⏰ Round will lock in 4m 30s

[10:46:00 PM] Checking Round 3...
   Status: Open
   ⏰ Round will lock in 3m 30s

[10:50:00 PM] Checking Round 3...
   Status: Open
   🔒 Locking round 3...
   ✅ Round 3 locked!
   🎉 New round created automatically!
```

## Manual Round Creation

If you need to manually create a round:

```bash
npx hardhat console --network localhost
```

```javascript
const market = await ethers.getContractAt(
  "PredictionMarket",
  "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512"
);

// Check current round
const roundId = await market.currentRound();
const round = await market.getCurrentRound();

if (round.status === 2) { // Closed
  await market.createNextRound();
  console.log("New round created!");
}
```

## Production: Chainlink Automation

For production deployment, register your contract with Chainlink Automation:

1. Deploy contract to BSC Mainnet/Testnet
2. Register with Chainlink Automation
3. Set `checkUpkeep` and `performUpkeep` as the automation functions
4. Chainlink will automatically call `performUpkeep()` when needed

## Troubleshooting

**Bot not connecting:**
- Make sure Hardhat node is running
- Check contract address is correct
- Verify network is `localhost`

**Rounds not updating:**
- Check if Hardhat node is still running
- Verify contract is deployed
- Check console for error messages

**Permission errors:**
- Make sure you have proper file permissions
- Try running with `sudo` (not recommended for production)

## Stopping the Bot

Press `Ctrl+C` to stop the automation bot gracefully.

