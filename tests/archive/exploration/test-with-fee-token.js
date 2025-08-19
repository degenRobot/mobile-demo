#!/usr/bin/env node

/**
 * Test with explicit fee token specification
 * 
 * The dialog app specifies feeToken in capabilities.
 * Let's test if this fixes the gas shortfall.
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000'; // Native ETH

async function testWithFeeToken() {
  console.log('💰 TEST WITH EXPLICIT FEE TOKEN');
  console.log('================================\n');
  
  // Create fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('🔑 Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  console.log('');
  
  // =====================================
  // Setup Delegation (Quick)
  // =====================================
  console.log('📤 Setting up delegation...');
  
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
  
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams]);
  
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
  
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  
  console.log('✅ Delegation stored with Porto\n');
  
  // =====================================
  // Deploy Delegation with Fee Token
  // =====================================
  console.log('📤 Deploying delegation with fee token specified...');
  
  const deployParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: '0x0000000000000000000000000000000000000000',
      value: '0x0',
      data: '0x'
    }],
    capabilities: {
      meta: {
        feeToken: ETH_ADDRESS,  // Explicitly specify ETH as fee token
        feePayer: mainAccount.address  // Explicitly specify fee payer
      }
    }
  };
  
  console.log('📋 Request with fee configuration:');
  console.log('  Fee token:', ETH_ADDRESS, '(ETH)');
  console.log('  Fee payer:', mainAccount.address);
  console.log('');
  
  const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [deployParams]);
  
  const hasPreCalls = !!(prepareDelegationResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('  Has preCalls:', hasPreCalls ? '✅ YES' : '❌ NO');
  
  // Check payment details
  const quote = prepareDelegationResponse.context?.quote;
  if (quote) {
    console.log('\n💰 Payment Configuration:');
    console.log('  Payer:', quote.intent?.payer || 'Not set');
    console.log('  Payment token:', quote.intent?.paymentToken || 'Not set');
    console.log('  Max fee per gas:', quote.nativeFeeEstimate?.maxFeePerGas);
    console.log('  Max priority fee:', quote.nativeFeeEstimate?.maxPriorityFeePerGas);
  }
  
  const delegationSignature = await sessionAccount.signMessage({
    message: { raw: prepareDelegationResponse.digest }
  });
  
  console.log('\n📤 Sending delegation deployment...');
  try {
    const sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: prepareDelegationResponse.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: delegationSignature
    }]);
    
    console.log('✅ SUCCESS! Bundle ID:', sendResponse.id);
    console.log('\n⏳ Waiting 15 seconds...\n');
    await new Promise(r => setTimeout(r, 15000));
    
  } catch (error) {
    console.log('❌ Failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      // Parse the error to see the exact shortfall
      const match = error.message.match(/have (\d+) want (\d+)/);
      if (match) {
        const have = BigInt(match[1]);
        const want = BigInt(match[2]);
        const shortfall = want - have;
        console.log('\n📊 Gas Analysis:');
        console.log('  Have:', have.toString(), 'wei');
        console.log('  Want:', want.toString(), 'wei');
        console.log('  Shortfall:', shortfall.toString(), 'wei');
        console.log('  Shortfall in ETH:', (Number(shortfall) / 1e18).toFixed(18));
      }
    }
    return;
  }
  
  // =====================================
  // Pet Creation with Fee Token
  // =====================================
  console.log('📤 Creating pet with fee token specified...');
  
  const petName = `FeeTokenPet_${Date.now()}`;
  const petCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  const petParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: FRENPET_SIMPLE_ADDRESS,
      value: '0x0',
      data: petCalldata
    }],
    capabilities: {
      meta: {
        feeToken: ETH_ADDRESS,
        feePayer: mainAccount.address
      }
    }
  };
  
  const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [petParams]);
  
  const petHasPreCalls = !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('  Has preCalls:', petHasPreCalls ? '❌ YES' : '✅ NO');
  
  const petSignature = await sessionAccount.signMessage({
    message: { raw: preparePetResponse.digest }
  });
  
  console.log('📤 Sending pet creation...');
  try {
    const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: preparePetResponse.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: petSignature
    }]);
    
    console.log('✅ SUCCESS! Bundle ID:', sendPetResponse.id);
    
  } catch (error) {
    console.log('❌ Failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      const match = error.message.match(/have (\d+) want (\d+)/);
      if (match) {
        const have = BigInt(match[1]);
        const want = BigInt(match[2]);
        const shortfall = want - have;
        console.log('\n📊 Gas Analysis:');
        console.log('  Have:', have.toString(), 'wei');
        console.log('  Want:', want.toString(), 'wei');
        console.log('  Shortfall:', shortfall.toString(), 'wei');
        console.log('  Shortfall in ETH:', (Number(shortfall) / 1e18).toFixed(18));
      }
    }
  }
  
  console.log('\n' + '='.repeat(50));
  console.log('💡 Summary:');
  console.log('  Testing if explicit feeToken specification helps');
  console.log('  Dialog app always specifies feeToken');
  console.log('  Porto relay currently hardcodes gas values');
}

// Run test
testWithFeeToken().catch(console.error);