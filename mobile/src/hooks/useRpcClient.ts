import { createPublicClient, http } from 'viem';
import { riseTestnet, RISE_RPC_URL } from '../config/chain';

export function useRpcClient() {
  const client = createPublicClient({
    chain: riseTestnet,
    transport: http(RISE_RPC_URL), // Use correct RPC URL
  });

  return client;
}