import { Chain } from 'viem';

// RISE Testnet configuration
// Network details: https://docs.risechain.com/rise-testnet/network-details.html
export const riseTestnet: Chain = {
  id: 11155931, // RISE Testnet chain ID (verified from RPC)
  name: 'RISE Testnet',
  nativeCurrency: {
    decimals: 18,
    name: 'RISE',
    symbol: 'RISE',
  },
  rpcUrls: {
    default: { http: ['https://testnet.riselabs.xyz'] },
    public: { http: ['https://testnet.riselabs.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Explorer', url: 'https://explorer.testnet.riselabs.xyz' },
  },
  testnet: true,
};

// RPC URLs - Direct blockchain interaction
// These are used for reading blockchain state and sending regular transactions
export const RISE_RPC_URL = 'https://testnet.riselabs.xyz';
export const RISE_WS_URL = 'wss://testnet.riselabs.xyz/ws';

// Porto Relayer URL - Intent-based transactions with gas sponsorship
// The relayer allows us to:
// 1. Send intents instead of raw transactions
// 2. Get gas sponsorship (gasless transactions)
// 3. Use session keys for transaction signing
// 4. Bundle multiple operations
// See: https://porto.sh/rpc-server for setup
export const PORTO_RELAYER_URL = 'https://rise-testnet-porto.fly.dev';