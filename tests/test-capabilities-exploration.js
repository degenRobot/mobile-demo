#!/usr/bin/env node

/**
 * Test exploring different capabilities configurations for the second transaction
 * 
 * We fixed delegation by adding capabilities.meta
 * Let's see if different capabilities configurations fix the pet creation gas issue
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function setupDelegation(mainAccount, sessionAccount) {
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
  
  console.log('✅ Delegation stored\n');
}

async function deployDelegation(mainAccount, sessionAccount) {
  console.log('📤 Deploying delegation on-chain...');
  
  const deployParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: '0x0000000000000000000000000000000000000000',
      value: '0x0',
      data: '0x'
    }],
    capabilities: {
      meta: {}  // This fixed the delegation!
    }
  };
  
  const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [deployParams]);
  
  const delegationSignature = await sessionAccount.signMessage({
    message: { raw: prepareDelegationResponse.digest }
  });
  
  const sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
    context: prepareDelegationResponse.context,
    key: {
      prehash: false,
      publicKey: sessionAccount.address,
      type: 'secp256k1'
    },
    signature: delegationSignature
  }]);
  
  console.log('✅ Delegation deployed! Bundle:', sendResponse.id);
  console.log('⏳ Waiting 15 seconds...\n');
  await new Promise(r => setTimeout(r, 15000));
}

async function testCapabilities(mainAccount, sessionAccount, testName, capabilities) {
  console.log(`\n🧪 TEST: ${testName}`);
  console.log('=' .repeat(50));
  
  const petName = `TestPet_${Date.now()}`;
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
    capabilities
  };
  
  console.log('📋 Capabilities:', JSON.stringify(capabilities, null, 2));
  
  try {
    const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [petParams]);
    
    // Check quote details
    const quote = preparePetResponse.context?.quote;
    if (quote) {
      console.log('\n💰 Quote Details:');
      console.log('  Payer:', quote.intent?.payer);
      console.log('  Payment token:', quote.intent?.paymentToken);
      console.log('  Total payment max:', quote.intent?.totalPaymentMaxAmount);
      console.log('  Combined gas:', quote.intent?.combinedGas);
      console.log('  TX gas:', quote.txGas);
    }
    
    const petSignature = await sessionAccount.signMessage({
      message: { raw: preparePetResponse.digest }
    });
    
    console.log('\n📤 Sending pet creation...');
    const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: preparePetResponse.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: petSignature,
      capabilities  // Pass capabilities here too
    }]);
    
    console.log('✅ SUCCESS! Bundle ID:', sendPetResponse.id);
    return true;
    
  } catch (error) {
    console.log('❌ FAILED:', error.message);
    
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
    return false;
  }
}

async function main() {
  console.log('🔬 CAPABILITIES EXPLORATION TEST');
  console.log('=' .repeat(50));
  
  // Create fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('\n🔑 Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  console.log('');
  
  // Setup and deploy delegation once
  await setupDelegation(mainAccount, sessionAccount);
  await deployDelegation(mainAccount, sessionAccount);
  
  // Test different capabilities configurations
  const tests = [
    {
      name: 'Empty capabilities (should fail)',
      capabilities: {}
    },
    {
      name: 'Just meta object (like delegation)',
      capabilities: {
        meta: {}
      }
    },
    {
      name: 'Meta with explicit fee token',
      capabilities: {
        meta: {
          feeToken: ETH_ADDRESS
        }
      }
    },
    {
      name: 'Meta with fee payer',
      capabilities: {
        meta: {
          feePayer: mainAccount.address
        }
      }
    },
    {
      name: 'Meta with both fee token and payer',
      capabilities: {
        meta: {
          feeToken: ETH_ADDRESS,
          feePayer: mainAccount.address
        }
      }
    },
    {
      name: 'Meta with relay as payer',
      capabilities: {
        meta: {
          feeToken: ETH_ADDRESS,
          feePayer: '0x0000000000000000000000000000000000000000'  // Let relay be payer
        }
      }
    },
    {
      name: 'Meta with explicit nonce',
      capabilities: {
        meta: {
          nonce: '0x1'  // Try with explicit nonce
        }
      }
    },
    {
      name: 'Exploring preCalls (empty)',
      capabilities: {
        meta: {},
        preCalls: []
      }
    },
    {
      name: 'With preCall flag',
      capabilities: {
        meta: {},
        preCall: false  // Explicitly set to false
      }
    }
  ];
  
  const results = [];
  for (const test of tests) {
    const success = await testCapabilities(mainAccount, sessionAccount, test.name, test.capabilities);
    results.push({ name: test.name, success });
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('📊 RESULTS SUMMARY:');
  console.log('=' .repeat(50));
  
  for (const result of results) {
    const emoji = result.success ? '✅' : '❌';
    console.log(`${emoji} ${result.name}`);
  }
  
  const successCount = results.filter(r => r.success).length;
  console.log(`\n✨ Success rate: ${successCount}/${results.length}`);
  
  if (successCount > 0) {
    console.log('\n💡 Key Insights:');
    console.log('  - Delegation requires capabilities.meta to work');
    console.log('  - Pet creation may need different capabilities');
    console.log('  - Porto relay hardcodes gas values (50M combined, 100M limit)');
    console.log('  - Gas shortfall is consistent (~0.00000005 ETH)');
  }
}

// Run test
main().catch(console.error);