#!/usr/bin/env node

/**
 * Test Complete Porto Flow
 * This simulates what the mobile app should do
 */

const { encodeFunctionData, parseEther, toHex } = require('viem');

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const MAIN_WALLET = '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f';
const SESSION_KEY = '0x98cA791fa6fcB03c0Bb6BBFFDf5357754EA77495'; 
const FRENPET_ADDRESS = '0xfaf41c4e338d5f712e4aa221c654f764036f168a';

// FrenPet ABI
const FRENPET_ABI = [
  {
    name: 'createPet',
    type: 'function',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable'
  },
  {
    name: 'feedPet',
    type: 'function',
    inputs: [],
    outputs: [],
    stateMutability: 'payable'
  }
];

console.log('🎯 Testing Complete Porto Flow');
console.log('==============================\n');

/**
 * Option 1: Use MAIN wallet directly
 */
async function useMainWallet() {
  console.log('Option 1️⃣: Using MAIN WALLET directly\n');
  console.log('Main Wallet:', MAIN_WALLET);
  console.log('');
  
  // Encode createPet function
  const data = encodeFunctionData({
    abi: FRENPET_ABI,
    functionName: 'createPet',
    args: ['Fluffy']
  });
  
  const request = {
    calls: [{
      to: FRENPET_ADDRESS,
      data: data,
      value: '0x0'
    }],
    capabilities: {
      meta: {
        accounts: [MAIN_WALLET]  // Main wallet in accounts
      }
    },
    chainId: 11155931,
    from: MAIN_WALLET,  // From main wallet
    key: {
      type: 'secp256k1',
      publicKey: MAIN_WALLET,  // Main wallet public key
      prehash: false
    }
  };
  
  console.log('Request:', JSON.stringify(request, null, 2));
  console.log('');
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [request],
        id: 1
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Main wallet error: ${result.error.message}`);
      if (result.error.data) {
        console.log(`   Details: ${result.error.data}`);
      }
    } else {
      console.log(`✅ Main wallet can prepare transaction!`);
      console.log('   Digest:', result.result.digest);
      
      // In mobile app, you would:
      // 1. Sign this with main wallet's private key
      // 2. Send via wallet_sendPreparedCalls
      
      console.log('\n   Next steps in app:');
      console.log('   1. Sign typedData with main wallet');
      console.log('   2. Call wallet_sendPreparedCalls');
      console.log('   3. Monitor status with wallet_getCallsStatus');
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

/**
 * Option 2: Use SESSION key (if authorized)
 */
async function useSessionKey() {
  console.log('\n\nOption 2️⃣: Using SESSION KEY (if authorized)\n');
  console.log('Session Key:', SESSION_KEY);
  console.log('');
  
  // Encode feedPet function
  const data = encodeFunctionData({
    abi: FRENPET_ABI,
    functionName: 'feedPet',
    args: []
  });
  
  const value = toHex(parseEther('0.001')); // 0.001 RISE
  
  const request = {
    calls: [{
      to: FRENPET_ADDRESS,
      data: data,
      value: value
    }],
    capabilities: {
      meta: {
        accounts: [SESSION_KEY]  // Session key in accounts
      }
    },
    chainId: 11155931,
    from: SESSION_KEY,  // From session key
    key: {
      type: 'secp256k1',
      publicKey: SESSION_KEY,  // Session key public key
      prehash: false
    }
  };
  
  console.log('Request:', JSON.stringify(request, null, 2));
  console.log('');
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [request],
        id: 2
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Session key error: ${result.error.message}`);
      if (result.error.data) {
        console.log(`   Details: ${result.error.data}`);
      }
      console.log('\n   ⚠️  Session key might not be authorized!');
      console.log('   Need to upgrade account with session key authorization first.');
    } else {
      console.log(`✅ Session key can prepare transaction!`);
      console.log('   Digest:', result.result.digest);
      console.log('\n   Session key is authorized and working!');
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

/**
 * Check current status
 */
async function checkCurrentStatus() {
  console.log('\n\n📊 Current Status Check\n');
  
  // Check a recent bundle
  const bundleId = '0x163a0865e9b33bc6f8545a30a18a01c415d7e0f047deba978b575c83386be142';
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_getCallsStatus',
        params: [bundleId],
        id: 3
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`Bundle status error: ${result.error.message}`);
    } else if (result.result) {
      console.log('Recent bundle status:', result.result);
      
      if (result.result.status >= 400) {
        console.log('\n❌ Transaction failed!');
        if (result.result.receipts && result.result.receipts[0]) {
          const receipt = result.result.receipts[0];
          if (receipt.revertReason) {
            console.log('Revert reason:', receipt.revertReason);
          }
          if (receipt.logs) {
            console.log('Logs:', receipt.logs);
          }
        }
      }
    }
  } catch (error) {
    console.log(`Network error: ${error.message}`);
  }
}

/**
 * Main flow
 */
async function main() {
  // Test main wallet
  await useMainWallet();
  
  // Test session key
  await useSessionKey();
  
  // Check status
  await checkCurrentStatus();
  
  console.log('\n\n==============================');
  console.log('📋 Mobile App Should:\n');
  
  console.log('EITHER:');
  console.log('1. Use MAIN wallet for all Porto transactions');
  console.log('   - Simple, works immediately');
  console.log('   - Main wallet needs to have been delegated');
  console.log('');
  console.log('OR:');
  console.log('2. Authorize SESSION key during account upgrade');
  console.log('   - More secure (main key stays protected)');
  console.log('   - Requires upgrade with authorizeKeys');
  console.log('   - Then use session key for all transactions');
  console.log('');
  console.log('Current Issue:');
  console.log('- App was using session key WITHOUT authorization');
  console.log('- Need to either use main wallet OR authorize session key');
}

main().catch(console.error);