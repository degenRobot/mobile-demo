#!/usr/bin/env node

// Quick test for session key authorization
const PORTO_URL = 'https://rise-testnet-porto.fly.dev';

async function quickTest() {
  console.log('🚀 Quick Porto Session Key Test\n');
  
  // Test data
  const MAIN = '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f';
  const SESSION = '0x98cA791fa6fcB03c0Bb6BBFFDf5357754EA77495';
  const IMPL = '0x6b0f89e0627364a3348277353e3776dc8612853f';
  
  // Test 1: Upgrade with session key
  console.log('1. Testing account upgrade with session key...\n');
  
  const upgradeReq = {
    from: MAIN,
    delegate: IMPL,
    authorizeKeys: [
      { type: 'secp256k1', publicKey: MAIN, role: 'admin', prehash: false },
      { type: 'secp256k1', publicKey: SESSION, role: 'session', expiry: Math.floor(Date.now()/1000) + 86400, prehash: false }
    ],
    capabilities: {}
  };
  
  const res1 = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareUpgradeAccount',
      params: [upgradeReq],
      id: 1
    })
  });
  
  const result1 = await res1.json();
  if (result1.error) {
    console.log('❌ Upgrade error:', result1.error.message);
    if (result1.error.data) console.log('   Details:', result1.error.data);
  } else {
    console.log('✅ Upgrade prepared! Digest:', result1.result.digest);
  }
  
  // Test 2: Use session key for transaction
  console.log('\n2. Testing transaction with session key...\n');
  
  const txReq = {
    calls: [{ to: '0xfaf41c4e338d5f712e4aa221c654f764036f168a', data: '0x6d1c2997' + '000000000000000000000000' + MAIN.slice(2), value: '0x0' }],
    capabilities: { meta: { accounts: [SESSION] } },
    chainId: 11155931,
    from: SESSION,
    key: { type: 'secp256k1', publicKey: SESSION, prehash: false }
  };
  
  const res2 = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareCalls',
      params: [txReq],
      id: 2
    })
  });
  
  const result2 = await res2.json();
  if (result2.error) {
    console.log('❌ Session key error:', result2.error.message);
    console.log('   Session key needs authorization first!');
  } else {
    console.log('✅ Session key works! Digest:', result2.result.digest);
  }
  
  // Test 3: Compare with main wallet
  console.log('\n3. Testing with main wallet...\n');
  
  const mainReq = {
    calls: [{ to: '0xfaf41c4e338d5f712e4aa221c654f764036f168a', data: '0x6d1c2997' + '000000000000000000000000' + MAIN.slice(2), value: '0x0' }],
    capabilities: { meta: { accounts: [MAIN] } },
    chainId: 11155931,
    from: MAIN,
    key: { type: 'secp256k1', publicKey: MAIN, prehash: false }
  };
  
  const res3 = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareCalls',
      params: [mainReq],
      id: 3
    })
  });
  
  const result3 = await res3.json();
  if (result3.error) {
    console.log('❌ Main wallet error:', result3.error.message);
  } else {
    console.log('✅ Main wallet works! Digest:', result3.result.digest);
  }
  
  console.log('\n📊 Summary:');
  console.log('- Session key authorization: ' + (result1.error ? '❌ Failed' : '✅ Can prepare'));
  console.log('- Session key transaction: ' + (result2.error ? '❌ Failed' : '✅ Works'));
  console.log('- Main wallet transaction: ' + (result3.error ? '❌ Failed' : '✅ Works'));
  console.log('\nRecommendation: ' + (result3.error ? 'Fix main wallet delegation' : 'Use main wallet for now'));
}

quickTest().catch(console.error);