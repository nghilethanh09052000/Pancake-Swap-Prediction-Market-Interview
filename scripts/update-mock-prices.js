const hre = require("hardhat");

// Mock Oracle addresses from deployment - UPDATE THESE AFTER EACH DEPLOYMENT!
const ORACLES = {
  BTC: "0x0165878A594ca255338adfa4d48449f69242Eb8F",
  ETH: "0xa513E6E4b8f2a923D98304ec87F64353C4D5C853",
  BNB: "0x2279B7A0a67DB372996a5FaB50D91eAA73d2eBe6",
};

// Base prices (will fluctuate around these)
const BASE_PRICES = {
  BTC: 98000,
  ETH: 3450,
  BNB: 853,
};

// Update interval in milliseconds (10 seconds)
const UPDATE_INTERVAL = 10000;

let isRunning = true;

/**
 * Generate a realistic price change (±$1 to ±$3 randomly)
 */
function generatePriceChange(basePrice) {
  // Random change between -3 and +3 dollars
  const minChange = -3;
  const maxChange = 3;
  const change = Math.floor(Math.random() * (maxChange - minChange + 1)) + minChange;
  
  return Math.floor(basePrice + change);
}

/**
 * Update mock oracle price
 */
async function updateOraclePrice(oracle, coinName, currentPrice) {
  try {
    const newPrice = generatePriceChange(currentPrice);
    const priceWithDecimals = hre.ethers.parseUnits(newPrice.toString(), 8);
    
    const tx = await oracle.setPrice(priceWithDecimals);
    await tx.wait();
    
    const priceChange = newPrice - currentPrice;
    const emoji = priceChange > 0 ? "📈" : priceChange < 0 ? "📉" : "➡️";
    const sign = priceChange > 0 ? "+" : "";
    
    console.log(`${emoji} ${coinName}: $${currentPrice.toLocaleString()} → $${newPrice.toLocaleString()} (${sign}$${priceChange})`);
    
    return newPrice;
  } catch (error) {
    console.error(`❌ Error updating ${coinName}:`, error.message);
    return currentPrice;
  }
}

/**
 * Main automation loop
 */
async function main() {
  console.log("🤖 Starting Mock Price Updater Bot...");
  console.log("📊 Simulating realistic crypto price movements\n");
  console.log("=".repeat(80));
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("👤 Connected as:", deployer.address);
  
  // Connect to mock oracles
  const btcOracle = await hre.ethers.getContractAt("MockPriceOracle", ORACLES.BTC);
  const ethOracle = await hre.ethers.getContractAt("MockPriceOracle", ORACLES.ETH);
  const bnbOracle = await hre.ethers.getContractAt("MockPriceOracle", ORACLES.BNB);
  
  console.log("\n📡 Connected to Mock Oracles:");
  console.log("   BTC:", ORACLES.BTC);
  console.log("   ETH:", ORACLES.ETH);
  console.log("   BNB:", ORACLES.BNB);
  
  console.log("\n⏱️  Updating prices every", UPDATE_INTERVAL / 1000, "seconds");
  console.log("   Press Ctrl+C to stop\n");
  console.log("=".repeat(80));
  
  // Track current prices
  let currentPrices = {
    BTC: BASE_PRICES.BTC,
    ETH: BASE_PRICES.ETH,
    BNB: BASE_PRICES.BNB,
  };
  
  // Update prices on interval
  const updateCycle = async () => {
    const timestamp = new Date().toLocaleTimeString();
    console.log(`\n[${timestamp}] 🔄 Updating prices...`);
    console.log("-".repeat(80));
    
    currentPrices.BTC = await updateOraclePrice(btcOracle, "BTC", currentPrices.BTC);
    currentPrices.ETH = await updateOraclePrice(ethOracle, "ETH", currentPrices.ETH);
    currentPrices.BNB = await updateOraclePrice(bnbOracle, "BNB", currentPrices.BNB);
    
    console.log("-".repeat(80));
  };
  
  // Run immediately
  await updateCycle();
  
  // Then run on interval
  const intervalId = setInterval(async () => {
    if (isRunning) {
      await updateCycle();
    }
  }, UPDATE_INTERVAL);
  
  // Graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n\n🛑 Stopping price updater...');
    isRunning = false;
    clearInterval(intervalId);
    console.log('✅ Bot stopped gracefully');
    process.exit(0);
  });
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});

