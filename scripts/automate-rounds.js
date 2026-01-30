const hre = require("hardhat");

// Configuration
const MARKET_ADDRESS = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
const CHECK_INTERVAL = 60000; // Check every 60 seconds (1 minute)

let market;
let isRunning = false;

/**
 * Initialize contract connection
 */
async function initialize() {
  try {
    market = await hre.ethers.getContractAt("PredictionMarket", MARKET_ADDRESS);
    console.log("✅ Connected to PredictionMarket contract");
    console.log("📍 Contract Address:", MARKET_ADDRESS);
    return true;
  } catch (error) {
    console.error("❌ Failed to connect to contract:", error.message);
    return false;
  }
}

/**
 * Check and execute round operations
 */
async function checkAndExecute() {
  if (isRunning) {
    return; // Prevent concurrent executions
  }
  
  isRunning = true;
  
  try {
    const currentRoundId = await market.currentRound();
    const round = await market.getCurrentRound();
    const block = await hre.ethers.provider.getBlock("latest");
    const now = block.timestamp;
    
    console.log(`\n[${new Date().toLocaleTimeString()}] Checking Round ${currentRoundId.toString()}...`);
    console.log(`   Status: ${round.status === 0 ? "Open" : round.status === 1 ? "Locked" : "Closed"}`);
    console.log(`   Current Time: ${new Date(now * 1000).toLocaleTimeString()}`);
    
    // 1. Check if round should be locked
    if (round.status === 0 && now >= Number(round.lockTimestamp)) {
      console.log(`   🔒 Locking round ${currentRoundId.toString()}...`);
      const tx = await market.lockRound(currentRoundId);
      await tx.wait();
      console.log(`   ✅ Round ${currentRoundId.toString()} locked!`);
      console.log(`   🎉 New round created automatically!`);
      return;
    }
    
    // 2. Check if round should be closed
    if (round.status === 1 && now >= Number(round.closeTimestamp) && !round.oracleCalled) {
      console.log(`   🔚 Closing round ${currentRoundId.toString()}...`);
      const tx = await market.closeRound(currentRoundId);
      await tx.wait();
      console.log(`   ✅ Round ${currentRoundId.toString()} closed!`);
      return;
    }
    
    // 3. Check if new round should be created (if current is closed)
    if (round.status === 2) {
      // Check if next round exists
      try {
        const nextRound = await market.getRound(currentRoundId + 1n);
        if (nextRound.roundId === 0n) {
          console.log(`   🆕 Creating next round...`);
          const tx = await market.createNextRound();
          await tx.wait();
          const newRoundId = await market.currentRound();
          console.log(`   ✅ New round ${newRoundId.toString()} created!`);
        }
      } catch (error) {
        // Next round doesn't exist, create it
        console.log(`   🆕 Creating next round...`);
        const tx = await market.createNextRound();
        await tx.wait();
        const newRoundId = await market.currentRound();
        console.log(`   ✅ New round ${newRoundId.toString()} created!`);
      }
      return;
    }
    
    // 4. Show time until next action
    if (round.status === 0) {
      const timeUntilLock = Number(round.lockTimestamp) - now;
      const minutes = Math.floor(timeUntilLock / 60);
      const seconds = timeUntilLock % 60;
      console.log(`   ⏰ Round will lock in ${minutes}m ${seconds}s`);
    } else if (round.status === 1) {
      const timeUntilClose = Number(round.closeTimestamp) - now;
      const minutes = Math.floor(timeUntilClose / 60);
      const seconds = timeUntilClose % 60;
      console.log(`   ⏰ Round will close in ${minutes}m ${seconds}s`);
    }
    
  } catch (error) {
    console.error("   ❌ Error:", error.message);
    if (error.reason) {
      console.error("   Reason:", error.reason);
    }
  } finally {
    isRunning = false;
  }
}

/**
 * Main function
 */
async function main() {
  console.log("🤖 Starting Prediction Market Automation Bot...\n");
  
  // Initialize connection
  const connected = await initialize();
  if (!connected) {
    console.error("Failed to initialize. Exiting...");
    process.exit(1);
  }
  
  // Get initial round info
  const currentRoundId = await market.currentRound();
  const round = await market.getCurrentRound();
  console.log(`\n📊 Initial State:`);
  console.log(`   Current Round: ${currentRoundId.toString()}`);
  console.log(`   Status: ${round.status === 0 ? "Open ✅" : round.status === 1 ? "Locked 🔒" : "Closed ❌"}`);
  console.log(`   Bull Pool: ${hre.ethers.formatEther(round.totalBullAmount)} ETH`);
  console.log(`   Bear Pool: ${hre.ethers.formatEther(round.totalBearAmount)} ETH`);
  
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

