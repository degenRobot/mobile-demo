#!/usr/bin/env node

/**
 * Simple delegation test - methodically test wallet_prepareUpgradeAccount
 * and verify delegation with a zero transfer
 */

const { privateKeyToAccount, generatePrivateKey } = require('viem/accounts');
const { createPublicClient, http, parseEther } = require('viem');

// Configuration - Must match deployed Porto relay config!
const RPC_URL = 'https://testnet.riselabs.xyz';
const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const CHAIN_ID = 11155931;
const PORTO_ACCOUNT_IMPL = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9'; // From relay.toml

const publicClient = createPublicClient({
  transport: http(RPC_URL),
});

async function checkAccountCode(address) {
  const code = await publicClient.getBytecode({ address });
  const hasCode = code && code !== '0x' && code !== null;
  console.log(`[Check] Account ${address}`);
  console.log(`[Check] Has code: ${hasCode}`);
  if (hasCode && code) {
    console.log(`[Check] Code length: ${code.length} chars`);
    console.log(`[Check] Code preview: ${code.substring(0, 10)}...`);
  }
  return hasCode;
}

async function testDelegationFormat(name, params) {
  console.log(`\n[Test ${name}]`);
  console.log('Request:', JSON.stringify(params, null, 2));
  
  try {
    const response = await fetch(PORTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        jsonrpc: '2.0',
        method: 'wallet_prepareUpgradeAccount',
        params: [params],
        id: Date.now(),
      }),
    });

    const result = await response.json();
    
    if (result.error) {
      console.log(`❌ Error: ${result.error.message}`);
      if (result.error.data) {
        console.log(`   Details: ${result.error.data}`);
      }
      return null;
    }
    
    console.log(`✅ Success!`);
    if (result.result) {
      console.log('Response keys:', Object.keys(result.result));
      if (result.result.digests) {
        console.log('Digests:', result.result.digests);
      }
    }
    return result.result;
  } catch (error) {
    console.log(`❌ Network error: ${error.message}`);
    return null;
  }
}

async function sendZeroTransfer(account) {
  console.log('\n[Zero Transfer] Sending 0 ETH to self...');
  
  // Prepare a simple zero transfer to self
  const request = {
    calls: [{
      to: account.address, // Send to self
      value: '0x0', // Zero value
      data: '0x', // No data
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

  console.log('[Zero Transfer] Preparing...');
  
  const prepareResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareCalls',
      params: [request],
      id: Date.now(),
    }),
  });

  const prepareResult = await prepareResponse.json();
  
  if (prepareResult.error) {
    console.error('[Zero Transfer] Prepare error:', prepareResult.error.message);
    return null;
  }

  console.log('[Zero Transfer] Signing...');
  
  // Sign the typed data
  const typedData = prepareResult.result.typedData;
  const domain = {
    ...typedData.domain,
    chainId: typeof typedData.domain.chainId === 'string' 
      ? parseInt(typedData.domain.chainId, 16)
      : typedData.domain.chainId,
  };

  const signature = await account.signTypedData({
    domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  });

  console.log('[Zero Transfer] Sending...');

  const sendResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_sendPreparedCalls',
      params: [{
        context: prepareResult.result.context,
        key: prepareResult.result.key,
        signature,
      }],
      id: Date.now(),
    }),
  });

  const sendResult = await sendResponse.json();
  
  if (sendResult.error) {
    console.error('[Zero Transfer] Send error:', sendResult.error.message);
    return null;
  }

  const bundleId = sendResult.result.id || sendResult.result;
  console.log('[Zero Transfer] Bundle ID:', bundleId);
  
  // Wait for confirmation
  console.log('[Zero Transfer] Waiting 5 seconds...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check status
  const statusResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_getCallsStatus',
      params: [bundleId],
      id: Date.now(),
    }),
  });

  const statusResult = await statusResponse.json();
  
  if (statusResult.error) {
    console.error('[Zero Transfer] Status error:', statusResult.error.message);
    return { bundleId, success: false };
  }

  const status = statusResult.result;
  const receipt = status.receipts?.[0];
  
  if (receipt) {
    console.log('[Zero Transfer] TX Hash:', receipt.transactionHash);
    console.log('[Zero Transfer] Status:', receipt.status === '0x1' ? 'Success' : 'Failed');
    
    // Check for delegation error
    if (receipt.logs) {
      for (const log of receipt.logs) {
        if (log.data && log.data.includes('fbcb0b34')) {
          console.log('[Zero Transfer] ⚠️ Error 0xfbcb0b34 (not delegated)');
          return { hash: receipt.transactionHash, success: false, delegationError: true };
        }
      }
    }
    
    return { hash: receipt.transactionHash, success: receipt.status === '0x1' };
  }
  
  return { bundleId, success: false };
}

async function main() {
  console.log('=== Simple Porto Delegation Test ===');
  console.log('Testing wallet_prepareUpgradeAccount formats');
  console.log('Porto URL:', PORTO_URL);
  console.log('Chain ID:', CHAIN_ID);
  
  // Generate fresh account
  console.log('\n--- Generate Fresh Account ---');
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  console.log('Account:', account.address);
  console.log('Private Key:', privateKey);
  
  // Check initial state
  console.log('\n--- Initial State ---');
  const initialHasCode = await checkAccountCode(account.address);
  
  // Test different formats
  console.log('\n--- Testing Delegation Formats ---');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  const formats = [
    {
      name: 'Correct format with hex expiry',
      params: {
        address: account.address,
        delegation: PORTO_ACCOUNT_IMPL,
        capabilities: {
          authorizeKeys: [{
            expiry: expiryHex, // MUST be hex string!
            prehash: false,
            publicKey: account.address,
            role: 'admin',
            type: 'secp256k1',
            permissions: []
          }]
        },
        chainId: CHAIN_ID
      }
    },
    {
      name: 'WRONG format with integer expiry (will fail)',
      params: {
        address: account.address,
        delegation: PORTO_ACCOUNT_IMPL,
        capabilities: {
          authorizeKeys: [{
            expiry: expiry, // This will fail - needs to be hex!
            prehash: false,
            publicKey: account.address,
            role: 'admin',
            type: 'secp256k1',
            permissions: []
          }]
        },
        chainId: CHAIN_ID
      }
    },
    {
      name: 'With hex chainId and hex expiry',
      params: {
        address: account.address,
        delegation: PORTO_ACCOUNT_IMPL,
        capabilities: {
          authorizeKeys: [{
            expiry: expiryHex, // Also uses hex expiry
            prehash: false,
            publicKey: account.address,
            role: 'admin',
            type: 'secp256k1',
            permissions: []
          }]
        },
        chainId: `0x${CHAIN_ID.toString(16)}`
      }
    }
  ];

  let successfulFormat = null;
  
  for (const format of formats) {
    const result = await testDelegationFormat(format.name, format.params);
    if (result) {
      successfulFormat = { name: format.name, result };
      break;
    }
  }
  
  if (successfulFormat) {
    console.log(`\n✅ Format "${successfulFormat.name}" worked!`);
    
    // TODO: Sign and execute the delegation
    console.log('\n[Note] Would need to sign and execute wallet_upgradeAccount here');
    console.log('Digests:', successfulFormat.result.digests);
  } else {
    console.log('\n❌ No format worked for wallet_prepareUpgradeAccount');
  }
  
  // Test zero transfer regardless
  console.log('\n--- Testing Zero Transfer ---');
  const txResult = await sendZeroTransfer(account);
  
  if (txResult) {
    if (txResult.success) {
      console.log('✅ Zero transfer successful!');
    } else if (txResult.delegationError) {
      console.log('❌ Zero transfer failed with delegation error (expected)');
    } else {
      console.log('❌ Zero transfer failed');
    }
    
    if (txResult.hash) {
      console.log('Transaction hash:', txResult.hash);
    }
  }
  
  // Check final state
  console.log('\n--- Final State ---');
  const finalHasCode = await checkAccountCode(account.address);
  
  // Summary
  console.log('\n=== Summary ===');
  console.log('Account:', account.address);
  console.log('Initial has code:', initialHasCode);
  console.log('Final has code:', finalHasCode);
  console.log('Delegation API worked:', successfulFormat ? '✅' : '❌');
  console.log('Zero transfer sent:', txResult ? '✅' : '❌');
  console.log('Zero transfer success:', txResult?.success ? '✅' : '❌');
  console.log('Delegation error in TX:', txResult?.delegationError ? '✅' : '❌');
  
  if (finalHasCode && !initialHasCode) {
    console.log('\n🎉 SUCCESS: Account was delegated!');
  } else if (!finalHasCode && txResult?.delegationError) {
    console.log('\n📝 As expected: Account not delegated, transactions fail with 0xfbcb0b34');
  }
}

// Run the test
main().catch(console.error);
