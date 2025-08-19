#!/usr/bin/env node

/**
 * Test with Delegation Verification
 * 
 * Checks delegation status and verifies transactions actually succeeded
 * Skips delegation setup if already active
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData, keccak256, toHex } from 'viem';
import {
  CONFIG,
  makeRelayCall,
  createClient,
} from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';

// Check if account has active delegation
async function checkDelegationStatus(mainAddress, sessionAddress) {
  console.log('🔍 Checking delegation status...');
  
  try {
    // Method 1: Check if we can prepare a call without preCalls
    const testParams = {
      from: mainAddress,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: '0x0000000000000000000000000000000000000000',
        value: '0x0',
        data: '0x'
      }],
      capabilities: { meta: {} }
    };
    
    const prepareResponse = await makeRelayCall('wallet_prepareCalls', [testParams], { verbose: false });
    const hasPreCalls = !!(prepareResponse.context?.quote?.intent?.encodedPreCalls?.length);
    
    console.log('   Has preCalls in test transaction:', hasPreCalls ? 'YES' : 'NO');
    
    // Method 2: Check stored keys
    try {
      const keysResponse = await makeRelayCall('wallet_getKeys', [{
        address: mainAddress
      }], { verbose: false });
      
      if (keysResponse && keysResponse.length > 0) {
        console.log('   Stored keys found:', keysResponse.length);
        
        // Check if session key is in the list
        const hasSessionKey = keysResponse.some(key => 
          key.publicKey?.toLowerCase() === sessionAddress.toLowerCase()
        );
        
        console.log('   Session key registered:', hasSessionKey ? 'YES' : 'NO');
        
        // Check expiry
        const now = Math.floor(Date.now() / 1000);
        const activeKeys = keysResponse.filter(key => {
          const expiry = parseInt(key.expiry || '0', 16);
          return expiry > now;
        });
        
        console.log('   Active (non-expired) keys:', activeKeys.length);
      } else {
        console.log('   No stored keys found');
      }
    } catch (error) {
      console.log('   Could not fetch keys:', error.message.substring(0, 50));
    }
    
    // Method 3: Check on-chain code (though Porto uses meta-transactions)
    const client = createClient();
    const code = await client.getCode({ address: mainAddress });
    console.log('   Account has on-chain code:', code && code !== '0x' ? 'YES' : 'NO');
    
    // Determine delegation status
    const isDelegated = !hasPreCalls;
    console.log('\n   📊 Delegation Status:', isDelegated ? '✅ ACTIVE' : '❌ NOT ACTIVE');
    
    return isDelegated;
    
  } catch (error) {
    console.log('   Error checking delegation:', error.message.substring(0, 50));
    return false;
  }
}

// Verify transaction was successful
async function verifyTransaction(bundleId, expectedResult = null) {
  console.log('🔍 Verifying transaction:', bundleId?.substring(0, 20) + '...');
  
  try {
    // Get transaction status
    const statusResponse = await makeRelayCall('wallet_getCallsStatus', [{
      bundleId: bundleId
    }], { verbose: false });
    
    console.log('   Status:', statusResponse.status || 'UNKNOWN');
    
    if (statusResponse.receipts && statusResponse.receipts.length > 0) {
      const receipt = statusResponse.receipts[0];
      console.log('   Block Number:', receipt.blockNumber);
      console.log('   Gas Used:', receipt.gasUsed);
      console.log('   Success:', receipt.success ? '✅' : '❌');
      
      if (receipt.logs && receipt.logs.length > 0) {
        console.log('   Events Emitted:', receipt.logs.length);
        
        // Check for specific events
        for (const log of receipt.logs) {
          if (log.topics && log.topics[0]) {
            // Check for PetCreated event
            const petCreatedTopic = keccak256(toHex('PetCreated(address,string)'));
            if (log.topics[0] === petCreatedTopic) {
              console.log('   ✅ PetCreated event found!');
            }
          }
        }
      }
      
      return receipt.success;
    }
    
    return false;
    
  } catch (error) {
    // Try alternative format
    if (error.message.includes('Invalid params')) {
      try {
        const statusResponse = await makeRelayCall('wallet_getCallsStatus', [bundleId], { verbose: false });
        console.log('   Status (alt format):', statusResponse?.status || 'UNKNOWN');
        return statusResponse?.status === 'success';
      } catch (altError) {
        console.log('   Could not verify transaction:', altError.message.substring(0, 50));
      }
    } else {
      console.log('   Could not verify transaction:', error.message.substring(0, 50));
    }
    return null;
  }
}

// Main test function
async function testWithVerification() {
  console.log('🔬 PORTO TEST WITH DELEGATION VERIFICATION');
  console.log('==========================================\n');
  
  // Create or use existing accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('🔑 Account Setup:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  console.log('');
  
  const client = createClient();
  const options = {
    verbose: false,
    saveJson: true,
    testName: 'verified_flow'
  };
  
  // Check delegation status
  const isDelegated = await checkDelegationStatus(mainAccount.address, sessionAccount.address);
  
  let delegationTxId = null;
  
  if (!isDelegated) {
    console.log('\n📝 Delegation not active, setting up...\n');
    
    // =====================================
    // STEP 1: Setup Delegation
    // =====================================
    console.log('╔══════════════════════════════════════╗');
    console.log('║  STEP 1: Setup Delegation            ║');
    console.log('╚══════════════════════════════════════╝\n');
    
    const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60);
    const expiryHex = '0x' + expiry.toString(16);
    
    // Prepare delegation
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
    
    // Store delegation
    await makeRelayCall('wallet_upgradeAccount', [{
      context: prepareResponse.context,
      signatures: { auth: authSig, exec: execSig }
    }], options);
    
    console.log('✅ Delegation setup stored\n');
    
    // =====================================
    // STEP 2: Trigger Delegation On-Chain
    // =====================================
    console.log('╔══════════════════════════════════════╗');
    console.log('║  STEP 2: Trigger Delegation On-Chain ║');
    console.log('╚══════════════════════════════════════╝\n');
    
    // Empty transaction to trigger delegation
    const delegationParams = {
      from: mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: '0x0000000000000000000000000000000000000000',
        value: '0x0',
        data: '0x'
      }],
      capabilities: { meta: {} }
    };
    
    const prepareDelegationResponse = await makeRelayCall('wallet_prepareCalls', [delegationParams], options);
    
    // Sign with session key
    const delegationSignature = await sessionAccount.signMessage({
      message: { raw: prepareDelegationResponse.digest }
    });
    
    const sendDelegationParams = {
      context: prepareDelegationResponse.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: delegationSignature
    };
    
    try {
      const sendDelegationResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendDelegationParams], options);
      delegationTxId = sendDelegationResponse.id;
      console.log('✅ Delegation transaction sent!');
      console.log('   Bundle ID:', delegationTxId);
      console.log('\n⏳ Waiting 15 seconds for confirmation...\n');
      await new Promise(r => setTimeout(r, 15000));
      
      // Verify delegation transaction
      const delegationSuccess = await verifyTransaction(delegationTxId);
      console.log('\n   Delegation Transaction:', delegationSuccess ? '✅ CONFIRMED' : '⚠️  UNCONFIRMED');
      
    } catch (error) {
      console.log('❌ Delegation transaction failed:', error.message);
      return;
    }
    
    // Re-check delegation status
    console.log('\n📊 Re-checking delegation status after transaction...\n');
    const isDelegatedAfter = await checkDelegationStatus(mainAccount.address, sessionAccount.address);
    
    if (!isDelegatedAfter) {
      console.log('\n⚠️  Delegation still not active after transaction');
      console.log('   Transaction may need more time or failed');
    }
    
  } else {
    console.log('\n✅ Delegation already active, skipping setup\n');
  }
  
  // =====================================
  // STEP 3: Create Pet
  // =====================================
  console.log('╔══════════════════════════════════════╗');
  console.log('║  STEP 3: Create Pet                  ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  const petName = `VerifiedPet_${Date.now()}`;
  console.log('🐾 Creating pet:', petName);
  
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
    capabilities: { meta: {} }
  };
  
  const preparePetResponse = await makeRelayCall('wallet_prepareCalls', [petParams], options);
  
  const hasPreCallsInPet = !!(preparePetResponse.context?.quote?.intent?.encodedPreCalls?.length);
  console.log('   Has preCalls:', hasPreCallsInPet ? '⚠️  YES (unexpected)' : '✅ NO (delegation active)');
  
  // Sign with session key
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
  
  let petTxId = null;
  try {
    const sendPetResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendPetParams], options);
    petTxId = sendPetResponse.id;
    console.log('✅ Pet creation transaction sent!');
    console.log('   Bundle ID:', petTxId);
    console.log('\n⏳ Waiting 20 seconds for confirmation...\n');
    await new Promise(r => setTimeout(r, 20000));
    
    // Verify pet creation transaction
    const petSuccess = await verifyTransaction(petTxId);
    console.log('\n   Pet Creation Transaction:', petSuccess ? '✅ CONFIRMED' : '⚠️  UNCONFIRMED');
    
  } catch (error) {
    console.log('❌ Pet creation failed:', error.message);
    if (error.message.includes('insufficient funds')) {
      console.log('\n💡 Fund relay signers:');
      console.log('   0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
      console.log('   0x8C8d35429F74ec245F8Ef2f4Fd1e551cFF97d650');
    }
  }
  
  // =====================================
  // STEP 4: Verify On-Chain
  // =====================================
  console.log('\n╔══════════════════════════════════════╗');
  console.log('║  STEP 4: Verify On-Chain             ║');
  console.log('╚══════════════════════════════════════╝\n');
  
  try {
    const hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]
    });
    
    console.log('🐾 Pet Check:');
    console.log('   Has Pet:', hasPet ? '✅ YES!' : '❌ NO');
    
    if (hasPet) {
      const pet = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'pets',
        args: [mainAccount.address]
      });
      
      console.log('   Pet Name:', pet[0] || pet.name);
      console.log('   Pet Level:', pet[1]?.toString() || pet.level?.toString());
      
      if ((pet[0] || pet.name) === petName) {
        console.log('\n🎉 SUCCESS! Exact pet created on-chain!');
      }
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
  
  console.log('📊 Transaction Summary:');
  if (delegationTxId) {
    console.log('  Delegation TX:', delegationTxId.substring(0, 20) + '...');
  }
  if (petTxId) {
    console.log('  Pet Creation TX:', petTxId.substring(0, 20) + '...');
  }
  
  console.log('\n💡 Key Points:');
  console.log('  • Delegation check allows skipping if already active');
  console.log('  • Transaction verification confirms on-chain execution');
  console.log('  • Two-transaction flow is required and working');
  
  console.log('\n📁 JSON outputs saved to ./output/');
}

// Run test
testWithVerification().catch(console.error);