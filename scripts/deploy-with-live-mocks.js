const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying Multi-Coin Prediction Market with LIVE Mock Oracles...");
  console.log("📡 Network:", hre.network.name);
  console.log("=".repeat(80));

  const [deployer, treasury] = await hre.ethers.getSigners();
  
  console.log("\n👤 Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  console.log("\n📦 Deploying Mock Oracles with realistic prices...");
  console.log("-".repeat(80));
  
  const MockOracle = await hre.ethers.getContractFactory("MockPriceOracle");
  
  // Use realistic current prices (8 decimals for USD prices)
  // BTC: ~$98,000
  const btcPrice = hre.ethers.parseUnits("98000", 8);
  const btcOracle = await MockOracle.deploy(btcPrice, 8);
  await btcOracle.waitForDeployment();
  const btcOracleAddress = await btcOracle.getAddress();
  console.log("✅ BTC Oracle deployed:", btcOracleAddress);
  console.log("   Initial price: $98,000.00");

  // ETH: ~$3,450
  const ethPrice = hre.ethers.parseUnits("3450", 8);
  const ethOracle = await MockOracle.deploy(ethPrice, 8);
  await ethOracle.waitForDeployment();
  const ethOracleAddress = await ethOracle.getAddress();
  console.log("✅ ETH Oracle deployed:", ethOracleAddress);
  console.log("   Initial price: $3,450.00");

  // BNB: ~$853
  const bnbPrice = hre.ethers.parseUnits("853", 8);
  const bnbOracle = await MockOracle.deploy(bnbPrice, 8);
  await bnbOracle.waitForDeployment();
  const bnbOracleAddress = await bnbOracle.getAddress();
  console.log("✅ BNB Oracle deployed:", bnbOracleAddress);
  console.log("   Initial price: $853.00");

  console.log("\n📦 Deploying Multi-Coin Prediction Market contract...");
  console.log("-".repeat(80));
  
  const MultiCoinPredictionMarket = await hre.ethers.getContractFactory("MultiCoinPredictionMarket");
  const market = await MultiCoinPredictionMarket.deploy(
    btcOracleAddress,
    ethOracleAddress,
    bnbOracleAddress,
    treasury.address
  );
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("✅ Contract deployed successfully!");

  console.log("\n" + "=".repeat(80));
  console.log("\n📋 Deployment Summary:");
  console.log("-".repeat(80));
  console.log("📍 Multi-Coin Prediction Market:", marketAddress);
  console.log("📍 BTC Oracle:", btcOracleAddress);
  console.log("📍 ETH Oracle:", ethOracleAddress);
  console.log("📍 BNB Oracle:", bnbOracleAddress);
  console.log("📍 Treasury:", treasury.address);

  // Test oracle connectivity
  console.log("\n🧪 Testing Mock Oracle prices...");
  console.log("-".repeat(80));
  
  try {
    const btcCurrentPrice = await market.getCurrentPrice(0); // Coin.BTC
    const ethCurrentPrice = await market.getCurrentPrice(1); // Coin.ETH
    const bnbCurrentPrice = await market.getCurrentPrice(2); // Coin.BNB
    
    console.log("✅ BTC/USD:", "$" + (Number(btcCurrentPrice) / 1e8).toFixed(2));
    console.log("✅ ETH/USD:", "$" + (Number(ethCurrentPrice) / 1e8).toFixed(2));
    console.log("✅ BNB/USD:", "$" + (Number(bnbCurrentPrice) / 1e8).toFixed(2));
    
    console.log("\n✅ All oracles working perfectly!");
  } catch (error) {
    console.log("❌ Error fetching prices:", error.message);
  }

  console.log("\n" + "=".repeat(80));
  console.log("\n💡 Next Steps:");
  console.log("1. Update frontend/.env.local:");
  console.log("   NEXT_PUBLIC_CONTRACT_ADDRESS=" + marketAddress);
  console.log("2. Keep the same Chain ID:");
  console.log("   NEXT_PUBLIC_CHAIN_ID=1337");
  console.log("3. Extract ABI:");
  console.log("   npm run extract-abi");
  console.log("4. Start frontend:");
  console.log("   cd frontend && npm run dev");
  console.log("\n💡 To update prices (simulate price changes):");
  console.log("   Use the automate script or manually update via contract");
  console.log("\n" + "=".repeat(80));
  
  // Save deployment info
  console.log("\n📝 Save these oracle addresses if you want to update prices:");
  console.log("   BTC Oracle: " + btcOracleAddress);
  console.log("   ETH Oracle: " + ethOracleAddress);
  console.log("   BNB Oracle: " + bnbOracleAddress);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

