#!/usr/bin/env node

/**
 * Test Gas Usage for FrenPetSimple Contract
 * 
 * Measures actual gas consumption for createPet function
 * and tests optimizations
 */

import { createPublicClient, createWalletClient, http, parseEther, encodeFunctionData } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const RPC_URL = 'https://ethereum-sepolia-rpc.publicnode.com';

// Test account with funds
const TEST_PRIVATE_KEY = '0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80';

async function testGasUsage() {
  console.log('🔬 GAS USAGE TEST FOR FRENPET SIMPLE');
  console.log('=====================================\n');
  
  const account = privateKeyToAccount(TEST_PRIVATE_KEY);
  console.log('Test Account:', account.address);
  
  const publicClient = createPublicClient({
    chain: sepolia,
    transport: http(RPC_URL),
  });
  
  const walletClient = createWalletClient({
    account,
    chain: sepolia,
    transport: http(RPC_URL),
  });
  
  // Check account balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Account Balance:', (Number(balance) / 1e18).toFixed(4), 'ETH\n');
  
  // =====================================
  // Test 1: Estimate gas for createPet
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  Test 1: createPet Gas Estimation    ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const petName = `TestPet_${Date.now()}`;
  console.log('Pet Name:', petName);
  console.log('Name Length:', petName.length, 'characters');
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  console.log('Calldata size:', createPetCalldata.length, 'hex chars (', createPetCalldata.length / 2, 'bytes)');
  
  try {
    // Estimate gas
    const gasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: FRENPET_SIMPLE_ADDRESS,
      data: createPetCalldata,
      value: 0n
    });
    
    console.log('\n📊 Gas Estimation Results:');
    console.log('  Estimated Gas:', gasEstimate.toString());
    console.log('  Gas in Gwei:', (Number(gasEstimate) / 1e9).toFixed(9), 'Gwei');
    console.log('  Is under 100k:', gasEstimate < 100000n ? '✅ YES' : '❌ NO');
    
    // Calculate cost at different gas prices
    const gasPrices = [1n, 10n, 50n]; // in Gwei
    console.log('\n💰 Cost at different gas prices:');
    for (const price of gasPrices) {
      const cost = gasEstimate * price * 1000000000n; // Convert Gwei to Wei
      console.log(`  At ${price} Gwei: ${(Number(cost) / 1e18).toFixed(6)} ETH`);
    }
    
  } catch (error) {
    console.log('❌ Gas estimation failed:', error.message);
  }
  
  // =====================================
  // Test 2: Actual transaction execution
  // =====================================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Test 2: Actual Transaction           ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  try {
    console.log('Sending transaction...');
    
    const hash = await walletClient.sendTransaction({
      to: FRENPET_SIMPLE_ADDRESS,
      data: createPetCalldata,
      value: 0n,
      gas: 150000n, // Set a gas limit
    });
    
    console.log('Transaction Hash:', hash);
    console.log('Waiting for confirmation...');
    
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    
    console.log('\n✅ Transaction Confirmed!');
    console.log('  Block Number:', receipt.blockNumber.toString());
    console.log('  Gas Used:', receipt.gasUsed.toString());
    console.log('  Gas Used (Gwei):', (Number(receipt.gasUsed) / 1e9).toFixed(9));
    console.log('  Status:', receipt.status === 'success' ? '✅ Success' : '❌ Failed');
    console.log('  Is under 100k gas:', receipt.gasUsed < 100000n ? '✅ YES' : '❌ NO');
    
    if (receipt.gasUsed >= 100000n) {
      const excess = receipt.gasUsed - 100000n;
      console.log('  ⚠️  Exceeds limit by:', excess.toString(), 'gas units');
      console.log('  Need to reduce by:', ((Number(excess) / Number(receipt.gasUsed)) * 100).toFixed(1), '%');
    }
    
  } catch (error) {
    console.log('❌ Transaction failed:', error.message);
  }
  
  // =====================================
  // Test 3: Test with shorter name
  // =====================================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Test 3: Shorter Name Gas Test       ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const shortName = 'Pet';
  console.log('Testing with short name:', shortName);
  console.log('Name Length:', shortName.length, 'characters');
  
  const shortNameCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [shortName]
  });
  
  try {
    const shortGasEstimate = await publicClient.estimateGas({
      account: account.address,
      to: FRENPET_SIMPLE_ADDRESS,
      data: shortNameCalldata,
      value: 0n
    });
    
    console.log('\n📊 Short Name Gas Results:');
    console.log('  Estimated Gas:', shortGasEstimate.toString());
    console.log('  Is under 100k:', shortGasEstimate < 100000n ? '✅ YES' : '❌ NO');
    
    // Compare with long name
    if (typeof gasEstimate !== 'undefined') {
      const difference = Number(gasEstimate) - Number(shortGasEstimate);
      console.log('  Gas saved with shorter name:', difference, 'units');
      console.log('  Percentage saved:', ((difference / Number(gasEstimate)) * 100).toFixed(1), '%');
    }
    
  } catch (error) {
    console.log('❌ Short name gas estimation failed:', error.message);
  }
  
  // =====================================
  // Analysis & Recommendations
  // =====================================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  Analysis & Recommendations          ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('📝 Current Gas Usage Issues:');
  console.log('  1. Large struct initialization in createPet');
  console.log('  2. Multiple storage writes (pet struct + hasPet mapping)');
  console.log('  3. Conditional logic checking for existing pets');
  console.log('  4. String storage for pet names');
  
  console.log('\n💡 Optimization Suggestions:');
  console.log('  1. Pack struct variables more efficiently');
  console.log('  2. Use uint128/uint64 for timestamps instead of uint256');
  console.log('  3. Combine bool flags into a single uint8 bitmap');
  console.log('  4. Remove redundant hasPet mapping (check name.length instead)');
  console.log('  5. Simplify or remove dead pet checking in createPet');
  console.log('  6. Use events for some data instead of storage');
}

// Run test
testGasUsage().catch(console.error);