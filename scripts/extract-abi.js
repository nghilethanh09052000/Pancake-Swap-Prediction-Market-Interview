const fs = require('fs');
const path = require('path');

// Extract ABI from compiled contract
const artifactPath = path.join(__dirname, '../artifacts/contracts/MultiCoinPredictionMarket.sol/MultiCoinPredictionMarket.json');

try {
  const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
  const abi = artifact.abi;
  
  // Write to frontend config
  const frontendConfigPath = path.join(__dirname, '../frontend/src/config/contract.ts');
  let configContent = fs.readFileSync(frontendConfigPath, 'utf8');
  
  // Replace the ABI array
  const abiString = JSON.stringify(abi, null, 2);
  configContent = configContent.replace(
    /export const CONTRACT_ABI = \[[\s\S]*?\] as const/,
    `export const CONTRACT_ABI = ${abiString} as const`
  );
  
  fs.writeFileSync(frontendConfigPath, configContent);
  console.log('✅ ABI extracted and updated in frontend/src/config/contract.ts');
} catch (error) {
  console.error('❌ Error extracting ABI:', error.message);
  console.log('Make sure to compile contracts first: npm run compile');
}


