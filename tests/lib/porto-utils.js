/**
 * Shared Porto Relay Utilities
 * Common functions and constants for Porto relay testing
 */

import { createPublicClient, http, parseAbi, encodeFunctionData } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import * as Hex from "ox/Hex"

// =====================================
// CONFIGURATION
// =====================================

export const CONFIG = {
  PORTO_URL: 'https://rise-testnet-porto.fly.dev',
  CHAIN_ID: 11155931,
  RPC_URL: 'https://testnet.riselabs.xyz',
  
  // Porto contracts
  PORTO_ORCHESTRATOR: '0x046832405512d508b873e65174e51613291083bc',
  PORTO_IMPLEMENTATION: '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9',
  PORTO_RELAY_WALLET: '0x584B5274765a7F7C78FDc960248f38e5Ad6b1EDb',
  
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
// PORTO RELAY FUNCTIONS
// =====================================

/**
 * Make a Porto relay RPC call
 * @param {string} method - RPC method name
 * @param {any} params - Method parameters
 * @param {boolean} verbose - Whether to log details
 * @returns {Promise<any>} - RPC result
 */
export async function makeRelayCall(method, params, verbose = false) {
  if (verbose) {
    console.log(`\n📡 Calling ${method}`);
    console.log('Parameters:', JSON.stringify(params, null, 2).substring(0, 500) + '...');
  }
  
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
  
  if (result.error) {
    if (verbose) {
      console.log('❌ Error:', result.error);
    }
    throw new Error(`${method}: ${result.error.message} (${result.error.data || ''})`);
  }
  
  if (verbose) {
    console.log('✅ Success');
  }
  
  return result.result;
}

/**
 * Register an account with Porto (one-time setup)
 * @param {any} account - Viem account object
 * @returns {Promise<void>}
 */
export async function registerWithPorto(account) {
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const expiryHex = '0x' + expiry.toString(16);
  
  // Prepare upgrade
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
  
  const prepareResult = await makeRelayCall('wallet_prepareUpgradeAccount', [prepareParams]);
  
  // Sign authorization
  const authSig = await account.signMessage({
    message: { raw: prepareResult.digests.auth }
  });
  
  // Sign execution
  const domain = {
    ...prepareResult.typedData.domain,
    chainId: typeof prepareResult.typedData.domain.chainId === 'string' 
      ? parseInt(prepareResult.typedData.domain.chainId, 16)
      : prepareResult.typedData.domain.chainId,
  };
  
  const execSig = await account.signTypedData({
    domain,
    types: prepareResult.typedData.types,
    primaryType: prepareResult.typedData.primaryType,
    message: prepareResult.typedData.message,
  });
  
  // Upgrade account
  await makeRelayCall('wallet_upgradeAccount', [{
    context: prepareResult.context,
    signatures: { auth: authSig, exec: execSig }
  }]);
}

/**
 * Send a gasless transaction through Porto
 * @param {any} account - Viem account object
 * @param {Array} calls - Array of call objects [{to, data, value?}]
 * @param {Object} options - Additional options
 * @returns {Promise<string>} - Bundle ID
 */
export async function sendGaslessTransaction(account, calls, options = {}) {
  const prepareParams = {
    from: account.address,
    chainId: CONFIG.CHAIN_ID,
    calls,
    capabilities: {
      meta: options.meta || {}
    }
  };
  
  const prepareResult = await makeRelayCall('wallet_prepareCalls', [prepareParams]);
  
  // Sign the transaction
  const signature = await account.signMessage({
    message: { raw: prepareResult.digest }
  });
  
  // Send the transaction
  const sendParams = {
    context: prepareResult.context,
    key: {
      prehash: false,
      publicKey: account.address,
      type: 'secp256k1'
    },
    signature
  };
  
  const sendResult = await makeRelayCall('wallet_sendPreparedCalls', [sendParams]);
  return sendResult.id || sendResult;
}

/**
 * Check transaction status
 * @param {string} bundleId - Bundle ID from sendGaslessTransaction
 * @returns {Promise<Object>} - Transaction status
 */
export async function checkTransactionStatus(bundleId) {
  return await makeRelayCall('wallet_getCallsStatus', [bundleId]);
}

// =====================================
// BLOCKCHAIN UTILITIES
// =====================================

/**
 * Create a public client for reading blockchain state
 * @returns {Object} - Viem public client
 */
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

/**
 * Check if an account has a pet
 * @param {string} address - Account address
 * @returns {Promise<boolean>}
 */
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

/**
 * Get pet stats for an account
 * @param {string} address - Account address
 * @returns {Promise<Object|null>}
 */
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

/**
 * Get account balance
 * @param {string} address - Account address
 * @returns {Promise<bigint>}
 */
export async function getBalance(address) {
  const client = createClient();
  return await client.getBalance({ address });
}

// =====================================
// ENCODING HELPERS
// =====================================

/**
 * Encode a FrenPet function call
 * @param {string} functionName - Function to call
 * @param {Array} args - Function arguments
 * @returns {string} - Encoded function data
 */
export function encodeFrenPetCall(functionName, args = []) {
  return encodeFunctionData({
    abi: FRENPET_ABI,
    functionName,
    args
  });
}

export function serializePublicKey(publicKey) {
  return Hex.size(publicKey) < 32 ? Hex.padLeft(publicKey, 32) : publicKey
}