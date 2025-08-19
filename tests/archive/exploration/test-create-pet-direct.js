#!/usr/bin/env node

/**
 * Test createPet function directly to verify contract works
 */

import { createPublicClient, createWalletClient, http, encodeFunctionData, decodeFunctionResult } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const RPC_URL = 'https://testnet.riselabs.xyz';

// Use a test private key (this account needs some ETH)
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'; // Test key from anvil
const account = privateKeyToAccount(TEST_PRIVATE_KEY);

async function testCreatePetDirect() {
  console.log('🧪 TESTING CREATEPET DIRECTLY');
  console.log('==============================\n');
  
  const publicClient = createPublicClient({
    transport: http(RPC_URL)
  });
  
  const walletClient = createWalletClient({
    account,
    transport: http(RPC_URL)
  });
  
  console.log('📝 Test Configuration:');
  console.log('  Contract:', FRENPET_ADDRESS);
  console.log('  Test account:', account.address);
  console.log('  RPC:', RPC_URL);
  console.log('');
  
  // Check account balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('💰 Account balance:', balance.toString(), 'wei');
  
  if (balance === 0n) {
    console.log('  ⚠️  Account needs ETH to pay for gas');
    console.log('  Fund this address:', account.address);
    return;
  }
  
  // Check if account already has a pet
  console.log('\n🐾 Checking current pet status...');
  try {
    const hasPet = await publicClient.readContract({
      address: FRENPET_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [account.address]
    });
    
    console.log('  Has pet:', hasPet ? 'Yes' : 'No');
    
    if (hasPet) {
      const pet = await publicClient.readContract({
        address: FRENPET_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'pets',
        args: [account.address]
      });
      
      console.log('  Pet name:', pet[0]);
      console.log('  ⚠️  Account already has a pet. Cannot create another.');
      return;
    }
  } catch (error) {
    console.log('  Error checking pet:', error.message);
  }
  
  // Estimate gas for createPet
  console.log('\n⛽ Estimating gas for createPet...');
  const petName = `DirectTestPet_${Date.now()}`;
  
  const calldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  console.log('  Pet name:', petName);
  console.log('  Calldata:', calldata);
  
  try {
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: FRENPET_ADDRESS,
      data: calldata
    });
    
    console.log('  Estimated gas:', gasEstimate.toString());
    
    // Simulate the transaction
    console.log('\n🔮 Simulating transaction...');
    const result = await publicClient.simulateContract({
      address: FRENPET_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'createPet',
      args: [petName],
      account: account.address
    });
    
    console.log('  Simulation result:', result);
    
    // Send the actual transaction
    console.log('\n📤 Sending transaction...');
    const hash = await walletClient.writeContract({
      address: FRENPET_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'createPet',
      args: [petName]
    });
    
    console.log('  Transaction hash:', hash);
    console.log('  Waiting for confirmation...');
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    console.log('  Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');
    console.log('  Gas used:', receipt.gasUsed.toString());
    
    // Verify pet was created
    console.log('\n🐾 Verifying pet creation...');
    const hasPetAfter = await publicClient.readContract({
      address: FRENPET_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [account.address]
    });
    
    console.log('  Has pet now:', hasPetAfter ? '✅ YES!' : '❌ NO');
    
    if (hasPetAfter) {
      const newPet = await publicClient.readContract({
        address: FRENPET_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'pets',
        args: [account.address]
      });
      
      console.log('  Pet name:', newPet[0]);
      console.log('  Pet level:', newPet[1].toString());
    }
    
  } catch (error) {
    console.log('\n❌ Error:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('  💡 Account needs more ETH for gas');
    } else if (error.message.includes('execution reverted')) {
      console.log('  💡 Contract rejected the transaction');
      console.log('  Possible reasons:');
      console.log('    - Account already has a pet');
      console.log('    - Name is empty');
      console.log('    - Contract has other restrictions');
    }
  }
  
  console.log('\n📊 Summary:');
  console.log('  This test verifies if the FrenPetSimple contract works correctly');
  console.log('  If successful, the issue is with Porto delegation, not the contract');
}

// Run the test
testCreatePetDirect().catch(console.error);