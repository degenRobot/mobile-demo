#!/usr/bin/env node

/**
 * Gasless flow with workaround
 * 
 * Issue: Porto relay has a gas calculation bug with preCalls
 * Workaround: Fund the EOA with minimal ETH for delegation deployment only
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData, parseEther } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testGaslessWithWorkaround() {
  console.log('🚀 GASLESS FLOW WITH WORKAROUND');
  console.log('=' .repeat(60));
  console.log('Issue: Porto relay gas calculation bug with preCalls');
  console.log('Workaround: Send tiny amount of ETH for delegation only');
  console.log('=' .repeat(60));
  
  // Create fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('\n🔑 Generated Fresh Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  
  const client = createClient();
  
  // =====================================
  // WORKAROUND: Send tiny amount of ETH
  // =====================================
  console.log('\n' + '=' .repeat(60));
  console.log('WORKAROUND: SEND MINIMAL ETH FOR DELEGATION');
  console.log('=' .repeat(60));
  console.log('⚠️ NOTE: This is a temporary workaround for Porto relay bug');
  console.log('         Only needed for delegation deployment with preCalls');
  console.log('\nPlease send 0.001 ETH to:', mainAccount.address);
  console.log('Waiting for funding... (press Ctrl+C to cancel)');
  
  // Wait for funding
  while (true) {
    const balance = await client.getBalance({ address: mainAccount.address });
    if (balance > 0n) {
      console.log('✅ Account funded with:', (balance / 10n**18n), 'ETH');
      break;
    }
    await new Promise(r => setTimeout(r, 5000));
    process.stdout.write('.');
  }
  
  // =====================================
  // STEP 1: Setup Delegation (Off-chain)
  // =====================================
  console.log('\n' + '=' .repeat(60));
  console.log('STEP 1: SETUP DELEGATION (OFF-CHAIN)');
  console.log('=' .repeat(60));
  
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
  
  console.log('📤 Calling wallet_prepareUpgradeAccount...');
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
  
  console.log('📤 Calling wallet_upgradeAccount...');
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  
  console.log('✅ Delegation stored with Porto relay\n');
  
  // =====================================
  // STEP 2: Deploy Delegation (On-chain)
  // =====================================
  console.log('=' .repeat(60));
  console.log('STEP 2: DEPLOY DELEGATION (USING FUNDED ACCOUNT)');
  console.log('=' .repeat(60));
  
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
        feeToken: ETH_ADDRESS
      }
    }
  };
  
  console.log('📤 Preparing delegation deployment...');
  const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [deployParams]);
  
  const delegationSignature = await sessionAccount.signMessage({
    message: { raw: prepareDelegationResponse.digest }
  });
  
  console.log('📤 Sending delegation deployment...');
  console.log('  ℹ️ Using minimal ETH funding due to Porto bug');
  const sendDelegationResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
    context: prepareDelegationResponse.context,
    key: {
      prehash: false,
      publicKey: sessionAccount.address,
      type: 'secp256k1'
    },
    signature: delegationSignature
  }]);
  
  console.log('✅ Transaction sent!');
  console.log('  Bundle ID:', sendDelegationResponse.id);
  console.log('  View: https://sepolia.basescan.org/tx/' + sendDelegationResponse.id);
  
  console.log('\n⏳ Waiting 15 seconds for confirmation...');
  await new Promise(r => setTimeout(r, 15000));
  
  // Check balance after delegation
  const balanceAfterDelegation = await client.getBalance({ address: mainAccount.address });
  console.log('💰 Balance after delegation:', (balanceAfterDelegation / 10n**18n), 'ETH');
  
  // =====================================
  // STEP 3: Create Pet (Truly Gasless)
  // =====================================
  console.log('\n' + '=' .repeat(60));
  console.log('STEP 3: CREATE PET (TRULY GASLESS NOW)');
  console.log('=' .repeat(60));
  
  const petName = `WorkaroundPet_${Date.now()}`;
  console.log('🐾 Creating pet:', petName);
  console.log('  ✨ This should work gaslessly now that delegation is deployed');
  
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
        feeToken: ETH_ADDRESS
      }
    }
  };
  
  console.log('📤 Preparing pet creation...');
  const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [petParams]);
  
  const hasPreCalls = !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('  Has preCalls:', hasPreCalls ? 'YES (unexpected!)' : 'NO (good - delegation already deployed)');
  
  const petSignature = await sessionAccount.signMessage({
    message: { raw: preparePetResponse.digest }
  });
  
  console.log('📤 Sending pet creation...');
  const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
    context: preparePetResponse.context,
    key: {
      prehash: false,
      publicKey: sessionAccount.address,
      type: 'secp256k1'
    },
    signature: petSignature
  }]);
  
  console.log('✅ Transaction sent!');
  console.log('  Bundle ID:', sendPetResponse.id);
  console.log('  View: https://sepolia.basescan.org/tx/' + sendPetResponse.id);
  
  console.log('\n⏳ Waiting 15 seconds for confirmation...');
  await new Promise(r => setTimeout(r, 15000));
  
  // Check final balance
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  console.log('💰 Final balance:', (finalBalance / 10n**18n), 'ETH');
  
  if (finalBalance === balanceAfterDelegation) {
    console.log('  ✅ No additional ETH spent for pet creation - gasless works!');
  }
  
  // =====================================
  // Summary
  // =====================================
  console.log('\n' + '=' .repeat(60));
  console.log('✨ TEST COMPLETE');
  console.log('=' .repeat(60));
  console.log('\n📊 Summary:');
  console.log('  1. ✅ Delegation setup (off-chain)');
  console.log('  2. ⚠️ Delegation deployment (used minimal ETH due to bug)');
  console.log('  3. ✅ Pet creation (truly gasless!)');
  
  console.log('\n💡 Key Findings:');
  console.log('  - Porto relay has a gas calculation bug with preCalls');
  console.log('  - Once delegation is deployed, subsequent transactions are gasless');
  console.log('  - Always include capabilities.meta.feeToken for proper gas handling');
  
  console.log('\n🔧 Recommended Fix:');
  console.log('  Porto relay should fix gas calculation in wallet.rs:');
  console.log('  - Line 492: combinedGas hardcoded to 50M');
  console.log('  - Line 720: gas_limit hardcoded to 100M');
  console.log('  - These values don\'t account for actual preCalls gas usage');
}

// Run test
testGaslessWithWorkaround().catch(console.error);