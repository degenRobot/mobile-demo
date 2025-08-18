#!/usr/bin/env node

/**
 * Simple test to verify gasless transactions work after delegation
 */

const { privateKeyToAccount } = require('viem/accounts');

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const CHAIN_ID = 11155931;
const PORTO_ACCOUNT_IMPL = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9';

async function testGaslessTransactions() {
  console.log('=== Testing Gasless Transactions ===\n');
  
  // Use a deterministic key for testing
  const privateKey = '0x' + 'b'.repeat(64);
  const account = privateKeyToAccount(privateKey);
  
  console.log('Test account:', account.address);
  console.log('This account should have 0.001 ETH for initial delegation');
  console.log('');
  
  // First, delegate the account
  console.log('Step 1: Delegating account to Porto...');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  const prepareParams = {
    address: account.address,
    delegation: PORTO_ACCOUNT_IMPL,
    capabilities: {
      authorizeKeys: [{
        expiry: expiryHex,
        prehash: false,
        publicKey: account.address,
        role: 'admin',
        type: 'secp256k1',
        permissions: []
      }]
    },
    chainId: CHAIN_ID
  };
  
  const prepareResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareUpgradeAccount',
      params: [prepareParams],
      id: 1,
    }),
  });
  
  const prepareResult = await prepareResponse.json();
  if (prepareResult.error) {
    console.error('Prepare failed:', prepareResult.error);
    return;
  }
  
  // Sign
  const authSig = await account.signMessage({
    message: { raw: prepareResult.result.digests.auth }
  });
  
  const domain = {
    ...prepareResult.result.typedData.domain,
    chainId: typeof prepareResult.result.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResult.result.typedData.domain.chainId, 16)
      : prepareResult.result.typedData.domain.chainId,
  };
  
  const execSig = await account.signTypedData({
    domain,
    types: prepareResult.result.typedData.types,
    primaryType: prepareResult.result.typedData.primaryType,
    message: prepareResult.result.typedData.message,
  });
  
  // Store delegation
  await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_upgradeAccount',
      params: [{
        context: prepareResult.result.context,
        signatures: {
          auth: authSig,
          exec: execSig
        }
      }],
      id: 2,
    }),
  });
  
  console.log('✅ Delegation stored\n');
  
  // Now try multiple transactions
  for (let i = 1; i <= 3; i++) {
    console.log(`Step ${i + 1}: Transaction #${i}`);
    
    const callParams = {
      calls: [{
        to: account.address,
        data: '0x' + i.toString(16).padStart(64, '0'), // Different data each time
        value: '0x0',
      }],
      capabilities: {
        meta: {
          accounts: [account.address],
        },
      },
      chainId: CHAIN_ID,
      from: account.address,
      key: {
        type: 'secp256k1',
        publicKey: account.address,
        prehash: false,
      },
    };
    
    const callResponse = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareCalls',
        params: [callParams],
        id: 10 + i,
      }),
    });
    
    const callResult = await callResponse.json();
    if (callResult.error) {
      console.error(`❌ Prepare failed:`, callResult.error);
      continue;
    }
    
    // Sign
    const txDomain = {
      ...callResult.result.typedData.domain,
      chainId: typeof callResult.result.typedData.domain.chainId === 'string' 
        ? parseInt(callResult.result.typedData.domain.chainId, 16)
        : callResult.result.typedData.domain.chainId,
    };
    
    const txSig = await account.signTypedData({
      domain: txDomain,
      types: callResult.result.typedData.types,
      primaryType: callResult.result.typedData.primaryType,
      message: callResult.result.typedData.message,
    });
    
    // Send
    const sendResponse = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_sendPreparedCalls',
        params: [{
          context: callResult.result.context,
          key: callResult.result.key,
          signature: txSig,
        }],
        id: 20 + i,
      }),
    });
    
    const sendResult = await sendResponse.json();
    
    if (sendResult.error) {
      console.error(`❌ Transaction ${i} failed:`, sendResult.error.message);
      if (sendResult.error.data?.includes('insufficient funds')) {
        console.error('   -> Still requiring user funds!');
      }
    } else {
      console.log(`✅ Transaction ${i} sent:`, sendResult.result.id || sendResult.result);
    }
    
    // Wait between transactions
    if (i < 3) {
      console.log('   Waiting 15 seconds...\n');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
  
  console.log('\n=== Test Complete ===');
}

testGaslessTransactions().catch(console.error);
