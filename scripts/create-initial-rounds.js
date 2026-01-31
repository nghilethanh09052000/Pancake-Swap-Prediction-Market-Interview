const hre = require("hardhat");

// Contract address from deployment
const MARKET_ADDRESS = "0x8A791620dd6260079BF849Dc5567aDC3F2FdC318";

const COINS = [
  { name: "BTC", enum: 0 },
  { name: "ETH", enum: 1 },
  { name: "BNB", enum: 2 },
];

async function main() {
  console.log("🚀 Creating initial rounds for all coins...\n");
  console.log("=".repeat(80));
  
  const market = await hre.ethers.getContractAt("MultiCoinPredictionMarket", MARKET_ADDRESS);
  console.log("✅ Connected to Prediction Market:", MARKET_ADDRESS);
  
  console.log("\n📦 Creating rounds...");
  console.log("-".repeat(80));
  
  for (const coin of COINS) {
    try {
      console.log(`\n🎲 Creating ${coin.name} round...`);
      const tx = await market.createNextRound(coin.enum);
      await tx.wait();
      
      const currentRoundId = await market.currentRound(coin.enum);
      console.log(`✅ ${coin.name} Round ${currentRoundId.toString()} created!`);
      
      // Get round details
      const round = await market.getRound(coin.enum, currentRoundId);
      const lockTime = new Date(Number(round.lockTimestamp) * 1000);
      const closeTime = new Date(Number(round.closeTimestamp) * 1000);
      
      console.log(`   Lock Time: ${lockTime.toLocaleTimeString()}`);
      console.log(`   Close Time: ${closeTime.toLocaleTimeString()}`);
      
    } catch (error) {
      console.error(`❌ Error creating ${coin.name} round:`, error.message);
    }
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("\n✅ All rounds created successfully!");
  console.log("\n💡 Now run: npm run automate:all");
  console.log("   to start automatic price updates and round management\n");
  console.log("=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
  });

