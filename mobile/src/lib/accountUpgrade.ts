/**
 * Account Upgrade/Delegation for Porto
 * 
 * Handles the initial delegation of EOA to Porto protocol
 * This is required before using gasless transactions
 */

import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { createPublicClient, http } from 'viem';
import { riseTestnet } from '../config/chain';

// Porto account implementation contract (MUST match relay.toml!)
const PORTO_ACCOUNT_IMPL = '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9'; // delegation_implementation from relay.toml
const PORTO_ORCHESTRATOR = '0x046832405512d508b873e65174e51613291083bc'; // orchestrator from relay.toml
const PORTO_URL = 'https://rise-testnet-porto.fly.dev';
const PORTO_CHAIN_ID = 11155931; // RISE Testnet

interface UpgradeRequest {
  from: string;
  delegate: string;
  capabilities: any;
}

interface UpgradeResponse {
  context: any;
  digest: string;
  typedData: any;
  key: any;
}

/**
 * Check if an account is already delegated to Porto
 * Delegated accounts have code deployed at their address
 */
export async function isAccountDelegated(address: string): Promise<boolean> {
  try {
    const client = createPublicClient({
      chain: riseTestnet,
      transport: http(riseTestnet.rpcUrls.default.http[0]),
    });

    const code = await client.getBytecode({ address: address as `0x${string}` });
    
    // If account has code, it's delegated
    return code !== undefined && code !== '0x';
  } catch (error) {
    console.error('[AccountUpgrade] Failed to check delegation:', error);
    return false;
  }
}

/**
 * Prepare account upgrade to Porto protocol with session key
 */
export async function prepareUpgradeAccount(
  account: PrivateKeyAccount,
  sessionKeyAddress?: string
): Promise<UpgradeResponse> {
  // Calculate expiry and convert to hex string (CRITICAL!)
  const expiry = Math.floor(Date.now() / 1000) + (30 * 24 * 60 * 60); // 30 days
  const expiryHex = '0x' + expiry.toString(16); // MUST be hex string!
  
  // Prepare authorize keys array with admin account
  const authorizeKeys = [
    {
      expiry: expiryHex,  // Even admin needs expiry in hex format
      prehash: false,
      publicKey: account.address,  // Main wallet as admin
      role: 'admin' as const,
      type: 'secp256k1' as const,
      permissions: []  // Empty for admin role
    }
  ];
  
  // Add session key if provided
  if (sessionKeyAddress) {
    const sessionExpiry = Math.floor(Date.now() / 1000) + (7 * 24 * 60 * 60); // 7 days
    const sessionExpiryHex = '0x' + sessionExpiry.toString(16);
    
    authorizeKeys.push({
      expiry: sessionExpiryHex,  // MUST be hex string!
      prehash: false,
      publicKey: sessionKeyAddress,  // Session key
      role: 'normal' as const,  // Use 'normal' not 'session'
      type: 'secp256k1' as const,
      permissions: []
    });
    console.log('[AccountUpgrade] Authorizing session key:', sessionKeyAddress);
    console.log('[AccountUpgrade] Session key expiry (hex):', sessionExpiryHex);
  }

  // Build request with correct structure
  const request = {
    address: account.address,
    delegation: PORTO_ACCOUNT_IMPL,
    capabilities: {
      authorizeKeys  // Keys go inside capabilities
    },
    chainId: PORTO_CHAIN_ID
  };

  console.log('[AccountUpgrade] Preparing upgrade for:', account.address);
  console.log('[AccountUpgrade] Delegate to:', PORTO_ACCOUNT_IMPL);
  console.log('[AccountUpgrade] Authorizing', authorizeKeys.length, 'key(s)');
  console.log('[AccountUpgrade] Admin expiry (hex):', expiryHex);

  const response = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_prepareUpgradeAccount',
      params: [request],
      id: 1,
    }),
  });

  const result = await response.json();
  
  if (result.error) {
    console.error('[AccountUpgrade] Full error:', JSON.stringify(result.error, null, 2));
    throw new Error(`Prepare upgrade failed: ${result.error.message}`);
  }

  console.log('[AccountUpgrade] Upgrade prepared');
  console.log('[AccountUpgrade] Auth digest:', result.result.digests?.auth);
  console.log('[AccountUpgrade] Exec digest:', result.result.digests?.exec);
  return result.result;
}

/**
 * Sign the upgrade intent with EIP-712
 */
export async function signUpgradeIntent(
  account: PrivateKeyAccount,
  typedData: any
): Promise<string> {
  // Convert domain chainId from hex to number if needed
  const domain = {
    ...typedData.domain,
    chainId: typeof typedData.domain.chainId === 'string' 
      ? parseInt(typedData.domain.chainId, 16)
      : typedData.domain.chainId,
  };

  console.log('[AccountUpgrade] Signing upgrade intent...');
  
  const signature = await account.signTypedData({
    domain,
    types: typedData.types,
    primaryType: typedData.primaryType,
    message: typedData.message,
  });

  console.log('[AccountUpgrade] Intent signed');
  return signature;
}

/**
 * Execute the account upgrade with both auth and exec signatures
 */
export async function upgradeAccount(
  context: any,
  authSignature: string,
  execSignature: string
): Promise<string> {
  console.log('[AccountUpgrade] Executing upgrade...');

  const response = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_upgradeAccount',
      params: [{
        context,
        signatures: {
          auth: authSignature,
          exec: execSignature
        }
      }],
      id: 2,
    }),
  });

  const result = await response.json();
  
  if (result.error) {
    console.error('[AccountUpgrade] Upgrade error:', result.error);
    throw new Error(`Upgrade failed: ${result.error.message}`);
  }

  const bundleId = result.result.id || result.result;
  console.log('[AccountUpgrade] Upgrade bundle ID:', bundleId);
  
  // Wait and check status
  console.log('[AccountUpgrade] Waiting for confirmation...');
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check transaction status
  const statusResponse = await fetch(PORTO_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      method: 'wallet_getCallsStatus',
      params: [bundleId],
      id: 3,
    }),
  });
  
  const statusResult = await statusResponse.json();
  if (statusResult.result?.receipts?.[0]) {
    const txHash = statusResult.result.receipts[0].transactionHash;
    console.log('[AccountUpgrade] Upgrade transaction:', txHash);
    return txHash;
  }
  
  return bundleId;
}

/**
 * Ensure account is delegated to Porto with optional session key
 * This is the main function to call on app startup
 */
export async function ensureDelegated(
  privateKey: string,
  sessionKeyAddress?: string
): Promise<boolean> {
  try {
    const account = privateKeyToAccount(privateKey as `0x${string}`);
    
    // Check if already delegated
    const isDelegated = await isAccountDelegated(account.address);
    
    if (isDelegated) {
      console.log('[AccountUpgrade] ✅ Account already delegated:', account.address);
      return true;
    }

    console.log('[AccountUpgrade] ⚠️ Account not delegated, upgrading now...');

    // Step 1: Prepare upgrade with session key authorization
    const prepareResult = await prepareUpgradeAccount(account, sessionKeyAddress);

    // Step 2: Sign both auth and exec digests
    // Sign auth digest directly (raw message)
    const authSignature = await account.signMessage({
      message: { raw: prepareResult.digests.auth as `0x${string}` }
    });
    
    // Sign exec using typed data
    const execSignature = await signUpgradeIntent(account, prepareResult.typedData);

    // Step 3: Execute upgrade with both signatures
    const txHash = await upgradeAccount(
      prepareResult.context,
      authSignature,
      execSignature
    );

    console.log('[AccountUpgrade] Transaction hash:', txHash);
    
    // Wait additional time for delegation to take effect
    console.log('[AccountUpgrade] Waiting for delegation to take effect...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Verify delegation succeeded
    const isNowDelegated = await isAccountDelegated(account.address);
    
    if (isNowDelegated) {
      console.log('[AccountUpgrade] ✅ Account successfully delegated!');
      return true;
    } else {
      console.warn('[AccountUpgrade] ⚠️ Delegation may still be pending');
      return false;
    }
  } catch (error) {
    console.error('[AccountUpgrade] Delegation failed:', error);
    return false;
  }
}

/**
 * Add session key permissions to delegated account
 * This allows the session key to sign transactions on behalf of the main account
 */
export async function addSessionKeyPermission(
  mainAccount: PrivateKeyAccount,
  sessionKeyAddress: string,
  expiryTimestamp?: number
): Promise<void> {
  // This would call a Porto method to add session key permissions
  // For now, we'll use the session key directly for signing
  console.log('[AccountUpgrade] Session key permissions would be added here');
  console.log('Main account:', mainAccount.address);
  console.log('Session key:', sessionKeyAddress);
  console.log('Expiry:', expiryTimestamp || 'No expiry');
  
  // TODO: Implement actual permission delegation when Porto supports it
  // This would involve calling a Porto RPC method like:
  // wallet_addSessionKey or wallet_delegatePermission
}