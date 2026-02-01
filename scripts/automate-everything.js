const hre = require("hardhat");

// Configuration - UPDATE THESE AFTER EACH DEPLOYMENT!
const MARKET_ADDRESS = "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const ORACLES = {
  BTC: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
  ETH: "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512",
  BNB: "0x9fE46736679d2D9a65F0992F2272dE9f3c7fa6e0",
};

const BASE_PRICES = {
  BTC: 98000,
  ETH: 3450,
  BNB: 853,
};

const COINS = [
  { name: "BTC", enum: 0 },
  { name: "ETH", enum: 1 },
  { name: "BNB", enum: 2 },
];

const CHECK_INTERVAL = 10000; // Check every 10 seconds
const PRICE_UPDATE_INTERVAL = 10000; // Update prices every 10 seconds

let market;
let oracles = {};
let currentPrices = { ...BASE_PRICES };

/**
 * Generate realistic price change (±$1 to ±$3)
 */
function generatePriceChange(basePrice) {
  const minChange = -3;
  const maxChange = 3;
  const change = Math.floor(Math.random() * (maxChange - minChange + 1)) + minChange;
  return Math.floor(basePrice + change);
}

/**
 * Update mock oracle price
 */
async function updateOraclePrice(coinName) {
  try {
    const oracle = oracles[coinName];
    const currentPrice = currentPrices[coinName];
    const newPrice = generatePriceChange(currentPrice);
    const priceWithDecimals = hre.ethers.parseUnits(newPrice.toString(), 8);
    
    const tx = await oracle.setPrice(priceWithDecimals);
    await tx.wait();
    
    const priceChange = newPrice - currentPrice;
    const emoji = priceChange > 0 ? "📈" : priceChange < 0 ? "📉" : "➡️";
    const sign = priceChange > 0 ? "+" : "";
    
    console.log(`   ${emoji} ${coinName}: $${currentPrice.toLocaleString()} → $${newPrice.toLocaleString()} (${sign}$${priceChange})`);
    
    currentPrices[coinName] = newPrice;
  } catch (error) {
    console.error(`   ❌ Error updating ${coinName} price:`, error.message);
  }
}

/**
 * Update all prices
 */
async function updateAllPrices() {
  console.log("\n💰 Updating Prices...");
  console.log("-".repeat(80));
  
  for (const coinName of Object.keys(ORACLES)) {
    await updateOraclePrice(coinName);
  }
}

/**
 * Check and execute round operations for a specific coin
 */
async function checkAndExecuteForCoin(coinEnum, coinName) {
  try {
    const currentRoundId = await market.currentRound(coinEnum);
    const round = await market.getRound(coinEnum, currentRoundId);
    const block = await hre.ethers.provider.getBlock("latest");
    const now = block.timestamp;
    
    console.log(`\n🎲 ${coinName} Round ${currentRoundId.toString()}:`);
    console.log(`   Status: ${Number(round.status) === 0 ? "Open" : Number(round.status) === 1 ? "Locked" : "Closed"}`);
    
    // 1. Check if round should be locked
    if (Number(round.status) === 0 && now >= Number(round.lockTimestamp)) {
      console.log(`   🔒 Locking ${coinName} round ${currentRoundId.toString()}...`);
      const tx = await market.lockRound(coinEnum, currentRoundId);
      await tx.wait();
      console.log(`   ✅ ${coinName} Round ${currentRoundId.toString()} locked!`);
      return;
    }
    
    // 2. Check if round should be closed
    if (Number(round.status) === 1 && now >= Number(round.closeTimestamp) && !round.oracleCalled) {
      console.log(`   🔚 Closing ${coinName} round ${currentRoundId.toString()}...`);
      const tx = await market.closeRound(coinEnum, currentRoundId);
      await tx.wait();
      console.log(`   ✅ ${coinName} Round ${currentRoundId.toString()} closed!`);
      return;
    }
    
    // 3. Check if new round should be created
    if (Number(round.status) === 2) {
      console.log(`   ⚠️  Round is closed. Checking if next round exists...`);
      const nextRoundId = currentRoundId + 1n;
      try {
        const nextRound = await market.getRound(coinEnum, nextRoundId);
        // If next round doesn't exist (roundId is 0) or is also closed, create a new one
        if (nextRound.roundId === 0n) {
          console.log(`   🆕 Creating next ${coinName} round (Round ${nextRoundId})...`);
          const tx = await market.createNextRound(coinEnum);
          await tx.wait();
          console.log(`   ✅ ${coinName} Round ${nextRoundId} created!`);
        } else {
          console.log(`   ℹ️  Next round already exists (Round ${nextRoundId}, status: ${Number(nextRound.status) === 0 ? 'Open' : Number(nextRound.status) === 1 ? 'Locked' : 'Closed'})`);
        }
      } catch (error) {
        console.log(`   🆕 Creating next ${coinName} round (Round ${nextRoundId})...`);
        try {
          const tx = await market.createNextRound(coinEnum);
          await tx.wait();
          console.log(`   ✅ ${coinName} Round ${nextRoundId} created!`);
        } catch (createError) {
          console.error(`   ❌ Failed to create round:`, createError.message);
        }
      }
      return;
    }
    
    // 4. Show time until next action
    if (Number(round.status) === 0) {
      const timeUntilLock = Number(round.lockTimestamp) - now;
      const minutes = Math.floor(timeUntilLock / 60);
      const seconds = timeUntilLock % 60;
      console.log(`   ⏰ Round locks in ${minutes}m ${seconds}s`);
    } else if (Number(round.status) === 1) {
      const timeUntilClose = Number(round.closeTimestamp) - now;
      const minutes = Math.floor(timeUntilClose / 60);
      const seconds = timeUntilClose % 60;
      console.log(`   ⏰ Round closes in ${minutes}m ${seconds}s`);
    }
    
  } catch (error) {
    console.error(`   ❌ Error for ${coinName}:`, error.message);
  }
}

/**
 * Check all rounds
 */
async function checkAllRounds() {
  console.log("\n🔄 Checking Rounds...");
  console.log("=".repeat(80));
  
  for (const coin of COINS) {
    await checkAndExecuteForCoin(coin.enum, coin.name);
  }
  
  console.log("=".repeat(80));
}

/**
 * Initialize
 */
async function initialize() {
  try {
    console.log("🤖 Starting Complete Automation Bot...");
    console.log("   📊 Auto-updating prices (±$1-$3 every 10s)");
    console.log("   🎲 Auto-managing rounds (lock/close/create)");
    console.log("\n" + "=".repeat(80));
    
    market = await hre.ethers.getContractAt("MultiCoinPredictionMarket", MARKET_ADDRESS);
    console.log("✅ Connected to Prediction Market:", MARKET_ADDRESS);
    
    // Connect to oracles
    for (const [coinName, address] of Object.entries(ORACLES)) {
      oracles[coinName] = await hre.ethers.getContractAt("MockPriceOracle", address);
      console.log(`✅ Connected to ${coinName} Oracle:`, address);
    }
    
    console.log("\n⏱️  Checking every 10 seconds");
    console.log("   Press Ctrl+C to stop\n");
    console.log("=".repeat(80));
    
    return true;
  } catch (error) {
    console.error("❌ Failed to initialize:", error.message);
    return false;
  }
}

/**
 * Main
 */
async function main() {
  const connected = await initialize();
  if (!connected) {
    console.error("Failed to initialize. Exiting...");
    process.exit(1);
  }
  
  // Run immediately
  await updateAllPrices();
  await checkAllRounds();
  
  // Then run on interval
  setInterval(async () => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n\n[${ timestamp}] ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
    
    await updateAllPrices();
    await checkAllRounds();
  }, CHECK_INTERVAL);
  
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping automation bot...');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

