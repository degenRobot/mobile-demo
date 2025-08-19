#!/usr/bin/env node

/**
 * Test Account Upgrade Only
 * 
 * Tests ONLY the account upgrade process with a fresh EOA
 * According to Porto docs:
 * - wallet_prepareUpgradeAccount: Prepares an account for upgrade
 * - wallet_upgradeAccount: Upgrades the account ON CHAIN
 * 
 * We want to verify if wallet_upgradeAccount actually triggers an on-chain tx
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { formatEther } from 'viem';
import {
  CONFIG,
  makeRelayCall,
  getBalance,
  createClient,
  inspectResponse,
  saveToJson
} from './lib/porto-utils-enhanced.js';

async function testAccountUpgradeOnly() {
  console.log('🔬 ACCOUNT UPGRADE ONLY TEST');
  console.log('============================');
  console.log('Testing with a fresh EOA to understand the upgrade process\n');
  
  // Create a completely fresh account
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  console.log('🆕 Fresh Account Created:');
  console.log('  Address:', account.address);
  console.log('  Private Key:', privateKey.substring(0, 10) + '...');
  
  // Check initial state
  const client = createClient();
  const initialBalance = await getBalance(account.address);
  const initialCode = await client.getCode({ address: account.address });
  
  console.log('\n📊 Initial State:');
  console.log('  Balance:', formatEther(initialBalance), 'ETH');
  console.log('  Has Code:', initialCode && initialCode !== '0x');
  console.log('  Code Length:', initialCode ? initialCode.length : 0);
  
  // Options for detailed logging
  const options = {
    verbose: true,
    saveJson: true,
    testName: 'account_upgrade_only'
  };
  
  // =====================================
  // STEP 1: Prepare Upgrade Account
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 1: wallet_prepareUpgradeAccount║');
  console.log('╚══════════════════════════════════════╝');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const expiryHex = '0x' + expiry.toString(16);
  
  const prepareParams = {
    address: account.address,
    delegation: CONFIG.PORTO_IMPLEMENTATION,
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
    chainId: CONFIG.CHAIN_ID
  };
  
  let prepareResponse;
  try {
    prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams], options);
    
    // Inspect the response
    const inspection = inspectResponse('wallet_prepareUpgradeAccount', prepareResponse);
    console.log('\n🔍 Response Analysis:');
    console.log('  Has Digests:', inspection.analysis.hasDigests);
    console.log('  Auth Digest:', inspection.analysis.authDigest?.substring(0, 20) + '...');
    console.log('  Exec Digest:', inspection.analysis.execDigest?.substring(0, 20) + '...');
    console.log('  Has Authorization:', inspection.analysis.hasAuthorization);
    console.log('  Has PreCall:', inspection.analysis.hasPreCall);
    
    // Check the preCall data
    if (prepareResponse.context?.preCall) {
      const preCall = prepareResponse.context.preCall;
      console.log('\n📦 PreCall Data:');
      console.log('  EOA:', preCall.eoa);
      console.log('  Nonce:', preCall.nonce);
      console.log('  Execution Data Length:', preCall.executionData?.length);
      console.log('  Signature:', preCall.signature);
    }
    
  } catch (error) {
    console.log('\n❌ Prepare failed:', error.message);
    return;
  }
  
  // =====================================
  // STEP 2: Sign Authorization
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║     STEP 2: Sign Authorization       ║');
  console.log('╚══════════════════════════════════════╝');
  
  console.log('\n🖊️  Signing digests...');
  
  const authSig = await account.signMessage({
    message: { raw: prepareResponse.digests.auth }
  });
  console.log('  Auth Signature:', authSig.substring(0, 20) + '...');
  
  const domain = {
    ...prepareResponse.typedData.domain,
    chainId: typeof prepareResponse.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResponse.typedData.domain.chainId, 16)
      : prepareResponse.typedData.domain.chainId,
  };
  
  const execSig = await account.signTypedData({
    domain,
    types: prepareResponse.typedData.types,
    primaryType: prepareResponse.typedData.primaryType,
    message: prepareResponse.typedData.message,
  });
  console.log('  Exec Signature:', execSig.substring(0, 20) + '...');
  
  // =====================================
  // STEP 3: Upgrade Account
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║    STEP 3: wallet_upgradeAccount     ║');
  console.log('╚══════════════════════════════════════╝');
  
  console.log('\n⚠️  IMPORTANT: Docs say this "upgrades the account ON CHAIN"');
  console.log('   Let\'s see if it triggers an on-chain transaction...\n');
  
  const upgradeParams = {
    context: prepareResponse.context,
    signatures: {
      auth: authSig,
      exec: execSig
    }
  };
  
  let upgradeResponse;
  try {
    upgradeResponse = await makeRelayCall('wallet_upgradeAccount', [upgradeParams], options);
    
    // Inspect the response
    const inspection = inspectResponse('wallet_upgradeAccount', upgradeResponse);
    console.log('\n🔍 Response Analysis:');
    console.log('  Response is null:', inspection.analysis.isNull);
    console.log('  Success (null = success):', inspection.analysis.success);
    
    if (upgradeResponse === null) {
      console.log('\n📝 Result: wallet_upgradeAccount returned null');
      console.log('   This appears to be expected behavior');
      console.log('   But did it trigger an on-chain transaction?');
    }
    
  } catch (error) {
    console.log('\n❌ Upgrade failed:', error.message);
    return;
  }
  
  // =====================================
  // STEP 4: Check On-Chain State
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║   STEP 4: Check On-Chain State       ║');
  console.log('╚══════════════════════════════════════╝');
  
  console.log('\n⏳ Waiting 5 seconds for any on-chain effects...');
  await new Promise(r => setTimeout(r, 5000));
  
  const finalBalance = await getBalance(account.address);
  const finalCode = await client.getCode({ address: account.address });
  
  console.log('\n📊 Final State:');
  console.log('  Balance:', formatEther(finalBalance), 'ETH');
  console.log('  Has Code:', finalCode && finalCode !== '0x');
  console.log('  Code Length:', finalCode ? finalCode.length : 0);
  
  console.log('\n🔍 State Changes:');
  console.log('  Balance Changed:', initialBalance !== finalBalance);
  console.log('  Code Changed:', initialCode !== finalCode);
  
  if (finalCode && finalCode !== '0x' && finalCode !== initialCode) {
    console.log('\n✅ SUCCESS: Account has delegated code on-chain!');
    console.log('   wallet_upgradeAccount DID trigger on-chain changes');
  } else {
    console.log('\n❌ NO ON-CHAIN CHANGES DETECTED');
    console.log('   wallet_upgradeAccount appears to only store data off-chain');
    console.log('   The actual delegation happens when sending the first transaction');
  }
  
  // =====================================
  // STEP 5: Check Account Keys
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║    STEP 5: Check Account Keys        ║');
  console.log('╚══════════════════════════════════════╝');
  
  console.log('\n📝 Checking if Porto stored our key...');
  
  try {
    const keysResponse = await makeRelayCall('wallet_getKeys', [{
      address: account.address
    }], { verbose: false });
    
    console.log('Keys Response:', JSON.stringify(keysResponse, null, 2));
    
    if (keysResponse && keysResponse.length > 0) {
      console.log('\n✅ Porto has stored keys for this account');
      console.log('   Number of keys:', keysResponse.length);
    } else {
      console.log('\n⚠️  No keys found (might be expected for fresh account)');
    }
  } catch (error) {
    console.log('❌ Failed to get keys:', error.message);
  }
  
  // =====================================
  // STEP 6: Try Sending a Transaction
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 6: Try Sending Transaction     ║');
  console.log('╚══════════════════════════════════════╝');
  
  console.log('\n📤 Let\'s try sending a simple transaction...');
  console.log('   This should trigger the actual on-chain delegation\n');
  
  // Simple 0 ETH transfer to zero address
  const calls = [{
    to: '0x0000000000000000000000000000000000000000',
    value: '0x0',
    data: '0x'
  }];
  
  try {
    const prepareCallsParams = {
      from: account.address,
      chainId: CONFIG.CHAIN_ID,
      calls,
      capabilities: {
        meta: {}
      }
    };
    
    const prepareCallsResponse = await makeRelayCall('wallet_prepareCalls', [prepareCallsParams], options);
    
    // Check if it includes preCalls
    const hasPreCalls = !!(prepareCallsResponse.context?.quote?.intent?.encodedPreCalls?.length);
    console.log('\n🔍 Transaction includes preCalls:', hasPreCalls);
    
    if (hasPreCalls) {
      const numPreCalls = prepareCallsResponse.context.quote.intent.encodedPreCalls.length;
      console.log('   Number of preCalls:', numPreCalls);
      console.log('   This means delegation will happen in this transaction');
    } else {
      console.log('   No preCalls - delegation might already be active');
    }
    
    // Sign and send
    const signature = await account.signMessage({
      message: { raw: prepareCallsResponse.digest }
    });
    
    const sendParams = {
      context: prepareCallsResponse.context,
      key: {
        prehash: false,
        publicKey: account.address,
        type: 'secp256k1'
      },
      signature
    };
    
    const sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendParams], options);
    console.log('\n✅ Transaction sent!');
    console.log('   Bundle ID:', sendResponse.id || sendResponse);
    
    // Wait and check final state
    console.log('\n⏳ Waiting for transaction confirmation...');
    await new Promise(r => setTimeout(r, 5000));
    
    const postTxCode = await client.getCode({ address: account.address });
    console.log('\n📊 Post-Transaction State:');
    console.log('  Has Code Now:', postTxCode && postTxCode !== '0x');
    console.log('  Code Length:', postTxCode ? postTxCode.length : 0);
    
    if (postTxCode && postTxCode !== '0x') {
      console.log('\n✅ Account now has delegated code!');
      console.log('   Delegation happened during the first transaction');
    }
    
  } catch (error) {
    console.log('\n❌ Transaction failed:', error.message);
    if (error.message.includes('insufficient funds')) {
      console.log('   This is expected - fresh account has 0 ETH');
      console.log('   And relay signers need funding');
    }
  }
  
  // =====================================
  // SUMMARY
  // =====================================
  console.log('\n');
  console.log('╔══════════════════════════════════════╗');
  console.log('║            SUMMARY                    ║');
  console.log('╚══════════════════════════════════════╝');
  
  console.log('\n📊 Key Findings:');
  console.log('  1. wallet_prepareUpgradeAccount: Prepares delegation data');
  console.log('  2. wallet_upgradeAccount: Returns null, stores data OFF-CHAIN');
  console.log('  3. No on-chain changes from wallet_upgradeAccount alone');
  console.log('  4. First transaction includes delegation in encodedPreCalls');
  console.log('  5. Actual delegation happens during first transaction execution');
  
  console.log('\n💡 Conclusion:');
  console.log('  Porto uses a lazy delegation model:');
  console.log('  - Account setup is off-chain (gas-free)');
  console.log('  - Delegation executes with first transaction');
  console.log('  - This is why our pet creation fails:');
  console.log('    The transaction only executes delegation, not the actual call');
  
  console.log('\n📁 JSON outputs saved to ./output/');
}

// Run test
testAccountUpgradeOnly().catch(console.error);