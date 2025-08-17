#!/usr/bin/env node

/**
 * Test Session Key Authorization with Porto
 * 
 * This tests the proper flow:
 * 1. Upgrade account with session key authorization
 * 2. Use session key for transactions
 */

const crypto = require('crypto');

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const MAIN_WALLET = '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f';
const SESSION_KEY = '0x98cA791fa6fcB03c0Bb6BBFFDf5357754EA77495';
const ACCOUNT_IMPL = '0x6b0f89e0627364a3348277353e3776dc8612853f';
const FRENPET_ADDRESS = '0xfaf41c4e338d5f712e4aa221c654f764036f168a';

console.log('🔑 Testing Session Key Authorization');
console.log('=====================================\n');
console.log('Main Wallet:', MAIN_WALLET);
console.log('Session Key:', SESSION_KEY);
console.log('');

/**
 * Test 1: Prepare upgrade with session key authorization
 */
async function testUpgradeWithSessionKey() {
  console.log('1️⃣ Testing wallet_prepareUpgradeAccount with session key...\n');
  
  const sessionKeyExpiry = Math.floor(Date.now() / 1000) + (24 * 60 * 60); // 24 hours from now
  
  const request = {
    from: MAIN_WALLET,
    delegate: ACCOUNT_IMPL,
    authorizeKeys: [
      {
        type: 'secp256k1',
        publicKey: MAIN_WALLET,  // Main wallet key (admin)
        role: 'admin',
        prehash: false
      },
      {
        type: 'secp256k1',
        publicKey: SESSION_KEY,   // Session key (session role)
        role: 'session',
        expiry: sessionKeyExpiry,
        prehash: false
      }
    ],
    capabilities: {}
  };
  
  console.log('Request:', JSON.stringify(request, null, 2));
  console.log('');
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareUpgradeAccount',
        params: [request],
        id: 1
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Error: ${result.error.message}`);
      if (result.error.data) {
        console.log(`   Details: ${result.error.data}`);
      }
      return null;
    } else {
      console.log(`✅ Upgrade prepared with session key authorization!`);
      console.log('Digest:', result.result.digest);
      console.log('');
      
      // Show what needs to be signed
      if (result.result.typedData) {
        console.log('TypedData for signing:');
        console.log('- Domain:', JSON.stringify(result.result.typedData.domain));
        console.log('- Message:', JSON.stringify(result.result.typedData.message));
      }
      
      return result.result;
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return null;
  }
}

/**
 * Test 2: Use session key for transaction
 */
async function testSessionKeyTransaction() {
  console.log('\n2️⃣ Testing transaction with SESSION KEY...\n');
  
  // Simple transaction data (getPetStats view function)
  const data = '0x' + 
    '6d1c2997' + // getPetStats function selector
    '000000000000000000000000' + MAIN_WALLET.slice(2).toLowerCase(); // address parameter
  
  const request = {
    calls: [{
      to: FRENPET_ADDRESS,
      data: data,
      value: '0x0'
    }],
    capabilities: {
      meta: {
        accounts: [SESSION_KEY]  // Using session key
      }
    },
    chainId: 11155931,
    from: SESSION_KEY,  // From session key
    key: {
      type: 'secp256k1',
      publicKey: SESSION_KEY,
      prehash: false
    }
  };
  
  console.log('Using SESSION KEY for transaction');
  console.log('Call to:', FRENPET_ADDRESS);
  console.log('Function: getPetStats(' + MAIN_WALLET + ')');
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
    } else {
      console.log(`✅ Session key can prepare transaction!`);
      console.log('Digest:', result.result.digest);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

/**
 * Test 3: Compare main wallet vs session key
 */
async function testBothWallets() {
  console.log('\n3️⃣ Comparing MAIN vs SESSION for transactions...\n');
  
  // Test data - createPet function
  const data = '0x' + 
    '7065cb48' + // createPet function selector
    '0000000000000000000000000000000000000000000000000000000000000020' + // string offset
    '0000000000000000000000000000000000000000000000000000000000000007' + // string length (7)
    '54657374506574000000000000000000000000000000000000000000000000'; // "TestPet" padded
  
  // Test with MAIN wallet
  console.log('Testing with MAIN wallet...');
  const mainRequest = {
    calls: [{
      to: FRENPET_ADDRESS,
      data: data,
      value: '0x0'
    }],
    capabilities: {
      meta: {
        accounts: [MAIN_WALLET]
      }
    },
    chainId: 11155931,
    from: MAIN_WALLET,
    key: {
      type: 'secp256k1',
      publicKey: MAIN_WALLET,
      prehash: false
    }
  };
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [mainRequest],
        id: 3
      })
    });

    const result = await response.json();
    if (result.error) {
      console.log(`❌ Main wallet: ${result.error.message}`);
    } else {
      console.log(`✅ Main wallet works!`);
      console.log('   Digest:', result.result.digest);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  // Test with SESSION key
  console.log('\nTesting with SESSION key...');
  const sessionRequest = {
    calls: [{
      to: FRENPET_ADDRESS,
      data: data,
      value: '0x0'
    }],
    capabilities: {
      meta: {
        accounts: [SESSION_KEY]
      }
    },
    chainId: 11155931,
    from: SESSION_KEY,
    key: {
      type: 'secp256k1',
      publicKey: SESSION_KEY,
      prehash: false
    }
  };
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [sessionRequest],
        id: 4
      })
    });

    const result = await response.json();
    if (result.error) {
      console.log(`❌ Session key: ${result.error.message}`);
    } else {
      console.log(`✅ Session key works!`);
      console.log('   Digest:', result.result.digest);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

/**
 * Test 4: Debug exact data format
 */
async function debugDataFormat() {
  console.log('\n4️⃣ Debugging exact data format...\n');
  
  // Show exactly what the mobile app should send
  const exampleCall = {
    to: FRENPET_ADDRESS,
    data: '0x7065cb48' + // createPet selector
          '0000000000000000000000000000000000000000000000000000000000000020' +
          '0000000000000000000000000000000000000000000000000000000000000006' +
          '466c7566667900000000000000000000000000000000000000000000000000', // "Fluffy"
    value: '0x0'
  };
  
  console.log('Example createPet("Fluffy") call:');
  console.log(JSON.stringify(exampleCall, null, 2));
  console.log('');
  
  // Show feed pet with value
  const feedCall = {
    to: FRENPET_ADDRESS,
    data: '0x8e2a6e5d', // feedPet selector
    value: '0x38d7ea4c68000' // 0.001 RISE
  };
  
  console.log('Example feedPet() call with 0.001 RISE:');
  console.log(JSON.stringify(feedCall, null, 2));
}

/**
 * Main test runner
 */
async function main() {
  // Test upgrade with session key
  const upgradeResult = await testUpgradeWithSessionKey();
  
  // Test using session key
  await testSessionKeyTransaction();
  
  // Compare both wallets
  await testBothWallets();
  
  // Debug data format
  await debugDataFormat();
  
  console.log('\n=====================================');
  console.log('📊 Analysis:\n');
  
  console.log('Key Findings:');
  console.log('1. Session keys need to be authorized during account upgrade');
  console.log('2. Use "role": "session" and set expiry for session keys');
  console.log('3. After authorization, session key can sign transactions');
  console.log('4. Both main wallet and authorized session key should work');
  console.log('');
  console.log('Next Steps:');
  console.log('1. Upgrade account with session key authorization');
  console.log('2. Use session key for all transactions');
  console.log('3. Main wallet stays secure, only used for upgrade');
}

main().catch(console.error);