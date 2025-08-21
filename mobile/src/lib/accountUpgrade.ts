/**
 * Account Upgrade/Delegation for Porto
 * 
 * Handles the initial delegation of EOA to Porto protocol
 * This is required before using gasless transactions
 */

import { privateKeyToAccount, type PrivateKeyAccount } from 'viem/accounts';
import { createPublicClient, http, type Hex } from 'viem';
import { riseTestnet } from '../config/chain';
import { PORTO_CONFIG } from '../config/porto';
import { serializePublicKey } from './porto-utils';

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
  adminKeyAddress?: string
): Promise<UpgradeResponse> {
  // For MVP, use empty keys array or optionally add admin key
  const authorizeKeys: any[] = [];
  
  // Optionally add admin key if provided
  if (adminKeyAddress) {
    authorizeKeys.push({
      expiry: '0x0',  // Never expires
      prehash: false,
      publicKey: serializePublicKey(adminKeyAddress),  // Padded to 32 bytes
      role: 'admin' as const,
      type: 'secp256k1' as const,
      permissions: []  // Empty for admin role
    });
    console.log('[AccountUpgrade] Authorizing admin key:', adminKeyAddress);
  }

  // Build request with correct structure
  const request = {
    address: account.address,
    delegation: PORTO_CONFIG.contracts.proxy,  // Use proxy from config
    capabilities: {
      authorizeKeys  // Keys go inside capabilities
    },
    chainId: PORTO_CONFIG.chainId
  };

  console.log('[AccountUpgrade] Preparing upgrade for:', account.address);
  console.log('[AccountUpgrade] Delegate to:', PORTO_CONFIG.contracts.proxy);
  console.log('[AccountUpgrade] Authorizing', authorizeKeys.length, 'key(s)');

  const response = await fetch(PORTO_CONFIG.url, {
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
 * Sign the upgrade digest - use raw sign, not EIP-712
 */
export async function signUpgradeDigest(
  account: PrivateKeyAccount,
  digest: string
): Promise<string> {
  console.log('[AccountUpgrade] Signing upgrade digest...');
  
  // Use raw sign, not signTypedData (no EIP-191 prefix)
  const signature = await account.sign({
    hash: digest as Hex
  });

  console.log('[AccountUpgrade] Digest signed');
  return signature;
}

/**
 * Sign the upgrade intent with EIP-712 (kept for compatibility)
 */
export async function signUpgradeIntent(
  account: PrivateKeyAccount,
  typedData: any
): Promise<string> {
  // This function is deprecated, use signUpgradeDigest instead
  console.warn('[AccountUpgrade] signUpgradeIntent is deprecated, use signUpgradeDigest');
  
  // For backward compatibility, extract digest if available
  if (typeof typedData === 'string') {
    return signUpgradeDigest(account, typedData);
  }
  
  throw new Error('signUpgradeIntent with typedData is no longer supported');
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

  const response = await fetch(PORTO_CONFIG.url, {
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