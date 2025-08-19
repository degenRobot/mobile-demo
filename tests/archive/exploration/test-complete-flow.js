#!/usr/bin/env node

/**
 * Test Complete Porto Flow with Session Keys
 * 
 * Tests the proper two-transaction flow with careful attention to:
 * 1. Which key we're delegating (session key vs main EOA)
 * 2. Which key we're signing with
 * 3. Proper two-transaction flow
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { formatEther, encodeFunctionData } from 'viem';
import {
  CONFIG,
  makeRelayCall,
  createClient,
} from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';

async function testCompleteFlow() {
  console.log('🔬 COMPLETE PORTO FLOW TEST WITH SESSION KEYS');
  console.log('==============================================\n');
  
  // Create main account and session key
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('🔑 Key Setup:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  console.log('');
  
  const client = createClient();
  const options = {
    verbose: false,
    saveJson: true,
    testName: 'complete_flow'
  };
  
  // =====================================
  // STEP 1: Account Setup with Session Key
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 1: Setup Account Delegation    ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
  const expiryHex = '0x' + expiry.toString(16);
  
  // Test both configurations
  const testConfigs = [
    {
      name: 'Config A: Delegate MAIN EOA, sign with MAIN',
      delegateKey: mainAccount.address,
      signingAccount: mainAccount,
      description: 'Traditional approach - main account controls itself'
    },
    {
      name: 'Config B: Delegate SESSION KEY, sign with SESSION',
      delegateKey: sessionAccount.address,
      signingAccount: sessionAccount,
      description: 'Session key approach - session key gets delegated permissions'
    },
    {
      name: 'Config C: Delegate SESSION KEY, sign with MAIN',
      delegateKey: sessionAccount.address,
      signingAccount: mainAccount,
      description: 'Mixed approach - main authorizes session key'
    }
  ];
  
  // Let's test Config B (most likely correct for session keys)
  const config = testConfigs[1];
  
  console.log('📋 Testing Configuration:');
  console.log('  ' + config.name);
  console.log('  ' + config.description);
  console.log('  Delegating:', config.delegateKey);
  console.log('  Signing with:', config.signingAccount.address);
  console.log('');
  
  // Prepare upgrade with the chosen key
  console.log('📝 Preparing account upgrade...');
  
  const prepareParams = {
    address: mainAccount.address,  // The main EOA getting upgraded
    delegation: CONFIG.PORTO_IMPLEMENTATION,
    capabilities: {
      authorizeKeys: [{
        expiry: expiryHex,
        prehash: false,
        publicKey: config.delegateKey,  // Which key gets permission
        role: 'admin',
        type: 'secp256k1',
        permissions: []
      }]
    },
    chainId: CONFIG.CHAIN_ID
  };
  
  console.log('\n🔍 Delegation Details:');
  console.log('  Account being upgraded:', prepareParams.address);
  console.log('  Key being authorized:', prepareParams.capabilities.authorizeKeys[0].publicKey);
  console.log('  Implementation:', prepareParams.delegation);
  console.log('');
  
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams], options);
  console.log('✅ Prepare completed\n');
  
  // Sign with the appropriate account
  console.log('🖊️  Signing authorization...');
  console.log('  Signing account:', config.signingAccount.address);
  
  const authSig = await config.signingAccount.signMessage({
    message: { raw: prepareResponse.digests.auth }
  });
  
  const domain = {
    ...prepareResponse.typedData.domain,
    chainId: typeof prepareResponse.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResponse.typedData.domain.chainId, 16)
      : prepareResponse.typedData.domain.chainId,
  };
  
  const execSig = await config.signingAccount.signTypedData({
    domain,
    types: prepareResponse.typedData.types,
    primaryType: prepareResponse.typedData.primaryType,
    message: prepareResponse.typedData.message,
  });
  
  console.log('✅ Signatures created\n');
  
  // Upgrade account
  const upgradeParams = {
    context: prepareResponse.context,
    signatures: {
      auth: authSig,
      exec: execSig
    }
  };
  
  await makeRelayCall('wallet_upgradeAccount', [upgradeParams], options);
  console.log('✅ Account upgrade stored (off-chain)\n');
  
  // =====================================
  // STEP 2: First Transaction (Delegation)
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 2: First TX (Delegation Only)  ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('📤 Sending empty transaction to trigger delegation...\n');
  
  // Empty call to trigger delegation
  const delegationCalls = [{
    to: '0x0000000000000000000000000000000000000000',
    value: '0x0',
    data: '0x'
  }];
  
  // IMPORTANT: Which account sends this?
  const delegationFrom = mainAccount.address;  // Main EOA is the "from"
  
  const prepareDelegationParams = {
    from: delegationFrom,
    chainId: CONFIG.CHAIN_ID,
    calls: delegationCalls,
    capabilities: {
      meta: {}
    }
  };
  
  console.log('🔍 First Transaction Details:');
  console.log('  From:', prepareDelegationParams.from);
  console.log('  Call: Empty (delegation only)');
  console.log('');
  
  const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [prepareDelegationParams], options);
  
  const hasPreCalls = !!(prepareDelegationResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('  Has preCalls:', hasPreCalls ? '✅ YES (expected)' : '❌ NO');
  
  // Now sign with the session key
  const delegationSigner = sessionAccount;  // Try signing with session key
  
  console.log('  Signing with:', delegationSigner.address);
  console.log('');
  
  const delegationSignature = await delegationSigner.signMessage({
    message: { raw: prepareDelegationResponse.digest }
  });
  
  const sendDelegationParams = {
    context: prepareDelegationResponse.context,
    key: {
      prehash: false,
      publicKey: delegationSigner.address,  // Public key of signer
      type: 'secp256k1'
    },
    signature: delegationSignature
  };
  
  try {
    const sendDelegationResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendDelegationParams], options);
    console.log('✅ Delegation transaction sent!');
    console.log('   Bundle ID:', sendDelegationResponse.id);
    console.log('\n⏳ Waiting 15 seconds for confirmation...\n');
    await new Promise(r => setTimeout(r, 15000));
  } catch (error) {
    console.log('❌ Delegation transaction failed:', error.message);
    console.log('\n💡 This might mean:');
    console.log('   - Wrong signing key');
    console.log('   - Wrong delegation setup');
    console.log('   - Insufficient relay funds\n');
    return;
  }
  
  // =====================================
  // STEP 3: Second Transaction (Pet Creation)
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 3: Second TX (Pet Creation)    ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const petName = `TestPet_${Date.now()}`;
  console.log('🐾 Creating pet:', petName, '\n');
  
  const petCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  const petCalls = [{
    to: FRENPET_SIMPLE_ADDRESS,
    value: '0x0',
    data: petCalldata
  }];
  
  // Second transaction also from main EOA
  const preparePetParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: petCalls,
    capabilities: {
      meta: {}
    }
  };
  
  console.log('🔍 Second Transaction Details:');
  console.log('  From:', preparePetParams.from);
  console.log('  To:', FRENPET_SIMPLE_ADDRESS);
  console.log('  Function: createPet');
  console.log('');
  
  const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [preparePetParams], options);
  
  const hasPreCallsSecond = !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('  Has preCalls:', hasPreCallsSecond ? '⚠️  YES (unexpected)' : '✅ NO (delegation active)');
  
  // Sign with session key again
  const petSigner = sessionAccount;
  console.log('  Signing with:', petSigner.address);
  console.log('');
  
  const petSignature = await petSigner.signMessage({
    message: { raw: preparePetResponse.digest }
  });
  
  const sendPetParams = {
    context: preparePetResponse.context,
    key: {
      prehash: false,
      publicKey: petSigner.address,
      type: 'secp256k1'
    },
    signature: petSignature
  };
  
  try {
    const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendPetParams], options);
    console.log('✅ Pet creation transaction sent!');
    console.log('   Bundle ID:', sendPetResponse.id);
    console.log('\n⏳ Waiting 20 seconds for confirmation...\n');
    await new Promise(r => setTimeout(r, 20000));
  } catch (error) {
    console.log('❌ Pet creation transaction failed:', error.message);
    return;
  }
  
  // =====================================
  // STEP 4: Verify Results
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 4: Verify Results              ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('🔍 Checking pet on-chain...');
  
  try {
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]  // Check main EOA
    });
    
    console.log('   Has Pet:', hasPet ? '✅ YES!' : '❌ NO');
    
    if (hasPet) {
      const pet = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'pets',
        args: [mainAccount.address]
      });
      
      console.log('\n🎉 SUCCESS! Pet created on-chain!');
      console.log('   Name:', pet[0] || pet.name);
      console.log('   Level:', pet[1]?.toString() || pet.level?.toString());
      console.log('\n✅ Configuration works:');
      console.log('   ' + config.name);
    }
  } catch (error) {
    console.log('❌ Error checking pet:', error.message);
  }
  
  // =====================================
  // Summary
  // =====================================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║            SUMMARY                    ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  console.log('📊 Configuration Tested:');
  console.log('  ' + config.name);
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  console.log('  Delegated Key:', config.delegateKey);
  console.log('  Signing Key:', config.signingAccount.address);
  
  console.log('\n💡 Key Learnings:');
  console.log('  1. The "from" is always the main EOA');
  console.log('  2. The delegated key gets permissions');
  console.log('  3. The signing key must match the delegated key');
  console.log('  4. Two transactions are required for new accounts');
  
  console.log('\n📁 JSON outputs saved to ./output/');
}

// Run test
testCompleteFlow().catch(console.error);