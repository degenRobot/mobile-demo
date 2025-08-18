#!/usr/bin/env node

/**
 * Trace a transaction to debug what's happening
 */

const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { createPublicClient, http } = require('viem');

const RPC_URL = 'https://testnet.riselabs.xyz';
const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const CHAIN_ID = 11155931;
const PORTO_ACCOUNT_IMPL = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9';

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

async function runAndTrace() {
  console.log('=== Transaction Trace Test ===\n');
  
  // Use a specific test account
  const privateKey = '0x' + 'a'.repeat(64); // Deterministic key for testing
  const account = privateKeyToAccount(privateKey);
  
  console.log('Test account:', account.address);
  
  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Balance:', (Number(balance) / 1e18).toFixed(6), 'ETH');
  
  // Check relay wallet that should be paying
  const relayAddress = '0x584B5274765a7F7C78FDc960248f38e5Ad6b1EDb';
  const relayBalance = await publicClient.getBalance({ address: relayAddress });
  console.log('\nRelay wallet:', relayAddress);
  console.log('Relay balance:', (Number(relayBalance) / 1e18).toFixed(6), 'ETH');
  
  console.log('\n--- Preparing Delegation ---');
  
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
  
  console.log('✅ Prepare successful');
  
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
  const upgradeResponse = await fetch(PORTO_URL, {
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
  
  const upgradeResult = await upgradeResponse.json();
  console.log('✅ Delegation stored');
  
  console.log('\n--- Preparing Transaction ---');
  
  // Simple transfer to self
  const callParams = {
    calls: [{
      to: account.address,
      data: '0x',
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
      id: 3,
    }),
  });
  
  const callResult = await callResponse.json();
  if (callResult.error) {
    console.error('Prepare calls failed:', callResult.error);
    return;
  }
  
  console.log('✅ Transaction prepared');
  console.log('\nTransaction context:');
  console.log('- Has quote:', !!callResult.result.context?.quote);
  if (callResult.result.context?.quote) {
    console.log('- Quote intent:', callResult.result.context.quote.quote?.intent?.substring(0, 20) + '...');
  }
  
  // Sign transaction
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
  
  console.log('\n--- Sending Transaction ---');
  console.log('Sending with signature:', txSig.substring(0, 20) + '...');
  
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
      id: 4,
    }),
  });
  
  const sendResult = await sendResponse.json();
  
  if (sendResult.error) {
    console.error('\n❌ Send failed!');
    console.error('Error code:', sendResult.error.code);
    console.error('Error message:', sendResult.error.message);
    if (sendResult.error.data) {
      console.error('Error data:', sendResult.error.data);
      
      // Parse the error to understand which account needs funds
      if (sendResult.error.data.includes('have') && sendResult.error.data.includes('want')) {
        const match = sendResult.error.data.match(/have (\d+) want (\d+)/);
        if (match) {
          const have = BigInt(match[1]);
          const want = BigInt(match[2]);
          console.error('\nFunding analysis:');
          console.error('- Has:', (Number(have) / 1e18).toFixed(6), 'ETH');
          console.error('- Needs:', (Number(want) / 1e18).toFixed(6), 'ETH');
          console.error('- Deficit:', (Number(want - have) / 1e18).toFixed(6), 'ETH');
        }
      }
    }
    return;
  }
  
  console.log('✅ Transaction sent!');
  console.log('Bundle ID:', sendResult.result.id || sendResult.result);
  
  // Wait and check status
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  const statusResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_getCallsStatus',
      params: [sendResult.result.id || sendResult.result],
      id: 5,
    }),
  });
  
  const statusResult = await statusResponse.json();
  
  if (statusResult.result?.receipts?.[0]) {
    const receipt = statusResult.result.receipts[0];
    console.log('\n--- Transaction Receipt ---');
    console.log('TX Hash:', receipt.transactionHash);
    console.log('Status:', receipt.status === '0x1' ? 'Success' : 'Failed');
    console.log('Block:', receipt.blockNumber);
    console.log('Gas Used:', receipt.gasUsed);
    
    // Use cast to trace
    console.log('\n--- Tracing with Foundry ---');
    console.log('Run this command to trace:');
    console.log(`cast run ${receipt.transactionHash} --rpc-url ${RPC_URL}`);
  }
}

runAndTrace().catch(console.error);