#!/usr/bin/env node

/**
 * Enhanced Porto Flow Test
 * Tests the complete Porto delegation and transaction flow with detailed logging
 * 
 * Flow according to Porto documentation:
 * 1. wallet_prepareUpgradeAccount - Prepare delegation
 * 2. wallet_upgradeAccount - Store delegation with Porto
 * 3. wallet_prepareCalls - Prepare transaction
 * 4. wallet_sendPreparedCalls - Send transaction
 */

import { formatEther } from 'viem';
import {
  CONFIG,
  TEST_ACCOUNTS,
  makeRelayCall,
  registerWithPortoEnhanced,
  sendGaslessTransactionEnhanced,
  hasPet,
  getPetStats,
  getBalance,
  encodeFrenPetCall,
  inspectResponse,
  saveToJson
} from './lib/porto-utils-enhanced.js';

async function testPortoFlowEnhanced() {
  console.log('🎯 ENHANCED PORTO FLOW TEST');
  console.log('============================');
  console.log('Following exact Porto documentation flow\n');
  
  const account = TEST_ACCOUNTS.MAIN;
  const testName = 'porto_flow_test';
  
  // Options for detailed logging and JSON saving
  const options = {
    verbose: true,      // Show detailed logs
    saveJson: true,     // Save outputs to JSON
    testName,           // Name for JSON files
    checkStatus: true   // Check transaction status
  };
  
  console.log('Test Configuration:');
  console.log('  Account:', account.address);
  console.log('  Porto URL:', CONFIG.PORTO_URL);
  console.log('  Chain ID:', CONFIG.CHAIN_ID);
  console.log('  FrenPet Contract:', CONFIG.FRENPET_ADDRESS);
  console.log('  Verbose Logging: ON');
  console.log('  JSON Output: ON\n');
  
  // Check initial state
  const initialBalance = await getBalance(account.address);
  const relayBalance = await getBalance(CONFIG.PORTO_RELAY_WALLET);
  const initialHasPet = await hasPet(account.address);
  
  console.log('📊 INITIAL STATE:');
  console.log('  User Balance:', formatEther(initialBalance), 'ETH');
  console.log('  Relay Balance:', formatEther(relayBalance), 'ETH');
  console.log('  Has Pet:', initialHasPet);
  
  // Save initial state
  saveToJson(`${testName}_initial_state`, {
    userAddress: account.address,
    userBalance: formatEther(initialBalance),
    relayBalance: formatEther(relayBalance),
    hasPet: initialHasPet,
    timestamp: new Date().toISOString()
  });
  
  // =====================================
  // PHASE 1: ACCOUNT DELEGATION
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   PHASE 1: ACCOUNT DELEGATION        ║');
  console.log('╚══════════════════════════════════════╝');
  
  let registrationResult;
  try {
    registrationResult = await registerWithPortoEnhanced(account, options);
    console.log('\n✅ Account delegation completed');
    
    // Save registration results
    saveToJson(`${testName}_registration_complete`, {
      success: registrationResult.success,
      prepareResponse: registrationResult.prepareResponse,
      upgradeResponse: registrationResult.upgradeResponse,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.log('\n⚠️  Registration failed (might already be registered):', error.message);
    // Continue anyway as account might already be registered
  }
  
  // =====================================
  // PHASE 2: SEND TRANSACTION
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   PHASE 2: SEND TRANSACTION          ║');
  console.log('╚══════════════════════════════════════╝');
  
  const petName = `TestPet_${Date.now()}`;
  console.log('\n🐾 Creating pet:', petName);
  
  const createPetData = encodeFrenPetCall('createPet', [petName]);
  const calls = [{
    to: CONFIG.FRENPET_ADDRESS,
    data: createPetData
    // NO value field - non-payable function
  }];
  
  console.log('\n📝 Transaction Details:');
  console.log('  To:', calls[0].to);
  console.log('  Function: createPet(string)');
  console.log('  Args:', [petName]);
  console.log('  Value: undefined (non-payable)');
  console.log('  Data:', createPetData.substring(0, 10) + '...');
  
  let transactionResult;
  try {
    transactionResult = await sendGaslessTransactionEnhanced(account, calls, options);
    console.log('\n✅ Transaction sent successfully!');
    
    // Save transaction results
    saveToJson(`${testName}_transaction_complete`, {
      success: transactionResult.success,
      bundleId: transactionResult.bundleId,
      prepareResponse: transactionResult.prepareResponse,
      sendResponse: transactionResult.sendResponse,
      statusResponse: transactionResult.statusResponse,
      timestamp: new Date().toISOString()
    });
    
    // Analyze the transaction
    if (transactionResult.statusResponse) {
      const status = transactionResult.statusResponse.status;
      const receipts = transactionResult.statusResponse.receipts;
      
      console.log('\n📊 TRANSACTION ANALYSIS:');
      console.log('  Status:', status);
      
      if (receipts && receipts.length > 0) {
        const receipt = receipts[0];
        console.log('  Transaction Hash:', receipt.transactionHash);
        console.log('  Block Number:', parseInt(receipt.blockNumber, 16));
        console.log('  Gas Used:', parseInt(receipt.gasUsed, 16));
        console.log('  Success:', receipt.status === '0x1' ? 'YES' : 'NO');
        console.log('  From:', receipt.from);
        console.log('  To:', receipt.to);
        
        // Check if transaction went to orchestrator
        if (receipt.to.toLowerCase() === CONFIG.PORTO_ORCHESTRATOR.toLowerCase()) {
          console.log('  ✅ Transaction went through Porto orchestrator');
        } else if (receipt.to.toLowerCase() === CONFIG.FRENPET_ADDRESS.toLowerCase()) {
          console.log('  ✅ Transaction went directly to FrenPet');
        } else {
          console.log('  ⚠️  Transaction went to unexpected address');
        }
      }
    }
    
  } catch (error) {
    console.log('\n❌ Transaction failed:', error.message);
    
    // Save error details
    saveToJson(`${testName}_transaction_error`, {
      error: error.message,
      calls,
      timestamp: new Date().toISOString()
    });
    
    // Analyze the error
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 INSUFFICIENT FUNDS ANALYSIS:');
      console.log('  This error means the Porto relay signers need funding');
      console.log('  Run: node check-relay-wallets.js');
      console.log('  Fund the wallets shown as insufficient');
    }
  }
  
  // =====================================
  // PHASE 3: VERIFY RESULT
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   PHASE 3: VERIFY RESULT             ║');
  console.log('╚══════════════════════════════════════╝');
  
  // Wait a bit more for blockchain confirmation
  console.log('\n⏳ Waiting for blockchain confirmation...');
  await new Promise(r => setTimeout(r, 3000));
  
  const finalHasPet = await hasPet(account.address);
  const finalBalance = await getBalance(account.address);
  const spent = initialBalance - finalBalance;
  
  console.log('\n📊 FINAL STATE:');
  console.log('  Has Pet Now:', finalHasPet);
  console.log('  User Balance:', formatEther(finalBalance), 'ETH');
  console.log('  Gas Spent:', formatEther(spent), 'ETH');
  
  // Save final state
  saveToJson(`${testName}_final_state`, {
    userAddress: account.address,
    userBalance: formatEther(finalBalance),
    hasPet: finalHasPet,
    gasSpent: formatEther(spent),
    timestamp: new Date().toISOString()
  });
  
  if (finalHasPet && !initialHasPet) {
    console.log('\n✨ SUCCESS: Pet created!');
    
    const stats = await getPetStats(account.address);
    if (stats) {
      console.log('\n🐾 Pet Details:');
      console.log('  Name:', stats.name);
      console.log('  Level:', stats.level);
      console.log('  Happiness:', stats.happiness);
      console.log('  Hunger:', stats.hunger);
      console.log('  Is Alive:', stats.isAlive);
      
      saveToJson(`${testName}_pet_stats`, {
        ...stats,
        owner: account.address,
        timestamp: new Date().toISOString()
      });
    }
  } else if (finalHasPet && initialHasPet) {
    console.log('\n⚠️  Pet already existed');
  } else {
    console.log('\n❌ Pet creation failed');
    
    // Diagnostic information
    console.log('\n🔍 DIAGNOSTIC INFORMATION:');
    console.log('  1. Check if transaction only executed delegation (not the actual call)');
    console.log('  2. Porto may need two transactions:');
    console.log('     - First: Sets up delegation');
    console.log('     - Second: Executes actual call');
    console.log('  3. Check output JSON files in ./output/ for detailed analysis');
  }
  
  // =====================================
  // SUMMARY
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║           TEST SUMMARY                ║');
  console.log('╚══════════════════════════════════════╝');
  
  console.log('\n📊 Results:');
  console.log('  Pet Creation:', finalHasPet && !initialHasPet ? '✅ Success' : '❌ Failed');
  console.log('  Gasless:', spent === 0n ? '✅ Yes (0 ETH spent)' : `⚠️  No (${formatEther(spent)} ETH spent)`);
  console.log('  JSON Outputs: Saved to ./output/');
  
  console.log('\n📁 Output Files Generated:');
  console.log('  - Initial state');
  console.log('  - Registration responses');
  console.log('  - Transaction responses');
  console.log('  - Final state');
  if (finalHasPet) {
    console.log('  - Pet statistics');
  }
  
  console.log('\n💡 Next Steps:');
  console.log('  1. Review JSON files in ./output/ for detailed analysis');
  console.log('  2. Check relay wallet balances: node check-relay-wallets.js');
  console.log('  3. If failed, try running again (first tx might be delegation only)');
}

// Run test
testPortoFlowEnhanced().catch(console.error);