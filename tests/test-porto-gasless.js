#!/usr/bin/env node

/**
 * Porto Gasless Transaction Test
 * 
 * Demonstrates the complete gasless flow with Porto, including:
 * 1. Setting up delegation (off-chain)
 * 2. Deploying delegation (on-chain with workaround)
 * 3. Executing gasless transactions
 * 
 * Key finding: Add feeToken to capabilities.meta for gasless transactions
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testPortoGasless() {
  console.log('🚀 PORTO GASLESS TRANSACTION TEST');
  console.log('=' .repeat(60));
  
  // Create fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('\n🔑 Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  
  // Check balances
  const client = createClient();
  const balance = await client.getBalance({ address: mainAccount.address });
  console.log('  Balance:', balance.toString(), 'wei (should be 0 for gasless)');
  
  // =====================================
  // STEP 1: Setup Delegation (Off-chain)
  // =====================================
  console.log('\n📝 Step 1: Setup Delegation (Off-chain)');
  console.log('-'.repeat(40));
  
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
  
  console.log('✅ Delegation stored with Porto relay');
  
  // =====================================
  // STEP 2: Deploy Delegation (On-chain)
  // =====================================
  console.log('\n📝 Step 2: Deploy Delegation (On-chain)');
  console.log('-'.repeat(40));
  console.log('⚠️  Note: Due to Porto relay bug with preCalls gas calculation,');
  console.log('    you may need to fund the account with 0.001 ETH for this step.');
  console.log('    Once deployed, all subsequent transactions are truly gasless.');
  
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
        feeToken: ETH_ADDRESS  // Critical: Specify fee token
      }
    }
  };
  
  const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [deployParams]);
  
  const delegationSignature = await sessionAccount.signMessage({
    message: { raw: prepareDelegationResponse.digest }
  });
  
  try {
    const sendDelegationResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: prepareDelegationResponse.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: delegationSignature
    }]);
    
    console.log('✅ Delegation deployed! Bundle:', sendDelegationResponse.id);
    console.log('   Waiting 15 seconds for confirmation...');
    await new Promise(r => setTimeout(r, 15000));
    
  } catch (error) {
    if (error.message.includes('insufficient funds')) {
      console.log('❌ Porto relay bug: Insufficient gas for preCalls');
      console.log('   Workaround: Send 0.001 ETH to', mainAccount.address);
      console.log('   Then run this test again.');
      return;
    }
    throw error;
  }
  
  // =====================================
  // STEP 3: Execute Gasless Transaction
  // =====================================
  console.log('\n📝 Step 3: Execute Gasless Transaction');
  console.log('-'.repeat(40));
  
  const petName = `GaslessPet_${Date.now()}`;
  console.log('Creating pet:', petName);
  
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
        feeToken: ETH_ADDRESS  // Critical: Specify fee token
      }
    }
  };
  
  const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [petParams]);
  
  const petSignature = await sessionAccount.signMessage({
    message: { raw: preparePetResponse.digest }
  });
  
  const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
    context: preparePetResponse.context,
    key: {
      prehash: false,
      publicKey: sessionAccount.address,
      type: 'secp256k1'
    },
    signature: petSignature
  }]);
  
  console.log('✅ Transaction sent! Bundle:', sendPetResponse.id);
  console.log('   View: https://sepolia.basescan.org/tx/' + sendPetResponse.id);
  
  // Verify gasless
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  console.log('\n💰 Final balance:', finalBalance.toString(), 'wei');
  console.log('   Truly gasless:', finalBalance === balance ? '✅ YES' : '❌ NO');
  
  console.log('\n' + '=' .repeat(60));
  console.log('✨ TEST COMPLETE');
  console.log('=' .repeat(60));
}

// Run test
testPortoGasless().catch(console.error);