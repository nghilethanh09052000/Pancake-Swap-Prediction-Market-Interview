const hre = require("hardhat");

async function main() {
  console.log("Deploying Multi-Coin Prediction Market...");

  const [deployer, treasury] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy Mock Oracles for each coin
  const MockOracle = await hre.ethers.getContractFactory("MockPriceOracle");
  
  // BTC: $45,000
  const btcPrice = hre.ethers.parseUnits("45000", 8);
  const btcOracle = await MockOracle.deploy(btcPrice, 8);
  await btcOracle.waitForDeployment();
  const btcOracleAddress = await btcOracle.getAddress();
  console.log("BTC Oracle deployed to:", btcOracleAddress);

  // ETH: $3,000
  const ethPrice = hre.ethers.parseUnits("3000", 8);
  const ethOracle = await MockOracle.deploy(ethPrice, 8);
  await ethOracle.waitForDeployment();
  const ethOracleAddress = await ethOracle.getAddress();
  console.log("ETH Oracle deployed to:", ethOracleAddress);

  // BNB: $300
  const bnbPrice = hre.ethers.parseUnits("300", 8);
  const bnbOracle = await MockOracle.deploy(bnbPrice, 8);
  await bnbOracle.waitForDeployment();
  const bnbOracleAddress = await bnbOracle.getAddress();
  console.log("BNB Oracle deployed to:", bnbOracleAddress);

  // Deploy Multi-Coin Prediction Market
  const MultiCoinPredictionMarket = await hre.ethers.getContractFactory("MultiCoinPredictionMarket");
  const market = await MultiCoinPredictionMarket.deploy(
    btcOracleAddress,
    ethOracleAddress,
    bnbOracleAddress,
    treasury.address
  );
  await market.waitForDeployment();
  const marketAddress = await market.getAddress();
  console.log("Multi-Coin Prediction Market deployed to:", marketAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("BTC Oracle:", btcOracleAddress);
  console.log("ETH Oracle:", ethOracleAddress);
  console.log("BNB Oracle:", bnbOracleAddress);
  console.log("Prediction Market:", marketAddress);
  console.log("Treasury:", treasury.address);
  console.log("\n✅ Update these addresses in your .env files!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


