/**
 * Porto Relayer Configuration
 */

export const PORTO_CONFIG = {
  // Relayer endpoint
  url: 'https://rise-testnet-porto.fly.dev',
  
  // Chain configuration
  chainId: 11155931, // Sepolia fork used by RISE testnet
  
  // Porto contracts (from working test configuration)
  contracts: {
    orchestrator: '0x046832405512d508b873e65174e51613291083bc',
    implementation: '0x912a428b1a7e7cb7bb2709a2799a01c020c5acd9',
    proxy: '0xf463d5cbc64916caa2775a8e9b264f8c35f4b8a4',
    relayWallet: '0x584B5274765a7F7C78FDc960248f38e5Ad6b1EDb',
  },
  
  // Retry configuration
  retryAttempts: 3,
  retryDelay: 1000, // ms
  
  // Timeouts
  requestTimeout: 30000, // 30 seconds
  transactionTimeout: 60000, // 60 seconds for tx confirmation
  
  // Status check intervals
  statusCheckInterval: 2000, // Check every 2 seconds
  maxStatusChecks: 30, // Max 30 checks (1 minute)
  
  // Feature flags
  features: {
    gaslessEnabled: true,
    sessionKeysEnabled: false, // Future feature
    batchingEnabled: false, // Future feature
  },
};

// Transaction status codes
export const TX_STATUS = {
  PENDING: 0,
  SUCCESS: 200,
  FAILED: 400,
  REVERTED: 500,
} as const;

// Error messages
export const PORTO_ERRORS = {
  NOT_INITIALIZED: 'Porto client not initialized',
  NO_ACCOUNT: 'No account available',
  PREPARE_FAILED: 'Failed to prepare transaction',
  SIGN_FAILED: 'Failed to sign transaction',
  SEND_FAILED: 'Failed to send transaction',
  STATUS_CHECK_FAILED: 'Failed to check transaction status',
  TIMEOUT: 'Transaction timeout',
  NETWORK_ERROR: 'Network error',
} as const;