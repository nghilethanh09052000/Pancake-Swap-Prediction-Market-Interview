const hre = require("hardhat");

// Real Chainlink Oracle Addresses on BSC Testnet
// Source: https://docs.chain.link/data-feeds/price-feeds/addresses?network=bnb-chain&page=1#bnb-chain-testnet
const CHAINLINK_ORACLES = {
  BTC: "0x5741306c21795FdCBb9b265Ea0255F499DFe515C",  // BTC/USD on BSC Testnet
  ETH: "0x143db3CEEfbdfe5631aDD3E50f7614B6ba708BA7",  // ETH/USD on BSC Testnet  
  BNB: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526",  // BNB/USD on BSC Testnet
};

async function main() {
  console.log("🚀 Deploying Multi-Coin Prediction Market with REAL Chainlink Oracles...");
  console.log("📡 Network:", hre.network.name);
  console.log("=".repeat(80));

  const [deployer, treasury] = await hre.ethers.getSigners();
  
  console.log("\n👤 Deploying with account:", deployer.address);
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // Verify oracle addresses are accessible
  console.log("\n📡 Verifying Chainlink Oracle addresses...");
  console.log("-".repeat(80));
  
  const oracleAbi = [
    "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    "function decimals() external view returns (uint8)",
    "function description() external view returns (string memory)"
  ];
  
  for (const [coin, address] of Object.entries(CHAINLINK_ORACLES)) {
    try {
      const oracle = new hre.ethers.Contract(address, oracleAbi, hre.ethers.provider);
      const latestRound = await oracle.latestRoundData();
      const price = Number(latestRound[1]) / 1e8;
      const decimals = await oracle.decimals();
      const description = await oracle.description();
      
      console.log(`✅ ${coin}/USD Oracle:`);
      console.log(`   Address: ${address}`);
      console.log(`   Description: ${description}`);
      console.log(`   Current Price: $${price.toFixed(2)}`);
      console.log(`   Decimals: ${decimals}`);
      console.log(`   Last Updated: ${new Date(Number(latestRound[3]) * 1000).toLocaleString()}`);
      console.log("");
    } catch (error) {
      console.error(`❌ ${coin} Oracle not accessible:`, error.message);
      console.log(`   Address: ${address}`);
      console.log("");
    }
  }

  console.log("=".repeat(80));
  console.log("\n📦 Deploying Multi-Coin Prediction Market contract...");

  // Deploy Multi-Coin Prediction Market with REAL oracles
  const MultiCoinPredictionMarket = await hre.ethers.getContractFactory("MultiCoinPredictionMarket");
  const market = await MultiCoinPredictionMarket.deploy(
    CHAINLINK_ORACLES.BTC,
    CHAINLINK_ORACLES.ETH,
    CHAINLINK_ORACLES.BNB,
    treasury.address
  );
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  
  console.log("✅ Contract deployed successfully!");
  console.log("=".repeat(80));
  
  console.log("\n📋 Deployment Summary:");
  console.log("-".repeat(80));
  console.log("📍 Multi-Coin Prediction Market:", marketAddress);
  console.log("📍 BTC Oracle:", CHAINLINK_ORACLES.BTC);
  console.log("📍 ETH Oracle:", CHAINLINK_ORACLES.ETH);
  console.log("📍 BNB Oracle:", CHAINLINK_ORACLES.BNB);
  console.log("📍 Treasury:", treasury.address);
  
  // Verify prices are accessible through the contract
  console.log("\n🧪 Testing price feeds through contract...");
  console.log("-".repeat(80));
  
  try {
    const btcPrice = await market.getCurrentPrice(0); // BTC = 0
    const ethPrice = await market.getCurrentPrice(1); // ETH = 1
    const bnbPrice = await market.getCurrentPrice(2); // BNB = 2
    
    console.log(`✅ BTC Price: $${(Number(btcPrice) / 1e8).toFixed(2)}`);
    console.log(`✅ ETH Price: $${(Number(ethPrice) / 1e8).toFixed(2)}`);
    console.log(`✅ BNB Price: $${(Number(bnbPrice) / 1e8).toFixed(2)}`);
    console.log("\n🎉 All price feeds are working correctly!");
  } catch (error) {
    console.error("❌ Error fetching prices:", error.message);
    console.log("\n⚠️  Make sure you're connected to BSC Testnet (forked or direct)");
  }
  
  console.log("\n" + "=".repeat(80));
  console.log("\n💡 Next Steps:");
  console.log("1. Update frontend/.env.local:");
  console.log(`   NEXT_PUBLIC_CONTRACT_ADDRESS=${marketAddress}`);
  console.log("2. Update frontend/.env.local:");
  console.log("   NEXT_PUBLIC_CHAIN_ID=1337");
  console.log("3. Start frontend: cd frontend && npm run dev");
  console.log("4. Your frontend will now show REAL crypto prices! 🚀");
  console.log("\n" + "=".repeat(80));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("\n❌ Deployment failed:");
    console.error(error);
    process.exit(1);
  });

