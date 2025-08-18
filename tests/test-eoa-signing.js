#!/usr/bin/env node

/**
 * Test gasless transactions with EOA signing all transactions
 */

const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { encodeFunctionData } = require('viem');

const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const CHAIN_ID = 11155931;
const PORTO_ACCOUNT_IMPL = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9';
const FRENPET_CONTRACT = '0xD10D1b6b4AD34192c5F2398451CE2d3C1a685E75';

// Simple ABI for testing
const FRENPET_ABI = [
  {
    name: 'createPet',
    type: 'function',
    inputs: [{ name: 'name', type: 'string' }],
    outputs: [],
  },
  {
    name: 'feedPet',
    type: 'function',
    inputs: [],
    outputs: [],
  },
  {
    name: 'playWithPet',
    type: 'function',
    inputs: [],
    outputs: [],
  },
];

async function testEOASigning() {
  console.log('=== Test: EOA Signs All Transactions ===\n');
  
  // Generate fresh accounts
  const eoaPrivateKey = generatePrivateKey();
  const eoaAccount = privateKeyToAccount(eoaPrivateKey);
  
  console.log('EOA Address:', eoaAccount.address);
  console.log('Note: EOA needs 0.001 ETH for initial delegation');
  console.log('');
  
  // Step 1: Delegate with only EOA key
  console.log('Step 1: Delegating with EOA key only...');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  const prepareParams = {
    address: eoaAccount.address,
    delegation: PORTO_ACCOUNT_IMPL,
    capabilities: {
      authorizeKeys: [{
        expiry: expiryHex,
        prehash: false,
        publicKey: eoaAccount.address,
        role: 'admin',  // EOA gets admin role
        type: 'secp256k1',
        permissions: []
      }]
    },
    chainId: CHAIN_ID
  };
  
  console.log('Authorized keys:', prepareParams.capabilities.authorizeKeys.length);
  console.log('- EOA as admin');
  
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
  
  // Sign with EOA
  const authSig = await eoaAccount.signMessage({
    message: { raw: prepareResult.result.digests.auth }
  });
  
  const domain = {
    ...prepareResult.result.typedData.domain,
    chainId: typeof prepareResult.result.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResult.result.typedData.domain.chainId, 16)
      : prepareResult.result.typedData.domain.chainId,
  };
  
  const execSig = await eoaAccount.signTypedData({
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
  
  // Execute multiple transactions, all signed by EOA
  const transactions = [
    { name: 'createPet', args: ['TestPet_' + Date.now()] },
    { name: 'feedPet', args: [] },
    { name: 'playWithPet', args: [] },
  ];
  
  for (let i = 0; i < transactions.length; i++) {
    const tx = transactions[i];
    console.log(`\nStep ${i + 2}: Transaction #${i + 1} - ${tx.name}`);
    console.log('Signing with: EOA');
    
    const data = encodeFunctionData({
      abi: FRENPET_ABI,
      functionName: tx.name,
      args: tx.args,
    });
    
    const callParams = {
      calls: [{
        to: FRENPET_CONTRACT,
        data,
        value: '0x0',
      }],
      capabilities: {
        meta: {
          accounts: [eoaAccount.address],
        },
      },
      chainId: CHAIN_ID,
      from: eoaAccount.address,
      key: {
        type: 'secp256k1',
        publicKey: eoaAccount.address,  // Using EOA public key
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
    
    // Sign with EOA
    const txDomain = {
      ...callResult.result.typedData.domain,
      chainId: typeof callResult.result.typedData.domain.chainId === 'string' 
        ? parseInt(callResult.result.typedData.domain.chainId, 16)
        : callResult.result.typedData.domain.chainId,
    };
    
    const txSig = await eoaAccount.signTypedData({
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
      console.error(`❌ Transaction failed:`, sendResult.error.message);
      if (sendResult.error.data?.includes('insufficient funds')) {
        console.error('   -> Still requiring user funds for gas!');
        // Parse funding needs
        const match = sendResult.error.data.match(/have (\d+) want (\d+)/);
        if (match) {
          const have = BigInt(match[1]);
          const want = BigInt(match[2]);
          console.error(`   -> Have: ${(Number(have) / 1e18).toFixed(6)} ETH`);
          console.error(`   -> Need: ${(Number(want) / 1e18).toFixed(6)} ETH`);
        }
      }
    } else {
      console.log(`✅ Transaction sent:`, sendResult.result.id || sendResult.result);
    }
    
    // Wait between transactions
    if (i < transactions.length - 1) {
      console.log('⏳ Waiting 15 seconds...');
      await new Promise(resolve => setTimeout(resolve, 15000));
    }
  }
  
  console.log('\n=== Test Complete ===');
  console.log('Summary: All transactions signed with EOA private key');
}

testEOASigning().catch(console.error);