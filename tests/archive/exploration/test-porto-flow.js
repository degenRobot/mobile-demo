#!/usr/bin/env node

/**
 * Main Porto Flow Test
 * Tests the complete Porto delegation and transaction flow
 */

import { formatEther } from 'viem';
import {
  CONFIG,
  TEST_ACCOUNTS,
  makeRelayCall,
  registerWithPorto,
  sendGaslessTransaction,
  checkTransactionStatus,
  hasPet,
  getPetStats,
  getBalance,
  encodeFrenPetCall
} from './lib/porto-utils.js';

async function testPortoFlow() {
  console.log('🎯 PORTO COMPLETE FLOW TEST');
  console.log('============================\n');
  
  const account = TEST_ACCOUNTS.MAIN;
  console.log('Test Account:', account.address);
  
  // Check initial state
  const initialBalance = await getBalance(account.address);
  const relayBalance = await getBalance(CONFIG.PORTO_RELAY_WALLET);
  const initialHasPet = await hasPet(account.address);
  
  console.log('User Balance:', formatEther(initialBalance), 'ETH');
  console.log('Relay Balance:', formatEther(relayBalance), 'ETH');
  console.log('Has Pet:', initialHasPet);
  
  // =====================================
  // STEP 1: Register with Porto
  // =====================================
  console.log('\n📝 Step 1: Registering with Porto...');
  try {
    await registerWithPorto(account);
    console.log('✅ Account registered');
  } catch (error) {
    console.log('⚠️  Registration failed (might already be registered):', error.message);
  }
  
  // =====================================
  // STEP 2: Send Transaction
  // =====================================
  console.log('\n📤 Step 2: Sending gasless transaction...');
  
  const petName = `TestPet_${Date.now()}`;
  const createPetData = encodeFrenPetCall('createPet', [petName]);
  
  const calls = [{
    to: CONFIG.FRENPET_ADDRESS,
    data: createPetData
    // No value field - non-payable function
  }];
  
  console.log('Creating pet:', petName);
  
  try {
    const bundleId = await sendGaslessTransaction(account, calls);
    console.log('✅ Transaction sent!');
    console.log('Bundle ID:', bundleId);
    
    // Wait for transaction
    console.log('\n⏳ Waiting for confirmation...');
    await new Promise(r => setTimeout(r, 5000));
    
    // Check status
    const status = await checkTransactionStatus(bundleId);
    console.log('Transaction status:', status.status);
    
    if (status.receipts && status.receipts.length > 0) {
      const receipt = status.receipts[0];
      console.log('\n📋 Receipt:');
      console.log('  Block:', parseInt(receipt.blockNumber, 16));
      console.log('  Status:', receipt.status === '0x1' ? 'Success' : 'Failed');
      console.log('  From:', receipt.from);
      console.log('  To:', receipt.to);
    }
    
  } catch (error) {
    console.log('❌ Transaction failed:', error.message);
    
    // If it's an insufficient funds error, explain the issue
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 This error occurs because:');
      console.log('1. Porto uses multiple signer wallets (rotating signers)');
      console.log('2. Not all signer wallets have sufficient funds');
      console.log('3. The relay needs slightly more than 0.001 ETH per transaction');
      console.log('\nSolution: Fund all relay signer wallets');
    }
  }
  
  // =====================================
  // STEP 3: Verify Result
  // =====================================
  console.log('\n🔍 Step 3: Verifying result...');
  
  const finalHasPet = await hasPet(account.address);
  console.log('Has Pet Now:', finalHasPet);
  
  if (finalHasPet && !initialHasPet) {
    console.log('✅ SUCCESS: Pet created!');
    
    const stats = await getPetStats(account.address);
    if (stats) {
      console.log('\n🐾 Pet Details:');
      console.log('  Name:', stats.name);
      console.log('  Level:', stats.level);
      console.log('  Happiness:', stats.happiness);
      console.log('  Hunger:', stats.hunger);
      console.log('  Is Alive:', stats.isAlive);
    }
  } else if (finalHasPet && initialHasPet) {
    console.log('⚠️  Pet already existed');
  } else {
    console.log('❌ Pet creation failed');
  }
  
  // Check if user spent any ETH
  const finalBalance = await getBalance(account.address);
  const spent = initialBalance - finalBalance;
  console.log('\n💰 Gas Cost:');
  console.log('  User spent:', formatEther(spent), 'ETH');
  console.log('  Gasless:', spent === 0n ? '✅ Yes' : '❌ No');
}

// Run test
testPortoFlow().catch(console.error);