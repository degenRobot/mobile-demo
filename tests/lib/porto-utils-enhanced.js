/**
 * Enhanced Porto Relay Utilities
 * Common functions with detailed logging and output inspection
 */

import { createPublicClient, http, parseAbi, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';

// =====================================
// CONFIGURATION
// =====================================

export const CONFIG = {
  PORTO_URL: 'https://rise-testnet-porto.fly.dev',
  CHAIN_ID: 11155931,
  RPC_URL: 'https://testnet.riselabs.xyz',
  
  // Porto contracts
  PORTO_ORCHESTRATOR: '0x046832405512d508b873e65174e51613291083bc',
  PORTO_IMPLEMENTATION: '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9', // delegation_implementation from relay.toml
  PORTO_RELAY_WALLET: '0x584B5274765a7F7C78FDc960248f38e5Ad6b1EDb',
  PORTO_PROXY: '0xf463d5cbc64916caa2775a8e9b264f8c35f4b8a4',
  
  // FrenPetSimple contract (NON-PAYABLE)
  FRENPET_ADDRESS: '0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25',
};

// FrenPetSimple ABI (non-payable functions)
export const FRENPET_ABI = parseAbi([
  'function createPet(string name) external',
  'function feedPet() external',
  'function playWithPet() external',
  'function hasPet(address owner) external view returns (bool)',
  'function getPetStats(address owner) external view returns (string name, uint256 level, uint256 experience, uint256 happiness, uint256 hunger, bool isAlive)'
]);

// Test accounts
export const TEST_ACCOUNTS = {
  MAIN: privateKeyToAccount('0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80'),
  SESSION: privateKeyToAccount('0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d'),
  THIRD: privateKeyToAccount('0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a'),
};

// =====================================
// ENHANCED PORTO RELAY FUNCTIONS
// =====================================

/**
 * Save data to JSON file
 * @param {string} filename - Filename without extension
 * @param {any} data - Data to save
 */
export function saveToJson(filename, data) {
  const outputDir = join(process.cwd(), 'output');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
  const filepath = join(outputDir, `${filename}_${timestamp}.json`);
  
  writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`💾 Saved to: output/${filename}_${timestamp}.json`);
}

/**
 * Make a Porto relay RPC call with enhanced logging
 * @param {string} method - RPC method name
 * @param {any} params - Method parameters
 * @param {Object} options - Options for the call
 * @returns {Promise<any>} - RPC result
 */
export async function makeRelayCall(method, params, options = {}) {
  const { verbose = false, saveJson = false, testName = 'test' } = options;
  
  if (verbose) {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📡 CALLING: ${method}`);
    console.log(`${'='.repeat(60)}`);
    console.log('\n📥 REQUEST:');
    console.log(JSON.stringify(params, null, 2));
  }
  
  const startTime = Date.now();
  const response = await fetch(CONFIG.PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id: Date.now()
    })
  });
  
  const result = await response.json();
  const duration = Date.now() - startTime;
  
  if (result.error) {
    if (verbose) {
      console.log('\n❌ ERROR:');
      console.log(JSON.stringify(result.error, null, 2));
      console.log(`\n⏱️  Duration: ${duration}ms`);
    }
    
    if (saveJson) {
      saveToJson(`${testName}_${method}_error`, {
        method,
        params,
        error: result.error,
        duration
      });
    }
    
    throw new Error(`${method}: ${result.error.message} (${result.error.data || ''})`);
  }
  
  if (verbose) {
    console.log('\n✅ RESPONSE:');
    console.log(JSON.stringify(result.result, null, 2));
    console.log(`\n⏱️  Duration: ${duration}ms`);
  }
  
  if (saveJson) {
    saveToJson(`${testName}_${method}_success`, {
      method,
      params,
      result: result.result,
      duration
    });
  }
  
  return result.result;
}

/**
 * Inspect and validate Porto response
 * @param {string} method - Method name for context
 * @param {any} response - Response to inspect
 * @returns {Object} - Inspection results
 */
export function inspectResponse(method, response) {
  const inspection = {
    method,
    hasData: !!response,
    fields: response ? Object.keys(response) : [],
    analysis: {}
  };
  
  switch (method) {
    case 'wallet_prepareUpgradeAccount':
      inspection.analysis = {
        hasDigests: !!response?.digests,
        hasContext: !!response?.context,
        hasTypedData: !!response?.typedData,
        authDigest: response?.digests?.auth,
        execDigest: response?.digests?.exec,
        contextAddress: response?.context?.address,
        chainId: response?.context?.chainId,
        hasAuthorization: !!response?.context?.authorization,
        hasPreCall: !!response?.context?.preCall
      };
      break;
      
    case 'wallet_upgradeAccount':
      inspection.analysis = {
        isNull: response === null,
        // Porto returns null on success
        success: response === null
      };
      break;
      
    case 'wallet_prepareCalls':
      inspection.analysis = {
        hasDigest: !!response?.digest,
        hasContext: !!response?.context,
        hasTypedData: !!response?.typedData,
        hasQuote: !!response?.context?.quote,
        payer: response?.context?.quote?.intent?.payer,
        combinedGas: response?.context?.quote?.intent?.combinedGas,
        hasPreCalls: !!(response?.context?.quote?.intent?.encodedPreCalls?.length),
        numPreCalls: response?.context?.quote?.intent?.encodedPreCalls?.length || 0,
        callValue: response?.typedData?.message?.calls?.[0]?.value
      };
      break;
      
    case 'wallet_sendPreparedCalls':
      inspection.analysis = {
        hasId: !!response?.id,
        bundleId: response?.id || response,
        // Sometimes returns just the string ID
        isString: typeof response === 'string'
      };
      break;
      
    case 'wallet_getCallsStatus':
      inspection.analysis = {
        status: response?.status,
        hasReceipts: !!(response?.receipts?.length),
        numReceipts: response?.receipts?.length || 0,
        transactionSuccess: response?.receipts?.[0]?.status === '0x1',
        from: response?.receipts?.[0]?.from,
        to: response?.receipts?.[0]?.to,
        blockNumber: response?.receipts?.[0]?.blockNumber
      };
      break;
  }
  
  return inspection;
}

/**
 * Register an account with Porto using enhanced flow
 * @param {any} account - Viem account object
 * @param {Object} options - Options for logging
 * @returns {Promise<Object>} - Registration results
 */
export async function registerWithPortoEnhanced(account, options = {}) {
  const results = {
    prepareResponse: null,
    upgradeResponse: null,
    success: false,
    error: null
  };
  
  try {
    const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
    const expiryHex = '0x' + expiry.toString(16);
    
    // Step 1: Prepare upgrade account
    console.log('\n📝 STEP 1: wallet_prepareUpgradeAccount');
    const prepareParams = {
      address: account.address,
      delegation: CONFIG.PORTO_IMPLEMENTATION,
      capabilities: {
        authorizeKeys: [{
          expiry: expiryHex,
          prehash: false,
          publicKey: account.address,
          role: 'admin',
          type: 'secp256k1',
          permissions: []
        }]
      },
      chainId: CONFIG.CHAIN_ID
    };
    
    results.prepareResponse = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams], options);
    
    // Inspect the response
    const prepareInspection = inspectResponse('wallet_prepareUpgradeAccount', results.prepareResponse);
    console.log('\n🔍 Inspection:', prepareInspection.analysis);
    
    // Step 2: Sign authorization
    console.log('\n🖊️  STEP 2: Signing authorization...');
    const authSig = await account.signMessage({
      message: { raw: results.prepareResponse.digests.auth }
    });
    console.log('Auth signature:', authSig.substring(0, 20) + '...');
    
    // Sign execution
    const domain = {
      ...results.prepareResponse.typedData.domain,
      chainId: typeof results.prepareResponse.typedData.domain.chainId === 'string' 
        ? parseInt(results.prepareResponse.typedData.domain.chainId, 16)
        : results.prepareResponse.typedData.domain.chainId,
    };
    
    const execSig = await account.signTypedData({
      domain,
      types: results.prepareResponse.typedData.types,
      primaryType: results.prepareResponse.typedData.primaryType,
      message: results.prepareResponse.typedData.message,
    });
    console.log('Exec signature:', execSig.substring(0, 20) + '...');
    
    // Step 3: Upgrade account
    console.log('\n💾 STEP 3: wallet_upgradeAccount');
    const upgradeParams = {
      context: results.prepareResponse.context,
      signatures: {
        auth: authSig,
        exec: execSig
      }
    };
    
    results.upgradeResponse = await makeRelayCall('wallet_upgradeAccount', [upgradeParams], options);
    
    // Inspect the response
    const upgradeInspection = inspectResponse('wallet_upgradeAccount', results.upgradeResponse);
    console.log('\n🔍 Inspection:', upgradeInspection.analysis);
    
    results.success = true;
    
  } catch (error) {
    results.error = error.message;
    throw error;
  }
  
  return results;
}

/**
 * Send a gasless transaction with enhanced flow
 * @param {any} account - Viem account object
 * @param {Array} calls - Array of call objects [{to, data, value?}]
 * @param {Object} options - Options for logging
 * @returns {Promise<Object>} - Transaction results
 */
export async function sendGaslessTransactionEnhanced(account, calls, options = {}) {
  const results = {
    prepareResponse: null,
    sendResponse: null,
    statusResponse: null,
    bundleId: null,
    success: false,
    error: null
  };
  
  try {
    // Step 1: Prepare calls
    console.log('\n📋 STEP 1: wallet_prepareCalls');
    const prepareParams = {
      from: account.address,
      chainId: CONFIG.CHAIN_ID,
      calls,
      capabilities: {
        meta: options.meta || {}
      }
    };
    
    results.prepareResponse = await makeRelayCall('wallet_prepareCalls', [prepareParams], options);
    
    // Inspect the response
    const prepareInspection = inspectResponse('wallet_prepareCalls', results.prepareResponse);
    console.log('\n🔍 Inspection:', prepareInspection.analysis);
    
    // Check for important fields
    if (prepareInspection.analysis.hasPreCalls) {
      console.log(`⚠️  Transaction includes ${prepareInspection.analysis.numPreCalls} pre-call(s) (delegation setup)`);
    }
    if (prepareInspection.analysis.payer === '0x0000000000000000000000000000000000000000') {
      console.log('⚠️  Payer is zero address - relay will pay');
    }
    
    // Step 2: Sign the transaction
    console.log('\n🖊️  STEP 2: Signing transaction...');
    const signature = await account.signMessage({
      message: { raw: results.prepareResponse.digest }
    });
    console.log('Signature:', signature.substring(0, 20) + '...');
    
    // Step 3: Send prepared calls
    console.log('\n📤 STEP 3: wallet_sendPreparedCalls');
    const sendParams = {
      context: results.prepareResponse.context,
      key: {
        prehash: false,
        publicKey: account.address,
        type: 'secp256k1'
      },
      signature
    };
    
    results.sendResponse = await makeRelayCall('wallet_sendPreparedCalls', [sendParams], options);
    results.bundleId = results.sendResponse.id || results.sendResponse;
    
    // Inspect the response
    const sendInspection = inspectResponse('wallet_sendPreparedCalls', results.sendResponse);
    console.log('\n🔍 Inspection:', sendInspection.analysis);
    console.log('Bundle ID:', results.bundleId);
    
    // Step 4: Check status (optional)
    if (options.checkStatus) {
      console.log('\n⏳ Waiting for confirmation...');
      await new Promise(r => setTimeout(r, 5000));
      
      console.log('\n📊 STEP 4: wallet_getCallsStatus');
      results.statusResponse = await makeRelayCall('wallet_getCallsStatus', [results.bundleId], options);
      
      const statusInspection = inspectResponse('wallet_getCallsStatus', results.statusResponse);
      console.log('\n🔍 Inspection:', statusInspection.analysis);
    }
    
    results.success = true;
    
  } catch (error) {
    results.error = error.message;
    throw error;
  }
  
  return results;
}

// =====================================
// ORIGINAL UTILITY FUNCTIONS (kept for compatibility)
// =====================================

export async function registerWithPorto(account) {
  const options = { verbose: false, saveJson: false };
  const result = await registerWithPortoEnhanced(account, options);
  if (!result.success) throw new Error(result.error);
}

export async function sendGaslessTransaction(account, calls, opts = {}) {
  const options = { verbose: false, saveJson: false, ...opts };
  const result = await sendGaslessTransactionEnhanced(account, calls, options);
  if (!result.success) throw new Error(result.error);
  return result.bundleId;
}

export async function checkTransactionStatus(bundleId) {
  return await makeRelayCall('wallet_getCallsStatus', [bundleId]);
}

// =====================================
// BLOCKCHAIN UTILITIES
// =====================================

export function createClient() {
  return createPublicClient({
    chain: { 
      id: CONFIG.CHAIN_ID, 
      name: 'RISE Testnet', 
      nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 }, 
      rpcUrls: { default: { http: [CONFIG.RPC_URL] } } 
    },
    transport: http(CONFIG.RPC_URL)
  });
}

export async function hasPet(address) {
  const client = createClient();
  try {
    return await client.readContract({
      address: CONFIG.FRENPET_ADDRESS,
      abi: FRENPET_ABI,
      functionName: 'hasPet',
      args: [address]
    });
  } catch {
    return false;
  }
}

export async function getPetStats(address) {
  const client = createClient();
  try {
    const result = await client.readContract({
      address: CONFIG.FRENPET_ADDRESS,
      abi: FRENPET_ABI,
      functionName: 'getPetStats',
      args: [address]
    });
    
    return {
      name: result[0],
      level: result[1].toString(),
      experience: result[2].toString(),
      happiness: result[3].toString(),
      hunger: result[4].toString(),
      isAlive: result[5]
    };
  } catch {
    return null;
  }
}

export async function getBalance(address) {
  const client = createClient();
  return await client.getBalance({ address });
}

export function encodeFrenPetCall(functionName, args = []) {
  return encodeFunctionData({
    abi: FRENPET_ABI,
    functionName,
    args
  });
}