// scripts/create-next-round.js
const hre = require("hardhat");

async function main() {
  const marketAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  const market = await hre.ethers.getContractAt("PredictionMarket", marketAddress);
  
  console.log("=== Creating Next Round ===\n");
  
  // Get current round
  const currentRoundId = await market.currentRound();
  const round = await market.getRound(currentRoundId);
  
  console.log("Current Round:", currentRoundId.toString());
  console.log("Status:", round.status === 0 ? "Open" : round.status === 1 ? "Locked" : "Closed");
  
  // If current round is closed, we need to create a new one
  // Since we can't call _createRound() directly, we'll need to work around it
  // The easiest way is to check if we can interact with the contract
  
  // Actually, the contract should automatically create a new round when lockRound is called
  // But since round 2 is closed, we need a different approach
  
  // Let's check what the next round would be
  const nextRoundId = currentRoundId + 1n;
  console.log("\nNext Round ID would be:", nextRoundId.toString());
  
  // Try to get the next round (it might not exist)
  try {
    const nextRound = await market.getRound(nextRoundId);
    if (nextRound.roundId > 0n) {
      console.log("✅ Next round already exists!");
      console.log("Round ID:", nextRound.roundId.toString());
      console.log("Status:", nextRound.status === 0 ? "Open ✅" : "Not open");
    }
  } catch (error) {
    console.log("❌ Next round doesn't exist yet.");
    console.log("\nTo create a new round, you need to:");
    console.log("1. Deploy a new contract, OR");
    console.log("2. Add a public function to create rounds, OR");
    console.log("3. Wait for the contract to automatically create one when locking");
  }
  
  // Alternative: We can try to manually create by calling a function that triggers it
  // But since _createRound is internal, we can't call it directly
  
  console.log("\n=== Solution: Use Hardhat Console ===");
  console.log("Run: npx hardhat console --network localhost");
  console.log("Then manually interact with the contract to create a new round.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });