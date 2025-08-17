#!/usr/bin/env node

/**
 * Check Porto Bundle Status and Debug Failed Transaction
 */

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const BUNDLE_ID = '0x163a0865e9b33bc6f8545a30a18a01c415d7e0f047deba978b575c83386be142';
const MAIN_WALLET = '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f';
const SESSION_KEY = '0x98cA791fa6fcB03c0Bb6BBFFDf5357754EA77495';

async function checkBundleStatus(bundleId) {
  console.log(`\n📦 Checking bundle status: ${bundleId}`);
  console.log('---');
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_getCallsStatus',
        params: [bundleId],
        id: 1
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Error: ${result.error.message}`);
      if (result.error.data) {
        console.log(`   Details: ${result.error.data}`);
      }
    } else if (result.result) {
      console.log('Bundle Status:', JSON.stringify(result.result, null, 2));
      
      // Analyze the status
      const status = result.result;
      if (status.status === 200 || status.status === 1) {
        console.log('✅ Transaction succeeded!');
      } else if (status.status >= 400) {
        console.log('❌ Transaction failed!');
        if (status.receipts && status.receipts[0]) {
          console.log('Receipt:', status.receipts[0]);
          if (status.receipts[0].revertReason) {
            console.log('Revert reason:', status.receipts[0].revertReason);
          }
        }
      } else {
        console.log('⏳ Transaction pending or unknown status:', status.status);
      }
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function testCorrectWallet() {
  console.log('\n🔑 Testing which wallet should be used with Porto');
  console.log('---');
  
  // Test with main wallet
  console.log('\n1. Testing with MAIN wallet:', MAIN_WALLET);
  
  const mainWalletRequest = {
    calls: [{
      to: '0x0000000000000000000000000000000000000000',
      data: '0x',
      value: '0x0'
    }],
    capabilities: {
      meta: {
        accounts: [MAIN_WALLET]  // Main wallet in accounts
      }
    },
    chainId: 11155931,
    from: MAIN_WALLET,  // Main wallet as from
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
        params: [mainWalletRequest],
        id: 2
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Main wallet error: ${result.error.message}`);
    } else {
      console.log(`✅ Main wallet works with Porto!`);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  // Test with session key
  console.log('\n2. Testing with SESSION key:', SESSION_KEY);
  
  const sessionKeyRequest = {
    calls: [{
      to: '0x0000000000000000000000000000000000000000',
      data: '0x',
      value: '0x0'
    }],
    capabilities: {
      meta: {
        accounts: [SESSION_KEY]  // Session key in accounts
      }
    },
    chainId: 11155931,
    from: SESSION_KEY,  // Session key as from
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
        params: [sessionKeyRequest],
        id: 3
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Session key error: ${result.error.message}`);
    } else {
      console.log(`✅ Session key works with Porto!`);
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
}

async function main() {
  console.log('🔍 Porto Transaction Debugging');
  console.log('==============================');
  console.log('Main Wallet:', MAIN_WALLET);
  console.log('Session Key:', SESSION_KEY);
  console.log('Bundle ID:', BUNDLE_ID);
  
  // Check bundle status
  await checkBundleStatus(BUNDLE_ID);
  
  // Test which wallet works
  await testCorrectWallet();
  
  console.log('\n==============================');
  console.log('📊 Analysis:');
  console.log('');
  console.log('The app is currently using the SESSION KEY with Porto.');
  console.log('This might be wrong if:');
  console.log('1. Porto expects the MAIN wallet to be delegated');
  console.log('2. The session key is not authorized to act on behalf of main wallet');
  console.log('');
  console.log('Solution:');
  console.log('- Use MAIN wallet for Porto transactions');
  console.log('- Or properly delegate session key permissions');
}

main().catch(console.error);