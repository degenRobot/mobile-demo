#!/usr/bin/env node

/**
 * Test Different Signing Patterns
 * 
 * Tests various combinations of delegation and signing to find the correct pattern
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

async function testSigningPattern(patternName, setupConfig) {
  console.log('\n' + '='.repeat(60));
  console.log(`Testing: ${patternName}`);
  console.log('='.repeat(60) + '\n');
  
  const client = createClient();
  const options = { verbose: false, saveJson: false };
  
  // Create accounts
  const mainAccount = privateKeyToAccount(setupConfig.mainPrivateKey || generatePrivateKey());
  const sessionAccount = privateKeyToAccount(setupConfig.sessionPrivateKey || generatePrivateKey());
  
  console.log('Main EOA:', mainAccount.address);
  console.log('Session Key:', sessionAccount.address);
  console.log('Pattern:', setupConfig.description);
  console.log('');
  
  try {
    // STEP 1: Prepare delegation
    const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    const expiryHex = '0x' + expiry.toString(16);
    
    const prepareParams = {
      address: setupConfig.accountToUpgrade || mainAccount.address,
      delegation: CONFIG.PORTO_IMPLEMENTATION,
      capabilities: {
        authorizeKeys: [{
          expiry: expiryHex,
          prehash: false,
          publicKey: setupConfig.keyToDelegate,
          role: 'admin',
          type: 'secp256k1',
          permissions: []
        }]
      },
      chainId: CONFIG.CHAIN_ID
    };
    
    console.log('Step 1: Delegation Setup');
    console.log('  Account to upgrade:', prepareParams.address);
    console.log('  Key to delegate:', prepareParams.capabilities.authorizeKeys[0].publicKey);
    
    const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams], options);
    
    // Sign with specified account
    const delegationSigner = setupConfig.delegationSigner === 'main' ? mainAccount : sessionAccount;
    console.log('  Signing delegation with:', delegationSigner.address);
    
    const authSig = await delegationSigner.signMessage({
      message: { raw: prepareResponse.digests.auth }
    });
    
    const domain = {
      ...prepareResponse.typedData.domain,
      chainId: typeof prepareResponse.typedData.domain.chainId === 'string' 
        ? parseInt(prepareResponse.typedData.domain.chainId, 16)
        : prepareResponse.typedData.domain.chainId,
    };
    
    const execSig = await delegationSigner.signTypedData({
      domain,
      types: prepareResponse.typedData.types,
      primaryType: prepareResponse.typedData.primaryType,
      message: prepareResponse.typedData.message,
    });
    
    // Upgrade account
    await makeRelayCall('wallet_upgradeAccount', [{
      context: prepareResponse.context,
      signatures: { auth: authSig, exec: execSig }
    }], options);
    
    console.log('  ✅ Delegation stored\n');
    
    // STEP 2: First transaction (trigger delegation)
    console.log('Step 2: Trigger Delegation Transaction');
    
    const prepareDelegationParams = {
      from: setupConfig.txFrom || mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: '0x0000000000000000000000000000000000000000',
        value: '0x0',
        data: '0x'
      }],
      capabilities: { meta: {} }
    };
    
    console.log('  From:', prepareDelegationParams.from);
    
    const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [prepareDelegationParams], options);
    
    // Sign transaction
    const txSigner = setupConfig.txSigner === 'main' ? mainAccount : sessionAccount;
    console.log('  Signing tx with:', txSigner.address);
    
    const delegationSignature = await txSigner.signMessage({
      message: { raw: prepareDelegationResponse.digest }
    });
    
    const sendDelegationParams = {
      context: prepareDelegationResponse.context,
      key: {
        prehash: false,
        publicKey: txSigner.address,
        type: 'secp256k1'
      },
      signature: delegationSignature
    };
    
    const delegationResult = await makeRelayCall('wallet_sendPreparedCalls', [sendDelegationParams], options);
    console.log('  ✅ Delegation tx sent:', delegationResult.id?.substring(0, 10) + '...\n');
    
    // Wait for confirmation
    await new Promise(r => setTimeout(r, 10000));
    
    // STEP 3: Second transaction (pet creation)
    console.log('Step 3: Pet Creation Transaction');
    
    const petName = `Pet_${Date.now().toString().slice(-6)}`;
    const petCalldata = encodeFunctionData({
      abi: FrenPetSimpleJson.abi,
      functionName: 'createPet',
      args: [petName]
    });
    
    const preparePetParams = {
      from: setupConfig.txFrom || mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: FRENPET_SIMPLE_ADDRESS,
        value: '0x0',
        data: petCalldata
      }],
      capabilities: { meta: {} }
    };
    
    const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [preparePetParams], options);
    
    const hasPreCalls = !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length);
    console.log('  Has preCalls:', hasPreCalls ? '⚠️ YES' : '✅ NO');
    
    const petSignature = await txSigner.signMessage({
      message: { raw: preparePetResponse.digest }
    });
    
    const sendPetParams = {
      context: preparePetResponse.context,
      key: {
        prehash: false,
        publicKey: txSigner.address,
        type: 'secp256k1'
      },
      signature: petSignature
    };
    
    const petResult = await makeRelayCall('wallet_sendPreparedCalls', [sendPetParams], options);
    console.log('  ✅ Pet tx sent:', petResult.id?.substring(0, 10) + '...\n');
    
    // Wait and check
    await new Promise(r => setTimeout(r, 15000));
    
    // Verify
    console.log('Step 4: Verification');
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]
    });
    
    if (hasPet) {
      console.log('  ✅ SUCCESS! Pet created on-chain!');
      return true;
    } else {
      console.log('  ❌ Pet NOT created');
      return false;
    }
    
  } catch (error) {
    console.log('  ❌ Error:', error.message.substring(0, 100));
    return false;
  }
}

async function runAllTests() {
  console.log('🔬 TESTING SIGNING PATTERNS FOR PORTO');
  console.log('======================================\n');
  
  const results = [];
  
  // Test patterns
  const patterns = [
    {
      name: 'Pattern A: Main delegates Main, Main signs',
      config: {
        description: 'Traditional - main account controls itself',
        keyToDelegate: null,  // Will use main
        delegationSigner: 'main',
        txSigner: 'main',
        txFrom: null  // Will use main
      }
    },
    {
      name: 'Pattern B: Main delegates Session, Session signs',
      config: {
        description: 'Session key approach - session key has permissions',
        keyToDelegate: null,  // Will use session
        delegationSigner: 'session',
        txSigner: 'session',
        txFrom: null  // Will use main
      }
    },
    {
      name: 'Pattern C: Main delegates Session, Main signs delegation, Session signs tx',
      config: {
        description: 'Mixed - main authorizes session, session executes',
        keyToDelegate: null,  // Will use session
        delegationSigner: 'main',
        txSigner: 'session',
        txFrom: null  // Will use main
      }
    }
  ];
  
  // For reusing accounts across tests (to avoid re-delegation)
  const sharedMainKey = generatePrivateKey();
  const sharedSessionKey = generatePrivateKey();
  
  for (const pattern of patterns) {
    const config = { ...pattern.config };
    
    // Set up keys
    config.mainPrivateKey = sharedMainKey;
    config.sessionPrivateKey = sharedSessionKey;
    
    const mainAccount = privateKeyToAccount(sharedMainKey);
    const sessionAccount = privateKeyToAccount(sharedSessionKey);
    
    // Set delegation target based on pattern
    if (pattern.name.includes('delegates Main')) {
      config.keyToDelegate = mainAccount.address;
    } else {
      config.keyToDelegate = sessionAccount.address;
    }
    
    const success = await testSigningPattern(pattern.name, config);
    results.push({ pattern: pattern.name, success });
    
    // Small delay between tests
    await new Promise(r => setTimeout(r, 2000));
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY OF RESULTS');
  console.log('='.repeat(60) + '\n');
  
  for (const result of results) {
    console.log(`${result.success ? '✅' : '❌'} ${result.pattern}`);
  }
  
  const working = results.filter(r => r.success);
  if (working.length > 0) {
    console.log('\n🎉 Working pattern(s) found:');
    for (const w of working) {
      console.log('  - ' + w.pattern);
    }
  } else {
    console.log('\n❌ No working patterns found (likely due to insufficient funds)');
    console.log('   But we can see which patterns get furthest');
  }
}

// Run tests
runAllTests().catch(console.error);