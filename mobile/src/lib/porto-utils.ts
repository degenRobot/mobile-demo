/**
 * Porto Utility Functions
 * Helper functions for Porto integration
 */

import { type Hex } from 'viem';

/**
 * Serialize a public key for Porto
 * Pads addresses to 32 bytes as required by Porto
 * 
 * @param publicKey - The public key/address to serialize
 * @returns Padded 32-byte hex string
 */
export function serializePublicKey(publicKey: string): Hex {
  // Remove 0x prefix if present
  const cleanKey = publicKey.startsWith('0x') ? publicKey.slice(2) : publicKey;
  
  // Calculate padding needed (32 bytes = 64 hex chars)
  const targetLength = 64;
  const currentLength = cleanKey.length;
  
  if (currentLength >= targetLength) {
    // Already 32 bytes or more, return as is
    return `0x${cleanKey}` as Hex;
  }
  
  // Pad with zeros on the left
  const padding = '0'.repeat(targetLength - currentLength);
  return `0x${padding}${cleanKey}` as Hex;
}

/**
 * Format address for display
 * @param address - Full address
 * @returns Shortened address like 0x1234...5678
 */
export function formatAddress(address: string): string {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

/**
 * Convert ETH fee token address constant
 */
export const ETH_FEE_TOKEN = '0x0000000000000000000000000000000000000000';