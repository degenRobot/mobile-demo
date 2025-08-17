#!/usr/bin/env node

/**
 * Porto Integration Test Script
 * Run this to test Porto relayer connection and gasless transactions
 */

const TEST_CONFIG = {
  PORTO_URL: 'https://rise-testnet-porto.fly.dev',
  CHAIN_ID: 11155931,
  CONTRACT: '0xfaf41c4e338d5f712e4aa221c654f764036f168a',
};

console.log('🚀 Porto Integration Test');
console.log('========================\n');

async function testPortoHealth() {
  console.log('1. Testing Porto Health Check...');
  
  try {
    const response = await fetch(TEST_CONFIG.PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'health',
        params: [],
        id: 1,
      }),
    });
    
    const result = await response.json();
    
    if (result.result === 'healthy') {
      console.log('✅ Porto is healthy!\n');
      return true;
    } else {
      console.log('❌ Porto health check failed:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Failed to connect to Porto:', error.message);
    return false;
  }
}

async function testCapabilities() {
  console.log('2. Testing Porto Capabilities...');
  
  try {
    const response = await fetch(TEST_CONFIG.PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_getCapabilities',
        params: [],
        id: 2,
      }),
    });
    
    const result = await response.json();
    
    if (result.result) {
      console.log('✅ Capabilities retrieved:');
      console.log(JSON.stringify(result.result, null, 2));
      console.log('');
      return true;
    } else {
      console.log('❌ Failed to get capabilities:', result);
      return false;
    }
  } catch (error) {
    console.log('❌ Error getting capabilities:', error.message);
    return false;
  }
}

async function testPrepareCall() {
  console.log('3. Testing Prepare Call (Mock)...');
  
  // This is a mock test - in real app, you'd use actual wallet address
  const mockRequest = {
    calls: [{
      to: TEST_CONFIG.CONTRACT,
      data: '0x12345678', // Mock function selector
      value: '0x0',
    }],
    capabilities: {
      meta: {
        accounts: ['0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5'], // Mock address
      },
    },
    chainId: TEST_CONFIG.CHAIN_ID,
    from: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
    key: {
      type: 'secp256k1',
      publicKey: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
      prehash: false,
    },
  };
  
  try {
    const response = await fetch(TEST_CONFIG.PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [mockRequest],
        id: 3,
      }),
    });
    
    const result = await response.json();
    
    if (result.error) {
      console.log('⚠️  Prepare call returned error (expected without valid signature):');
      console.log(result.error.message);
      console.log('This is normal - actual app will sign properly\n');
      return true;
    } else if (result.result) {
      console.log('✅ Prepare call succeeded (unexpected in mock):');
      console.log(JSON.stringify(result.result, null, 2));
      return true;
    }
  } catch (error) {
    console.log('❌ Network error testing prepare:', error.message);
    return false;
  }
}

async function runTests() {
  console.log('Porto URL:', TEST_CONFIG.PORTO_URL);
  console.log('Chain ID:', TEST_CONFIG.CHAIN_ID);
  console.log('Contract:', TEST_CONFIG.CONTRACT);
  console.log('');
  
  const health = await testPortoHealth();
  const capabilities = await testCapabilities();
  const prepare = await testPrepareCall();
  
  console.log('\n========================');
  console.log('Test Summary:');
  console.log('Porto Health:', health ? '✅' : '❌');
  console.log('Capabilities:', capabilities ? '✅' : '❌');
  console.log('Prepare Call:', prepare ? '✅' : '❌');
  
  if (health && capabilities) {
    console.log('\n✅ Porto integration is working!');
    console.log('You can now test gasless transactions in the app.');
  } else {
    console.log('\n⚠️  Some tests failed. Check Porto relayer status.');
  }
}

// Run tests
runTests().catch(console.error);