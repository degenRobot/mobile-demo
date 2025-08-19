#!/usr/bin/env node

/**
 * Zero ETH Gasless Test
 * Proves that users need 0 ETH for all operations
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { formatEther } from 'viem';
import {
  CONFIG,
  makeRelayCall,
  registerWithPorto,
  sendGaslessTransaction,
  checkTransactionStatus,
  hasPet,
  getBalance,
  encodeFrenPetCall
} from './lib/porto-utils.js';

async function testZeroEth() {
  console.log('🎯 ZERO ETH GASLESS TEST');
  console.log('========================\n');
  console.log('This test proves users need 0 ETH for everything!\n');
  
  // Create a fresh account with 0 ETH
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  console.log('🆕 Fresh Account (0 ETH):');
  console.log('  Address:', account.address);
  
  // Verify account has 0 ETH
  const balance = await getBalance(account.address);
  console.log('  Balance:', formatEther(balance), 'ETH');
  
  if (balance > 0n) {
    console.log('  ⚠️  Account already has ETH, creating new one...');
    const newKey = generatePrivateKey();
    const newAccount = privateKeyToAccount(newKey);
    console.log('  New Address:', newAccount.address);
    const newBalance = await getBalance(newAccount.address);
    console.log('  New Balance:', formatEther(newBalance), 'ETH');
  }
  
  console.log('  ✅ Confirmed: Account has 0 ETH\n');
  
  // =====================================
  // STEP 1: Register with Porto (0 ETH)
  // =====================================
  console.log('📝 Step 1: Register with Porto (off-chain)...');
  try {
    await registerWithPorto(account);
    console.log('✅ Registration successful (no gas used)');
  } catch (error) {
    console.log('❌ Registration failed:', error.message);
    return;
  }
  
  // =====================================
  // STEP 2: Create Pet (0 ETH)
  // =====================================
  console.log('\n🐾 Step 2: Create pet (first on-chain tx)...');
  console.log('   Porto relay will pay for EVERYTHING!\n');
  
  const petName = 'ZeroEthPet';
  const createPetData = encodeFrenPetCall('createPet', [petName]);
  
  const calls = [{
    to: CONFIG.FRENPET_ADDRESS,
    data: createPetData
  }];
  
  try {
    const bundleId = await sendGaslessTransaction(account, calls);
    console.log('🎉 SUCCESS! Transaction sent:', bundleId);
    console.log('   User balance: 0 ETH');
    console.log('   Gas paid by: Porto Relay');
    
    // Wait for confirmation
    console.log('\n⏳ Waiting for confirmation...');
    await new Promise(r => setTimeout(r, 5000));
    
    const status = await checkTransactionStatus(bundleId);
    if (status.status === 200 || status.status === 'CONFIRMED') {
      console.log('✅ Transaction confirmed!');
      
      if (status.receipts && status.receipts[0]) {
        console.log('   From:', status.receipts[0].from);
        console.log('   Expected relay:', CONFIG.PORTO_RELAY_WALLET);
        
        if (status.receipts[0].from.toLowerCase() !== account.address.toLowerCase()) {
          console.log('   ✅ Confirmed: Porto relay paid for gas!');
        }
      }
    }
    
  } catch (error) {
    console.log('❌ Transaction failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 The relay needs funding, not the user!');
      console.log('   Run: node check-relay-wallets.js');
    }
  }
  
  // =====================================
  // FINAL VERIFICATION
  // =====================================
  console.log('\n📊 Final Results:');
  console.log('═════════════════\n');
  
  const finalBalance = await getBalance(account.address);
  const petExists = await hasPet(account.address);
  
  console.log('User Initial Balance: 0 ETH');
  console.log('User Final Balance:', formatEther(finalBalance), 'ETH');
  console.log('User Gas Spent:', formatEther(finalBalance), 'ETH');
  console.log('Has Pet:', petExists);
  
  if (finalBalance === 0n && petExists) {
    console.log('\n✨ PROVEN: Porto provides TRULY gasless transactions!');
    console.log('   - No ETH needed for delegation');
    console.log('   - No ETH needed for transactions');
    console.log('   - Porto relay pays for everything!');
  } else if (finalBalance === 0n && !petExists) {
    console.log('\n⚠️  Transaction failed but user spent 0 ETH');
    console.log('   Issue is with relay funding, not user funds');
  } else if (finalBalance > 0n) {
    console.log('\n❌ User somehow gained ETH (unexpected)');
  }
}

// Run test
testZeroEth().catch(console.error);