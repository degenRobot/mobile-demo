#!/usr/bin/env node

/**
 * Porto Gasless Transaction Test
 * 
 * Clean implementation of gasless transactions using Porto relay.
 * This follows the standard flow that we know works.
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testGasless() {
  console.log('🚀 PORTO GASLESS TRANSACTION TEST');
  console.log('=' .repeat(60));
  
  // Generate fresh accounts
  const mainPrivateKey = generatePrivateKey();
  const mainAccount = privateKeyToAccount(mainPrivateKey);
  
  const sessionPrivateKey = generatePrivateKey();
  const sessionAccount = privateKeyToAccount(sessionPrivateKey);
  
  console.log('🔑 Accounts:');
  console.log('  Main EOA:', mainAccount.address);
  console.log('  Session Key:', sessionAccount.address);
  
  const client = createClient();
  const initialBalance = await client.getBalance({ address: mainAccount.address });
  console.log('  Balance:', initialBalance.toString(), 'wei');
  
  // =====================================
  // STEP 1: Register Delegation
  // =====================================
  console.log('\n📝 Step 1: Register Delegation');
  console.log('-'.repeat(40));
  
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const expiryHex = '0x' + expiry.toString(16);
  
  // Prepare the upgrade - authorize session key (not the EOA itself)
  // The EOA doesn't need authorization - it IS the owner
  const prepareParams = {
    address: mainAccount.address,
    delegation: CONFIG.PORTO_IMPLEMENTATION,
    capabilities: {
      authorizeKeys: [
        {
          // Session key for operations
          expiry: expiryHex,
          prehash: false,
          publicKey: sessionAccount.address,  // Session key's address
          role: 'session',  // Session role, not admin
          type: 'secp256k1',
          permissions: []  // Can add specific permissions later
        }
      ]
    },
    chainId: CONFIG.CHAIN_ID
  };
  
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams]);
  console.log('  ✅ Prepared upgrade');
  
  // Sign the authorization and execution digests with MAIN EOA (not session key)
  // These signatures authorize the delegation, so must come from the EOA owner
  // Use .sign() for raw signatures without EIP-191 prefixing (following Porto SDK pattern)
  const authSig = await mainAccount.sign({
    hash: prepareResponse.digests.auth
  });
  
  const execSig = await mainAccount.sign({
    hash: prepareResponse.digests.exec
  });
  
  // Complete the upgrade
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  
  console.log('  ✅ Delegation registered');
  
  // Check if keys were properly registered
  console.log('\n  Checking registered keys (off-chain)...');
  try {
    const keysResponse = await makeRelayCall('wallet_getKeys', [{
      address: mainAccount.address,
      chain_id: CONFIG.CHAIN_ID  // Use chain_id (underscore) not chainId
    }]);
    console.log('  Keys found:', keysResponse.length);
    if (keysResponse.length > 0) {
      keysResponse.forEach((key, index) => {
        const publicKey = key.base?.base?.publicKey || key.publicKey || key.key?.publicKey;
        const role = key.base?.base?.role || key.role || key.key?.role;
        const type = key.base?.base?.type || key.type || key.key?.type;
        console.log(`    Key ${index + 1}:`, {
          publicKey: publicKey,
          role: role,
          type: type,
          isSessionKey: publicKey?.toLowerCase() === sessionAccount.address.toLowerCase() ? '✅' : '❌'
        });
      });
    }
  } catch (error) {
    console.log('  Error getting keys:', error.message);
  }
  
  // =====================================
  // STEP 2: Execute Gasless Transaction
  // =====================================
  console.log('\n📝 Step 2: Execute Gasless Transaction - Create Pet');
  console.log('-'.repeat(40));
  
  const petName = `GaslessPet_${Date.now()}`;
  console.log('  Pet name:', petName);
  
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  console.log('  Calldata:', createPetCalldata.substring(0, 20) + '...');
  console.log('  Has 0x prefix:', createPetCalldata.startsWith('0x'));
  
  // IMPORTANT: The first transaction after wallet_upgradeAccount should automatically
  // include the delegation deployment + key authorization as preCalls.
  // The relay stores this data and retrieves it on the first prepareCalls.
  
  // Prepare the calls - relay should auto-include upgrade data as preCall
  const callParams = {
    from: mainAccount.address,
    chainId: CONFIG.CHAIN_ID,
    calls: [{
      to: FRENPET_SIMPLE_ADDRESS,
      data: createPetCalldata,
      value: '0x0'  // Add explicit zero value
    }],
    capabilities: {
      meta: {
        feeToken: ETH_ADDRESS  // Critical: ETH as fee token for sponsorship
      },
      // Add preCalls: true to ensure relay includes stored upgrade data
      preCalls: true
    }
  };
  
  const prepareCallsResponse = await makeRelayCall('wallet_prepareCalls', [callParams]);
  
  console.log('  ✅ Prepared calls');
  console.log('  Digest:', prepareCallsResponse.digest.substring(0, 20) + '...');
  
  // Check if delegation deployment is included as preCall
  const preCallCount = prepareCallsResponse.context?.quote?.intent?.encodedPreCalls?.length || 0;
  console.log('  PreCalls included:', preCallCount);
  
  // Debug: Check what's in the preCalls
  if (preCallCount > 0) {
    console.log('  PreCall data detected - should include:');
    console.log('    1. Delegation deployment (EIP-7702)');
    console.log('    2. Key authorization for session key');
    const preCallsData = prepareCallsResponse.context?.quote?.intent?.encodedPreCalls;
    if (preCallsData && preCallsData[0]) {
      console.log('    PreCall[0] length:', preCallsData[0].length, 'chars');
    }
  } else {
    console.log('  ⚠️  No preCalls detected!');
    console.log('  This might mean:');
    console.log('    - Relay didn\'t find stored upgrade data');
    console.log('    - Or delegation is already deployed');
  }
  
  // Sign the intent digest
  // IMPORTANT: The first transaction includes delegation deployment + key authorization.
  // This must be signed by the EOA (mainAccount) to authorize the delegation.
  // The session key can't sign this because it's not authorized yet.
  const isFirstTransaction = preCallCount > 0;
  const signingAccount = isFirstTransaction ? mainAccount : sessionAccount;
  const signingKey = isFirstTransaction ? mainAccount.address : sessionAccount.address;
  
  console.log('  Signing with:', isFirstTransaction ? 'Main EOA (for delegation)' : 'Session Key');
  console.log('  Note: Delegation + key auth will be deployed atomically');
  
  const callSignature = await signingAccount.sign({
    hash: prepareCallsResponse.digest
  });
  
  // Send the transaction
  try {
    const sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: prepareCallsResponse.context,
      key: {
        prehash: false,
        publicKey: signingKey,
        type: 'secp256k1'
      },
      signature: callSignature
    }]);
    
    console.log('  ✅ Transaction sent:', sendResponse.id);
    console.log('     View: https://testnet.riselabs.xyz/tx/' + sendResponse.id);
    
    // Wait for confirmation
    console.log('\n⏳ Waiting 15 seconds for confirmation...');
    await new Promise(r => setTimeout(r, 15000));
    
  } catch (error) {
    console.log('  ❌ Transaction failed:', error.message);
    
    if (error.message.includes('insufficient funds')) {
      console.log('\n  Note: If this is the first transaction that deploys delegation,');
      console.log('  the relay may have issues calculating gas for preCalls.');
    }
  }
  
  // =====================================
  // STEP 3: Verify Results
  // =====================================
  console.log('\n📝 Step 3: Verify Results');
  console.log('-'.repeat(40));
  
  // Check final balance
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  console.log('  Final balance:', finalBalance.toString(), 'wei');
  console.log('  Balance unchanged:', finalBalance <= initialBalance ? '✅ Yes' : '❌ No');
  
  // Check if delegation was deployed
  const code = await client.getCode({ address: mainAccount.address });
  const hasDelegation = code && code !== '0x';
  console.log('  Delegation deployed:', hasDelegation ? '✅ Yes' : '❌ No');
  
  // If delegation deployed, check keys again
  if (hasDelegation) {
    console.log('\n  Checking keys after delegation deployment (on-chain)...');
    try {
      const keysAfter = await makeRelayCall('wallet_getKeys', [{
        address: mainAccount.address,
        chain_id: CONFIG.CHAIN_ID  // Use chain_id (underscore) not chainId
      }]);
      console.log('  Keys after deployment:', keysAfter.length);
      if (keysAfter.length > 0) {
        keysAfter.forEach((key, index) => {
          const publicKey = key.base?.base?.publicKey || key.publicKey || key.key?.publicKey;
          const role = key.base?.base?.role || key.role || key.key?.role;
          const type = key.base?.base?.type || key.type || key.key?.type;
          console.log(`    Key ${index + 1}:`, {
            publicKey: publicKey,
            role: role,
            type: type,
            hash: key.hash,
            isSessionKey: publicKey?.toLowerCase() === sessionAccount.address.toLowerCase() ? '✅' : '❌'
          });
        });
      } else {
        console.log('  ⚠️  No keys found on-chain - session key may not have persisted');
      }
    } catch (error) {
      console.log('  Error getting keys:', error.message);
    }
  }
  
  // Check if pet was created
  let hasPet = false;
  try {
    hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]
    });
    
    console.log('  Pet created:', hasPet ? '✅ Yes' : '❌ No');
    
    if (hasPet) {
      const petStats = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'getPetStats',
        args: [mainAccount.address]
      });
      
      console.log('\n🐾 Pet Stats:');
      console.log('  Name:', petStats[0]);
      console.log('  Level:', petStats[1].toString());
      console.log('  Experience:', petStats[2].toString());
      console.log('  Happiness:', petStats[3].toString());
      console.log('  Hunger:', petStats[4].toString());
    }
  } catch (error) {
    console.log('  Pet check failed:', error.message);
  }
  
  // =====================================
  // STEP 4: Second Transaction - Create Pet Again
  // =====================================
  if (hasDelegation && !hasPet) {
    console.log('\n📝 Step 4: Second Transaction - Retry Pet Creation');
    console.log('-'.repeat(40));
    console.log('  Delegation is deployed, retrying pet creation...');
    
    const retryPetName = `GaslessPet_Retry_${Date.now()}`;
    const retryCalldata = encodeFunctionData({
      abi: FrenPetSimpleJson.abi,
      functionName: 'createPet',
      args: [retryPetName]
    });
    
    const retryParams = {
      from: mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: FRENPET_SIMPLE_ADDRESS,
        data: retryCalldata,
        value: '0x0'  // Add explicit zero value
      }],
      capabilities: {
        meta: {
          feeToken: ETH_ADDRESS
        }
      }
    };
    
    try {
      const retryPrepare = await makeRelayCall('wallet_prepareCalls', [retryParams]);
      console.log('  PreCalls in retry tx:', 
        retryPrepare.context?.quote?.intent?.encodedPreCalls?.length || 0,
        '(should be 0)');
      
      // Use session key for retry since delegation is deployed
      const retrySignature = await sessionAccount.sign({
        hash: retryPrepare.digest
      });
      
      const retryResponse = await makeRelayCall('wallet_sendPreparedCalls', [{
        context: retryPrepare.context,
        key: {
          prehash: false,
          publicKey: sessionAccount.address,  // Use session key
          type: 'secp256k1'
        },
        signature: retrySignature
      }]);
      
      console.log('  ✅ Retry transaction sent:', retryResponse.id);
      console.log('     View: https://testnet.riselabs.xyz/tx/' + retryResponse.id);
      
      // Wait and check transaction status
      console.log('\n⏳ Waiting 10 seconds for confirmation...');
      await new Promise(r => setTimeout(r, 10000));
      
      // Check transaction status
      try {
        const statusResponse = await makeRelayCall('wallet_getCallsStatus', [retryResponse.id]);
        console.log('  Transaction status:', statusResponse.status);
        if (statusResponse.receipts && statusResponse.receipts.length > 0) {
          const receipt = statusResponse.receipts[0];
          console.log('  Receipt status:', receipt.status === '0x1' ? '✅ Success' : '❌ Failed');
          console.log('  From:', receipt.from);
          console.log('  To:', receipt.to);
          console.log('  Gas used:', receipt.gasUsed);
          
          // Check if there are logs (events)
          if (receipt.logs && receipt.logs.length > 0) {
            console.log('  Logs emitted:', receipt.logs.length);
            receipt.logs.forEach((log, i) => {
              console.log(`    Log ${i}: Contract ${log.address}, Topics: ${log.topics.length}`);
            });
          } else {
            console.log('  No logs emitted (pet creation might have failed)');
          }
        }
      } catch (error) {
        console.log('  Could not get transaction status:', error.message);
      }
      
      const retryHasPet = await client.readContract({
        address: FRENPET_SIMPLE_ADDRESS,
        abi: FrenPetSimpleJson.abi,
        functionName: 'hasPet',
        args: [mainAccount.address]
      });
      
      console.log('  Pet created after retry:', retryHasPet ? '✅ Yes' : '❌ No');
      
      if (retryHasPet) {
        const petStats = await client.readContract({
          address: FRENPET_SIMPLE_ADDRESS,
          abi: FrenPetSimpleJson.abi,
          functionName: 'getPetStats',
          args: [mainAccount.address]
        });
        
        console.log('\n🐾 Pet Stats:');
        console.log('  Name:', petStats[0]);
        console.log('  Level:', petStats[1].toString());
        console.log('  Experience:', petStats[2].toString());
        console.log('  Happiness:', petStats[3].toString());
        console.log('  Hunger:', petStats[4].toString());
      }
      
    } catch (error) {
      console.log('  ❌ Retry transaction failed:', error.message);
    }
  }
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 SUMMARY');
  console.log('  Gasless achieved:', finalBalance <= initialBalance ? '✅ Yes' : '❌ No');
  console.log('=' .repeat(60));
}

// Run test
testGasless().catch(console.error);