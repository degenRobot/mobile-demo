#!/usr/bin/env node

/**
 * Porto Gasless Transaction Test - Debug Version
 * 
 * Includes additional debugging to understand what's happening
 */

import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { CONFIG, makeRelayCall, createClient } from './lib/porto-utils-enhanced.js';
import FrenPetSimpleJson from '../contracts/out/FrenPetSimple.sol/FrenPetSimple.json' with { type: 'json' };

const FRENPET_SIMPLE_ADDRESS = '0x3fde139a94eef14c4eba229fdc80a54f7f5fbf25';
const ETH_ADDRESS = '0x0000000000000000000000000000000000000000';

async function testGaslessDebug() {
  console.log('🚀 PORTO GASLESS TRANSACTION TEST (DEBUG)');
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
  
  // Step 1: Register Delegation
  console.log('\n📝 Step 1: Register Delegation');
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
  
  console.log('  Calling wallet_prepareUpgradeAccount...');
  const prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams]);
  console.log('  ✅ Prepared upgrade');
  console.log('  PreCall in context:', prepareResponse.context.preCall ? 'Yes' : 'No');
  
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
  
  console.log('  Calling wallet_upgradeAccount...');
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResponse.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
  
  console.log('  ✅ Delegation registered');
  
  // Wait a moment for the relay to process
  console.log('\n  Waiting 2 seconds for relay to process...');
  await new Promise(r => setTimeout(r, 2000));
  
  // Step 2: Try different approaches
  console.log('\n📝 Step 2: Testing Transaction Approaches');
  console.log('-'.repeat(40));
  
  const petName = `DebugPet_${Date.now()}`;
  const createPetCalldata = encodeFunctionData({
    abi: FrenPetSimpleJson.abi,
    functionName: 'createPet',
    args: [petName]
  });
  
  // Approach 1: Standard (let relay auto-handle)
  console.log('\n  Approach 1: Standard (relay auto-handles preCalls)');
  try {
    const params1 = {
      from: mainAccount.address,
      chainId: CONFIG.CHAIN_ID,
      calls: [{
        to: FRENPET_SIMPLE_ADDRESS,
        value: '0x0',
        data: createPetCalldata
      }],
      capabilities: {
        meta: {
          feeToken: ETH_ADDRESS
        }
      }
    };
    
    console.log('  Calling wallet_prepareCalls...');
    const prepare1 = await makeRelayCall('wallet_prepareCalls', [params1]);
    console.log('  ✅ Success!');
    console.log('  PreCalls:', prepare1.context?.quote?.intent?.encodedPreCalls?.length || 0);
    
    const sig1 = await sessionAccount.signMessage({
      message: { raw: prepare1.digest }
    });
    
    const send1 = await makeRelayCall('wallet_sendPreparedCalls', [{
      context: prepare1.context,
      key: {
        prehash: false,
        publicKey: sessionAccount.address,
        type: 'secp256k1'
      },
      signature: sig1
    }]);
    
    console.log('  ✅ TX sent:', send1.id);
    
  } catch (error) {
    console.log('  ❌ Failed:', error.message);
    
    // Try with preCall:false
    console.log('\n  Approach 2: With preCall:false');
    try {
      const params2 = {
        from: mainAccount.address,
        chainId: CONFIG.CHAIN_ID,
        calls: [{
          to: FRENPET_SIMPLE_ADDRESS,
          value: '0x0',
          data: createPetCalldata
        }],
        capabilities: {
          meta: {
            feeToken: ETH_ADDRESS
          },
          preCall: false  // Explicitly disable
        }
      };
      
      console.log('  Calling wallet_prepareCalls with preCall:false...');
      const prepare2 = await makeRelayCall('wallet_prepareCalls', [params2]);
      console.log('  ✅ Success!');
      console.log('  PreCalls:', prepare2.context?.quote?.intent?.encodedPreCalls?.length || 0);
      
      const sig2 = await sessionAccount.signMessage({
        message: { raw: prepare2.digest }
      });
      
      const send2 = await makeRelayCall('wallet_sendPreparedCalls', [{
        context: prepare2.context,
        key: {
          prehash: false,
          publicKey: sessionAccount.address,
          type: 'secp256k1'
        },
        signature: sig2
      }]);
      
      console.log('  ✅ TX sent:', send2.id);
      
    } catch (error2) {
      console.log('  ❌ Also failed:', error2.message);
      
      // Try a simple transfer instead
      console.log('\n  Approach 3: Simple self-transfer');
      try {
        const params3 = {
          from: mainAccount.address,
          chainId: CONFIG.CHAIN_ID,
          calls: [{
            to: mainAccount.address,  // Self-transfer
            value: '0x0',
            data: '0x'
          }],
          capabilities: {
            meta: {
              feeToken: ETH_ADDRESS
            }
          }
        };
        
        console.log('  Calling wallet_prepareCalls for self-transfer...');
        const prepare3 = await makeRelayCall('wallet_prepareCalls', [params3]);
        console.log('  ✅ Success!');
        console.log('  PreCalls:', prepare3.context?.quote?.intent?.encodedPreCalls?.length || 0);
        
        const sig3 = await sessionAccount.signMessage({
          message: { raw: prepare3.digest }
        });
        
        const send3 = await makeRelayCall('wallet_sendPreparedCalls', [{
          context: prepare3.context,
          key: {
            prehash: false,
            publicKey: sessionAccount.address,
            type: 'secp256k1'
          },
          signature: sig3
        }]);
        
        console.log('  ✅ TX sent:', send3.id);
        
      } catch (error3) {
        console.log('  ❌ Even self-transfer failed:', error3.message);
      }
    }
  }
  
  // Wait for any successful transaction
  console.log('\n⏳ Waiting 15 seconds for confirmation...');
  await new Promise(r => setTimeout(r, 15000));
  
  // Check results
  const finalBalance = await client.getBalance({ address: mainAccount.address });
  const code = await client.getCode({ address: mainAccount.address });
  const hasCode = code && code !== '0x';
  
  let hasPet = false;
  try {
    hasPet = await client.readContract({
      address: FRENPET_SIMPLE_ADDRESS,
      abi: FrenPetSimpleJson.abi,
      functionName: 'hasPet',
      args: [mainAccount.address]
    });
  } catch (e) {}
  
  console.log('\n' + '=' .repeat(60));
  console.log('🎯 RESULTS');
  console.log('  Balance unchanged:', finalBalance <= initialBalance ? '✅ Yes' : '❌ No');
  console.log('  Delegation deployed:', hasCode ? '✅ Yes' : '❌ No');
  console.log('  Pet created:', hasPet ? '✅ Yes' : '❌ No');
  console.log('=' .repeat(60));
}

// Run test
testGaslessDebug().catch(console.error);