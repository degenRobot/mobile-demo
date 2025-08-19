/**
 * Simplified Account Delegation for Porto
 * 
 * Porto may handle delegation automatically on first transaction
 * This module checks delegation status and handles the flow
 */

import { createPublicClient, http } from 'viem';
import { riseTestnet } from '../config/chain';

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
    const isDelegated = code !== undefined && code !== '0x' && code.length > 2;
    
    console.log(`[Delegation] Account ${address} delegated: ${isDelegated}`);
    return isDelegated;
  } catch (error) {
    console.error('[Delegation] Failed to check delegation:', error);
    return false;
  }
}

/**
 * Porto may automatically delegate accounts on first gasless transaction
 * This is a simplified check that doesn't require explicit upgrade calls
 */
export async function checkPortoDelegation(address: string): Promise<{
  isDelegated: boolean;
  needsFirstTransaction: boolean;
}> {
  const delegated = await isAccountDelegated(address);
  
  return {
    isDelegated: delegated,
    needsFirstTransaction: !delegated,  // If not delegated, needs first tx to trigger it
  };
}

/**
 * Info about Porto delegation
 */
export const DELEGATION_INFO = {
  title: 'Gasless Transactions',
  description: 'Porto enables gasless transactions by delegating your account to a smart contract wallet.',
  benefits: [
    'No gas fees required',
    'Batch multiple transactions',
    'Enhanced security with session keys',
  ],
  howItWorks: 'Your first transaction will automatically set up delegation. This is a one-time process.',
};