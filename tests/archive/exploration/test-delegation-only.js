#!/usr/bin/env node

/**
 * Simple test for Porto delegation only
 * 
 * Tests just the delegation setup without any actual operations
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { CONFIG, makeRelayCall } from './lib/porto-utils-enhanced.js';

async function testDelegationOnly() {
  console.log('🔐 PORTO DELEGATION TEST');
  console.log('========================\n');
  
  // Create fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('📝 Test Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  console.log('');
  
  // =====================================
  // STEP 1: Prepare Upgrade
  // =====================================
  console.log('STEP 1: wallet_prepareUpgradeAccount');
  console.log('────────────────────────────────────\n');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  const prepareParams = {
    address: mainAccount.address,
    delegation: CONFIG.PORTO_IMPLEMENTATION,
    capabilities: {
      authorizeKeys: [{
        expiry: expiryHex,
        prehash: false,
        publicKey: sessionAccount.address,
        role: 'admin',
        type: 'secp256k1',
        permissions: []
      }]
    },
    chainId: CONFIG.CHAIN_ID
  };
  
  console.log('Request params:');
  console.log('  Address:', prepareParams.address);
  console.log('  Delegation:', prepareParams.delegation);
  console.log('  Chain ID:', prepareParams.chainId);
  console.log('  Session key:', sessionAccount.address);
  console.log('');
  
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams], {
    verbose: true,
    saveJson: true,
    testName: 'delegation_only'
  });
  
  console.log('\n📋 Response analysis:');
  console.log('  Has context:', !!prepareResponse.context);
  console.log('  Has digests:', !!prepareResponse.digests);
  console.log('  Has typedData:', !!prepareResponse.typedData);
  console.log('  Authorization address:', prepareResponse.context?.authorization?.address);
  console.log('');
  
  // =====================================
  // STEP 2: Sign and Upgrade
  // =====================================
  console.log('STEP 2: wallet_upgradeAccount');
  console.log('────────────────────────────\n');
  
  // Sign with session key
  const authSig = await sessionAccount.signMessage({
    message: { raw: prepareResponse.digests.auth }
  });
  
  const domain = {
    ...prepareResponse.typedData.domain,
    chainId: typeof prepareResponse.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResponse.typedData.domain.chainId, 16)
      : prepareResponse.typedData.domain.chainId,
  };
  
  const execSig = await sessionAccount.signTypedData({
    domain,
    types: prepareResponse.typedData.types,
    primaryType: prepareResponse.typedData.primaryType,
    message: prepareResponse.typedData.message,
  });
  
  console.log('Signatures created:');
  console.log('  Auth:', authSig.slice(0, 20) + '...');
  console.log('  Exec:', execSig.slice(0, 20) + '...');
  console.log('');
  
  const upgradeResponse = await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }], {
    verbose: true,
    saveJson: true,
    testName: 'delegation_only'
  });
  
  console.log('Upgrade response:', upgradeResponse);
  console.log('✅ Delegation stored with RPC server\n');
  
  // =====================================
  // STEP 3: First Call (Empty) to Deploy Delegation
  // =====================================
  console.log('STEP 3: wallet_prepareCalls (empty call)');
  console.log('────────────────────────────────────────\n');
  
  const emptyCallParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: '0x0000000000000000000000000000000000000000',
      value: '0x0',
      data: '0x'
    }],
    capabilities: {
      meta: {}
    }
  };
  
  console.log('Empty call params:');
  console.log('  From:', emptyCallParams.from);
  console.log('  Chain ID:', emptyCallParams.chainId);
  console.log('  Call to:', emptyCallParams.calls[0].to);
  console.log('');
  
  const prepareCallsResponse = await makeRelayCall('wallet_prepareCalls', [emptyCallParams], {
    verbose: true,
    saveJson: true,
    testName: 'delegation_only'
  });
  
  console.log('\n📋 PrepareCalls response analysis:');
  console.log('  Has context:', !!prepareCallsResponse.context);
  console.log('  Has digest:', !!prepareCallsResponse.digest);
  console.log('  Has capabilities:', !!prepareCallsResponse.capabilities);
  
  const hasPreCalls = !!(prepareCallsResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('  Has preCalls:', hasPreCalls ? '✅ YES (delegation setup)' : '❌ NO');
  
  if (hasPreCalls) {
    console.log('  PreCalls length:', prepareCallsResponse.context.quote.intent.encodedPreCalls.length);
    console.log('  First preCall length:', prepareCallsResponse.context.quote.intent.encodedPreCalls[0].length);
  }
  
  console.log('  Nonce:', prepareCallsResponse.context?.quote?.intent?.nonce);
  console.log('  Combined gas:', prepareCallsResponse.context?.quote?.intent?.combinedGas);
  console.log('  TX gas:', prepareCallsResponse.context?.quote?.txGas);
  console.log('');
  
  // Check fee details
  if (prepareCallsResponse.context?.quote) {
    const quote = prepareCallsResponse.context.quote;
    console.log('💰 Fee details:');
    console.log('  Max fee per gas:', quote.nativeFeeEstimate?.maxFeePerGas);
    console.log('  Max priority fee:', quote.nativeFeeEstimate?.maxPriorityFeePerGas);
    console.log('  Payer:', quote.intent?.payer || 'Not set');
    console.log('  Payment token:', quote.intent?.paymentToken || 'Not set');
    console.log('');
  }
  
  // Check if fee signature is provided
  if (prepareCallsResponse.capabilities?.feeSignature) {
    console.log('⚠️  Fee signature provided:', prepareCallsResponse.capabilities.feeSignature);
  } else {
    console.log('✅ No fee signature required');
  }
  console.log('');
  
  // =====================================
  // STEP 4: Send the Empty Call
  // =====================================
  console.log('STEP 4: wallet_sendPreparedCalls');
  console.log('────────────────────────────────\n');
  
  // Sign with session key
  const callSignature = await sessionAccount.signMessage({
    message: { raw: prepareCallsResponse.digest }
  });
  
  console.log('Call signature:', callSignature.slice(0, 20) + '...');
  console.log('');
  
  const sendParams = {
    context: prepareCallsResponse.context,
    key: {
      prehash: false,
      publicKey: sessionAccount.address,
      type: 'secp256k1'
    },
    signature: callSignature
  };
  
  // Add fee signature if provided
  if (prepareCallsResponse.capabilities?.feeSignature) {
    console.log('Including fee signature in send request');
    sendParams.capabilities = {
      feeSignature: prepareCallsResponse.capabilities.feeSignature
    };
  }
  
  try {
    const sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendParams], {
      verbose: true,
      saveJson: true,
      testName: 'delegation_only'
    });
    
    console.log('\n✅ SUCCESS! Transaction sent');
    console.log('   Bundle ID:', sendResponse.id);
    console.log('\n🎉 Delegation should now be deployed on-chain!');
    
  } catch (error) {
    console.log('\n❌ FAILED:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n📊 Error Analysis:');
      console.log('  This is the critical failure point');
      console.log('  The relay signers have funds but still fails');
      console.log('  Possible causes:');
      console.log('    1. Wrong fee token configuration');
      console.log('    2. Missing fee signature');
      console.log('    3. Incorrect nonce or gas calculation');
      console.log('    4. Account state issue');
    } else if (error.message.includes('0xfbcb0b34')) {
      console.log('\n📊 Error Analysis:');
      console.log('  Error 0xfbcb0b34 = Account not delegated');
      console.log('  This means delegation was not properly set up');
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('📝 Summary:');
  console.log('  1. wallet_prepareUpgradeAccount - Prepares delegation');
  console.log('  2. wallet_upgradeAccount - Stores with RPC (not on-chain)');
  console.log('  3. wallet_prepareCalls - Gets preCalls for delegation');
  console.log('  4. wallet_sendPreparedCalls - Should deploy delegation');
  console.log('\nCheck ./output/delegation_only_*.json for full details');
}

// Run test
testDelegationOnly().catch(console.error);