const hre = require("hardhat");

// Configuration - Update with your deployed contract address
const MARKET_ADDRESS = process.env.CONTRACT_ADDRESS || "0xCf7Ed3AccA5a467e9e704C703E8D87F634fB0Fc9";
const CHECK_INTERVAL = 30000; // Check every 30 seconds (faster for 5-minute rounds)

const COINS = ['BTC', 'ETH', 'BNB'];
const COIN_ENUM = { BTC: 0, ETH: 1, BNB: 2 };

let market;
let isRunning = false;

/**
 * Initialize contract connection
 */
async function initialize() {
  try {
    market = await hre.ethers.getContractAt("MultiCoinPredictionMarket", MARKET_ADDRESS);
    console.log("✅ Connected to MultiCoinPredictionMarket contract");
    console.log("📍 Contract Address:", MARKET_ADDRESS);
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to contract:", error.message);
    return false;
  }
}

/**
 * Check and execute round operations for a specific coin
 */
async function checkAndExecuteCoin(coinName, coinEnum) {
  try {
    const currentRoundId = await market.currentRound(coinEnum);
    const round = await market.getCurrentRound(coinEnum);
    const block = await hre.ethers.provider.getBlock("latest");
    const now = block.timestamp;
    
    const statusText = round.status === 0 ? "Open" : round.status === 1 ? "Locked" : "Closed";
    console.log(`\n[${coinName}] Round ${currentRoundId.toString()} - ${statusText}`);
    
    // 1. Check if round should be locked (after 5 minutes)
    if (round.status === 0 && now >= Number(round.lockTimestamp)) {
      console.log(`   🔒 Locking ${coinName} round ${currentRoundId.toString()}...`);
      const tx = await market.lockRound(coinEnum, currentRoundId);
      await tx.wait();
      console.log(`   ✅ ${coinName} round ${currentRoundId.toString()} locked!`);
      console.log(`   🎉 New ${coinName} round created automatically!`);
      
      // Check if we can also close immediately
      const updatedRound = await market.getRound(coinEnum, currentRoundId);
      if (now >= Number(updatedRound.closeTimestamp) && !updatedRound.oracleCalled) {
        console.log(`   🔚 Closing ${coinName} round ${currentRoundId.toString()}...`);
        const closeTx = await market.closeRound(coinEnum, currentRoundId);
        await closeTx.wait();
        console.log(`   ✅ ${coinName} round ${currentRoundId.toString()} closed!`);
      }
      return;
    }
    
    // 2. Check if round should be closed (60 seconds after lock)
    if (round.status === 1 && now >= Number(round.closeTimestamp) && !round.oracleCalled) {
      console.log(`   🔚 Closing ${coinName} round ${currentRoundId.toString()}...`);
      const tx = await market.closeRound(coinEnum, currentRoundId);
      await tx.wait();
      console.log(`   ✅ ${coinName} round ${currentRoundId.toString()} closed!`);
      return;
    }
    
    // 3. Show time until next action
    if (round.status === 0) {
      const timeUntilLock = Number(round.lockTimestamp) - now;
      if (timeUntilLock > 0) {
        const minutes = Math.floor(timeUntilLock / 60);
        const seconds = timeUntilLock % 60;
        console.log(`   ⏰ Will lock in ${minutes}m ${seconds}s`);
      }
    } else if (round.status === 1) {
      const timeUntilClose = Number(round.closeTimestamp) - now;
      if (timeUntilClose > 0) {
        const seconds = timeUntilClose;
        console.log(`   ⏰ Will close in ${seconds}s`);
      }
    }
    
  } catch (error) {
    console.error(`   ❌ Error processing ${coinName}:`, error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
  }
}

/**
 * Check and execute round operations for all coins
 */
async function checkAndExecute() {
  if (isRunning) {
    return; // Prevent concurrent executions
  }
  
  isRunning = true;
  
  try {
    const block = await hre.ethers.provider.getBlock("latest");
    console.log(`\n[${new Date(block.timestamp * 1000).toLocaleTimeString()}] Checking all coins...`);
    
    // Process each coin
    for (const coinName of COINS) {
      await checkAndExecuteCoin(coinName, COIN_ENUM[coinName]);
    }
    
  } catch (error) {
    console.error("❌ Error:", error.message);
  } finally {
    isRunning = false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🤖 Starting Multi-Coin Prediction Market Automation Bot...\n");
  console.log("📋 Round Structure:");
  console.log("   - Betting period: 5 minutes");
  console.log("   - Lock + Close: ~60 seconds after betting ends");
  console.log("   - Next round starts immediately after lock\n");
  
  // Initialize connection
  const connected = await initialize();
  if (!connected) {
    console.error("Failed to initialize. Exiting...");
    process.exit(1);
  }
  
  // Get initial round info for all coins
  console.log("\n📊 Initial State:");
  for (const coinName of COINS) {
    try {
      const currentRoundId = await market.currentRound(COIN_ENUM[coinName]);
      const round = await market.getCurrentRound(COIN_ENUM[coinName]);
      const statusText = round.status === 0 ? "Open ✅" : round.status === 1 ? "Locked 🔒" : "Closed ❌";
      console.log(`   ${coinName}: Round ${currentRoundId.toString()} - ${statusText}`);
      console.log(`      Bull: ${hre.ethers.formatEther(round.totalBullAmount)} ETH`);
      console.log(`      Bear: ${hre.ethers.formatEther(round.totalBearAmount)} ETH`);
    } catch (error) {
      console.log(`   ${coinName}: Error getting round info`);
    }
  }
  
  console.log(`\n⏱️  Checking every ${CHECK_INTERVAL / 1000} seconds...`);
  console.log("   Press Ctrl+C to stop\n");
  
  // Run immediately
  await checkAndExecute();
  
  // Then run on interval
  setInterval(async () => {
    await checkAndExecute();
  }, CHECK_INTERVAL);
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping automation bot...');
    process.exit(0);
  });
}

// Run the bot
main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

