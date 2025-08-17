#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Function to find the latest broadcast file
function findLatestBroadcast() {
  const broadcastDir = path.join(__dirname, '../contracts/broadcast/DeployFrenPet.s.sol');
  
  if (!fs.existsSync(broadcastDir)) {
    console.error('No broadcast directory found. Please deploy the contract first.');
    process.exit(1);
  }
  
  // Find chain ID directories
  const chainDirs = fs.readdirSync(broadcastDir).filter(dir => {
    return fs.statSync(path.join(broadcastDir, dir)).isDirectory();
  });
  
  if (chainDirs.length === 0) {
    console.error('No deployment found. Please deploy the contract first.');
    process.exit(1);
  }
  
  // Use the first chain directory (should be RISE testnet)
  const chainDir = path.join(broadcastDir, chainDirs[0]);
  const runLatest = path.join(chainDir, 'run-latest.json');
  
  if (!fs.existsSync(runLatest)) {
    console.error('No run-latest.json found. Please deploy the contract first.');
    process.exit(1);
  }
  
  return runLatest;
}

// Main sync function
function syncContract() {
  try {
    console.log('Syncing contract address and ABI...');
    
    // Read the broadcast file
    const broadcastFile = findLatestBroadcast();
    const broadcast = JSON.parse(fs.readFileSync(broadcastFile, 'utf8'));
    
    // Find the FrenPet contract deployment
    const frenPetDeploy = broadcast.transactions.find(tx => 
      tx.contractName === 'FrenPet'
    );
    
    if (!frenPetDeploy) {
      console.error('FrenPet contract not found in broadcast');
      process.exit(1);
    }
    
    const contractAddress = frenPetDeploy.contractAddress;
    console.log(`Found FrenPet at: ${contractAddress}`);
    
    // Read the ABI from the out directory
    const abiPath = path.join(__dirname, '../contracts/out/FrenPet.sol/FrenPet.json');
    const abiFile = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    const abi = abiFile.abi;
    
    // Update the contracts.ts file
    const contractsPath = path.join(__dirname, '../mobile/src/config/contracts.ts');
    let contractsContent = fs.readFileSync(contractsPath, 'utf8');
    
    // Replace the address
    contractsContent = contractsContent.replace(
      /export const FRENPET_ADDRESS = '[^']+'/,
      `export const FRENPET_ADDRESS = '${contractAddress}'`
    );
    
    // Write back the updated file
    fs.writeFileSync(contractsPath, contractsContent);
    
    console.log('✅ Contract address updated successfully!');
    console.log(`Contract Address: ${contractAddress}`);
    console.log('');
    console.log('You can now run the mobile app with:');
    console.log('cd mobile && npm start');
    
  } catch (error) {
    console.error('Error syncing contract:', error.message);
    process.exit(1);
  }
}

// Run the sync
syncContract();