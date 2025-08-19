#!/usr/bin/env node

/**
 * Test with Proper Fee Handling
 * 
 * Includes fee signature support based on Porto documentation
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import {
  CONFIG,
  makeRelayCall,
  createClient,
} from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';

async function testWithFees() {
  console.log('🔬 PORTO TEST WITH PROPER FEE HANDLING');
  console.log('=======================================\n');
  
  // Get capabilities first
  console.log('📋 Getting Porto capabilities...');
  
  try {
    const capabilitiesResponse = await makeRelayCall('wallet_getCapabilities', [
      [CONFIG.CHAIN_ID.toString(16)] // Chain ID as hex
    ], { verbose: false });
    
    const chainHex = '0x' + CONFIG.CHAIN_ID.toString(16);
    const chainCapabilities = capabilitiesResponse[chainHex];
    
    if (chainCapabilities?.fees) {
      console.log('\n💰 Fee Configuration:');
      console.log('  Fee recipient:', chainCapabilities.fees.recipient);
      console.log('  Quote TTL:', chainCapabilities.fees.quoteConfig?.ttl, 'seconds');
      console.log('  Available fee tokens:');
      
      for (const token of chainCapabilities.fees.tokens || []) {
        console.log(`    - ${token.symbol} (${token.address})`);
        console.log(`      Decimals: ${token.decimals}`);
        console.log(`      Native rate: ${token.nativeRate}`);
      }
      
      // Use native token (ETH) for fees
      const nativeToken = chainCapabilities.fees.tokens.find(t => 
        t.address === '0x0000000000000000000000000000000000000000'
      );
      
      if (nativeToken) {
        console.log('\n  Using native token (ETH) for fees');
      }
    }
  } catch (error) {
    console.log('Could not get capabilities:', error.message);
  }
  
  // Create accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('\n🔑 Account Setup:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  console.log('');
  
  const client = createClient();
  const options = {
    verbose: true,
    saveJson: true,
    testName: 'with_fees'
  };
  
  // =====================================
  // STEP 1: Setup Delegation
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 1: Setup Delegation            ║');
  console.log('╚══════════════════════════════════════╝\n');
  
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
  
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams], options);
  
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
  
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }], options);
  
  console.log('✅ Delegation setup complete\n');
  
  // =====================================
  // STEP 2: First Transaction with Fee Handling
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 2: First TX (Check Fees)       ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const delegationParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: '0x0000000000000000000000000000000000000000',
      value: '0x0',
      data: '0x'
    }],
    capabilities: {
      meta: {
        // Explicitly set fee parameters
        feePayer: mainAccount.address,  // Who pays the fees
        feeToken: '0x0000000000000000000000000000000000000000', // Native token (ETH)
      }
    }
  };
  
  console.log('📝 Request capabilities:');
  console.log('  Fee payer:', delegationParams.capabilities.meta.feePayer);
  console.log('  Fee token:', delegationParams.capabilities.meta.feeToken);
  console.log('');
  
  const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [delegationParams], options);
  
  // CHECK FOR FEE SIGNATURE IN RESPONSE
  console.log('\n🔍 Analyzing prepare response:');
  console.log('  Has preCalls:', !!(prepareDelegationResponse.context?.quote?.intent?.encodedPreCalls?.length));
  console.log('  Has capabilities:', !!prepareDelegationResponse.capabilities);
  
  if (prepareDelegationResponse.capabilities) {
    console.log('  Capabilities keys:', Object.keys(prepareDelegationResponse.capabilities));
    
    // Check for fee signature requirement
    if (prepareDelegationResponse.capabilities.feeSignature) {
      console.log('  ⚠️  FEE SIGNATURE REQUIRED!');
      console.log('  Fee signature:', prepareDelegationResponse.capabilities.feeSignature);
    } else {
      console.log('  ✅ No fee signature required');
    }
  }
  
  // Check payment details in the quote
  const quote = prepareDelegationResponse.context?.quote;
  if (quote) {
    console.log('\n💰 Payment Details:');
    console.log('  Payer:', quote.intent?.payer);
    console.log('  Payment token:', quote.intent?.paymentToken);
    console.log('  Pre-payment amount:', quote.intent?.prePaymentAmount);
    console.log('  Pre-payment max:', quote.intent?.prePaymentMaxAmount);
    console.log('  Total payment amount:', quote.intent?.totalPaymentAmount);
    console.log('  Total payment max:', quote.intent?.totalPaymentMaxAmount);
    console.log('  Payment recipient:', quote.intent?.paymentRecipient);
    console.log('  Payment signature:', quote.intent?.paymentSignature);
  }
  
  // Sign the transaction
  const delegationSignature = await sessionAccount.signMessage({
    message: { raw: prepareDelegationResponse.digest }
  });
  
  // Prepare send parameters with fee signature if needed
  const sendDelegationParams = {
    context: prepareDelegationResponse.context,
    key: {
      prehash: false,
      publicKey: sessionAccount.address,
      type: 'secp256k1'
    },
    signature: delegationSignature
  };
  
  // ADD FEE SIGNATURE IF PROVIDED
  if (prepareDelegationResponse.capabilities?.feeSignature) {
    console.log('\n🖊️  Including fee signature in send request');
    sendDelegationParams.capabilities = {
      feeSignature: prepareDelegationResponse.capabilities.feeSignature
    };
  }
  
  try {
    const sendDelegationResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendDelegationParams], options);
    console.log('\n✅ Delegation transaction sent!');
    console.log('   Bundle ID:', sendDelegationResponse.id);
    console.log('\n⏳ Waiting 15 seconds for confirmation...\n');
    await new Promise(r => setTimeout(r, 15000));
  } catch (error) {
    console.log('\n❌ Transaction failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 This is the expected error - relay needs funding');
    } else {
      console.log('\n⚠️  Different error than expected');
      console.log('   This might be due to missing fee signature');
    }
    return;
  }
  
  // =====================================
  // STEP 3: Pet Creation with Fee Handling
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 3: Pet Creation (With Fees)    ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const petName = `FeePet_${Date.now()}`;
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
        feePayer: mainAccount.address,
        feeToken: '0x0000000000000000000000000000000000000000'
      }
    }
  };
  
  const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [petParams], options);
  
  console.log('\n🔍 Pet transaction analysis:');
  console.log('  Has preCalls:', !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length));
  console.log('  Fee signature required:', !!preparePetResponse.capabilities?.feeSignature);
  
  const petSignature = await sessionAccount.signMessage({
    message: { raw: preparePetResponse.digest }
  });
  
  const sendPetParams = {
    context: preparePetResponse.context,
    key: {
      prehash: false,
      publicKey: sessionAccount.address,
      type: 'secp256k1'
    },
    signature: petSignature
  };
  
  // Add fee signature if provided
  if (preparePetResponse.capabilities?.feeSignature) {
    sendPetParams.capabilities = {
      feeSignature: preparePetResponse.capabilities.feeSignature
    };
  }
  
  try {
    const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendPetParams], options);
    console.log('\n✅ Pet creation transaction sent!');
    console.log('   Bundle ID:', sendPetResponse.id);
    
    await new Promise(r => setTimeout(r, 20000));
    
    // Check if pet was created
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]
    });
    
    console.log('\n🐾 Pet created:', hasPet ? '✅ YES!' : '❌ NO');
  } catch (error) {
    console.log('\n❌ Pet creation failed:', error.message);
  }
  
  // =====================================
  // Summary
  // =====================================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║            SUMMARY                    ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('📊 Key Findings:');
  console.log('  • Fee configuration can be checked via wallet_getCapabilities');
  console.log('  • Fee payer and token can be specified in capabilities.meta');
  console.log('  • Response may include capabilities.feeSignature');
  console.log('  • Fee signature must be included when sending if provided');
  
  console.log('\n💡 Potential Issues:');
  console.log('  • Missing fee signature when required');
  console.log('  • Incorrect fee payer or token');
  console.log('  • Relay signer insufficient funds');
  
  console.log('\n📁 JSON outputs saved to ./output/');
}

// Run test
testWithFees().catch(console.error);