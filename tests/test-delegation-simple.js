#!/usr/bin/env node

/**
 * Simple test to understand Porto delegation
 * Run with: node test-delegation-simple.js
 */

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';

async function testPortoMethods() {
  console.log('🔍 Testing Porto Delegation Methods');
  console.log('====================================\n');
  
  const tests = [
    {
      name: 'wallet_prepareUpgradeAccount',
      params: [{
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
        delegate: '0x6b0f89e0627364a3348277353e3776dc8612853f',
        capabilities: {}
      }]
    },
    {
      name: 'wallet_upgradeAccount',
      params: []
    },
    {
      name: 'wallet_prepareCalls (non-delegated)',
      params: [{
        calls: [{
          to: '0x0000000000000000000000000000000000000000',
          data: '0x',
          value: '0x0'
        }],
        capabilities: {},
        chainId: 11155931,
        from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
        key: {
          type: 'secp256k1',
          publicKey: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
          prehash: false
        }
      }]
    }
  ];

  for (const test of tests) {
    console.log(`Testing: ${test.name}`);
    console.log('Params:', JSON.stringify(test.params, null, 2));
    
    try {
      const response = await fetch(PORTO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: test.name.split(' ')[0],
          params: test.params,
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
        console.log(`✅ Success!`);
        if (test.name.includes('prepareCalls')) {
          console.log('   Porto accepts non-delegated accounts!');
          console.log('   Delegation likely happens automatically.');
        }
      }
    } catch (error) {
      console.log(`❌ Network error: ${error.message}`);
    }
    
    console.log('---\n');
  }
  
  console.log('Summary:');
  console.log('========');
  console.log('If wallet_prepareUpgradeAccount fails but wallet_prepareCalls works,');
  console.log('it means Porto handles delegation automatically when sending transactions.');
  console.log('No explicit upgrade is needed!\n');
  console.log('The app should just send transactions normally and Porto will handle it.');
}

testPortoMethods().catch(console.error);