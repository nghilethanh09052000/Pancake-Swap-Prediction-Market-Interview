const hre = require("hardhat");

async function main() {
  console.log("Deploying Prediction Market...");

  // For BSC Mainnet, use Chainlink BNB/USD price feed: 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE
  // For BSC Testnet, use: 0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526
  // For testing, we'll deploy a mock oracle
  
  const [deployer, treasury] = await hre.ethers.getSigners();
  
  console.log("Deploying contracts with account:", deployer.address);
  console.log("Account balance:", (await hre.ethers.provider.getBalance(deployer.address)).toString());

  // Deploy Mock Oracle (for testing - use real Chainlink oracle on mainnet)
  const MockOracle = await hre.ethers.getContractFactory("MockPriceOracle");
  const initialPrice = hre.ethers.parseUnits("300", 8); // $300
  const mockOracle = await MockOracle.deploy(initialPrice, 8);
  await mockOracle.waitForDeployment();
  const oracleAddress = await mockOracle.getAddress();
  console.log("Mock Oracle deployed to:", oracleAddress);

  // Deploy Prediction Market
  const PredictionMarket = await hre.ethers.getContractFactory("PredictionMarket");
  const predictionMarket = await PredictionMarket.deploy(
    oracleAddress,
    treasury.address
  );
  await predictionMarket.waitForDeployment();
  const marketAddress = await predictionMarket.getAddress();
  console.log("Prediction Market deployed to:", marketAddress);

  console.log("\n=== Deployment Summary ===");
  console.log("Oracle Address:", oracleAddress);
  console.log("Prediction Market Address:", marketAddress);
  console.log("Treasury Address:", treasury.address);
  console.log("\nTo use Chainlink oracle on BSC Mainnet:");
  console.log("BNB/USD Price Feed: 0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

