import { createPublicClient, http } from 'viem';
import { RISE_RPC_URL, riseTestnet } from './chain';

// Direct RPC client without Wagmi
// This works in React Native without browser dependencies
export const rpcClient = createPublicClient({
  chain: riseTestnet,
  transport: http(RISE_RPC_URL),
});

// Helper to get balance
export async function getBalance(address: string): Promise<bigint> {
  return await rpcClient.getBalance({ 
    address: address as `0x${string}` 
  });
}

// Helper to get transaction count (nonce)
export async function getTransactionCount(address: string): Promise<number> {
  return await rpcClient.getTransactionCount({ 
    address: address as `0x${string}` 
  });
}

// Helper to estimate gas
export async function estimateGas(tx: any): Promise<bigint> {
  return await rpcClient.estimateGas(tx);
}

// Helper to get current gas price
export async function getGasPrice(): Promise<bigint> {
  return await rpcClient.getGasPrice();
}