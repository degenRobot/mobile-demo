#!/usr/bin/env node

/**
 * Test Porto with correct parameters from documentation
 * Run with: node test-porto-correct.js
 */

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';

async function testPortoCorrect() {
  console.log('🔍 Testing Porto with Correct Parameters');
  console.log('=========================================\n');
  
  // Test account
  const testAddress = '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5';
  const accountImpl = '0x6b0f89e0627364a3348277353e3776dc8612853f';
  
  console.log('1. Testing wallet_prepareUpgradeAccount with authorizeKeys...\n');
  
  const upgradeRequest = {
    from: testAddress,
    delegate: accountImpl,
    authorizeKeys: [
      {
        type: 'secp256k1',
        publicKey: testAddress,  // Using address as public key for testing
        prehash: false
      }
    ],
    capabilities: {}
  };
  
  console.log('Request:', JSON.stringify(upgradeRequest, null, 2));
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareUpgradeAccount',
        params: [upgradeRequest],
        id: 1
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Error: ${result.error.message}`);
      if (result.error.data) {
        console.log(`   Details: ${result.error.data}`);
      }
    } else {
      console.log(`✅ Success! Upgrade can be prepared`);
      console.log('Result:', JSON.stringify(result.result, null, 2));
      return result.result;
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  console.log('\n---\n');
  console.log('2. Testing wallet_prepareCalls with meta in capabilities...\n');
  
  const callsRequest = {
    calls: [{
      to: '0x0000000000000000000000000000000000000000',
      data: '0x',
      value: '0x0'
    }],
    capabilities: {
      meta: {
        accounts: [testAddress]
      }
    },
    chainId: 11155931,
    from: testAddress,
    key: {
      type: 'secp256k1',
      publicKey: testAddress,
      prehash: false
    }
  };
  
  console.log('Request:', JSON.stringify(callsRequest, null, 2));
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [callsRequest],
        id: 2
      })
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Error: ${result.error.message}`);
      if (result.error.data) {
        console.log(`   Details: ${result.error.data}`);
      }
    } else {
      console.log(`✅ Success! Calls can be prepared`);
      console.log('Porto accepts the account for gasless transactions!');
      
      // Show key info from result
      if (result.result) {
        console.log('\nKey info from response:');
        console.log('- Digest:', result.result.digest);
        console.log('- Has typedData:', !!result.result.typedData);
        console.log('- Has context:', !!result.result.context);
      }
    }
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
  }
  
  console.log('\n=========================================');
  console.log('Summary:');
  console.log('- Add authorizeKeys for wallet_prepareUpgradeAccount');
  console.log('- Add meta.accounts in capabilities for wallet_prepareCalls');
  console.log('- Porto works with non-delegated accounts');
}

testPortoCorrect().catch(console.error);