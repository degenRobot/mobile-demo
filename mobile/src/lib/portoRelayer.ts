import { PORTO_RELAYER_URL, riseTestnet } from '../config/chain';
import { privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { Storage } from './storage';

/**
 * Porto Relayer Client for RISE Testnet
 * 
 * This client interacts directly with the Porto relayer to:
 * 1. Send intents instead of raw transactions
 * 2. Get gas sponsorship (gasless transactions)
 * 3. Use session keys for transaction signing
 * 4. Bundle multiple operations
 * 
 * Based on: https://porto.sh/rpc-server
 */

const SESSION_KEY_STORAGE = 'PORTO_SESSION_KEY';
const SESSION_KEY_EXPIRY = 'PORTO_SESSION_KEY_EXPIRY';

export interface Call {
  to: string;
  value?: string;
  data?: string;
}

export interface PrepareCallsRequest {
  calls: Call[];
  capabilities: any;
  chainId: number;
  from?: string;
  key?: any;
}

export interface PrepareCallsResponse {
  context: string;
  sessionData?: any;
  identifier?: string;
}

export interface SendCallsRequest {
  identifier: string;
  signature: string;
}

export class PortoRelayerClient {
  private sessionKey: string | null = null;
  private sessionKeyExpiry: number | null = null;

  constructor() {}

  /**
   * Initialize or retrieve session key
   */
  async initSessionKey(): Promise<void> {
    try {
      // Check if we have a valid session key
      const storedKey = await Storage.getItem(SESSION_KEY_STORAGE);
      const storedExpiry = await Storage.getItem(SESSION_KEY_EXPIRY);
      
      if (storedKey && storedExpiry) {
        const expiry = parseInt(storedExpiry);
        if (Date.now() < expiry) {
          this.sessionKey = storedKey;
          this.sessionKeyExpiry = expiry;
          console.log('Using existing session key');
          return;
        }
      }

      // Generate new session key
      const sessionAccount = privateKeyToAccount(generatePrivateKey());
      this.sessionKey = sessionAccount.address;
      this.sessionKeyExpiry = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
      
      await Storage.setItem(SESSION_KEY_STORAGE, this.sessionKey);
      await Storage.setItem(SESSION_KEY_EXPIRY, this.sessionKeyExpiry.toString());
      
      console.log('Generated new session key:', this.sessionKey);
    } catch (error) {
      console.error('Failed to initialize session key:', error);
    }
  }

  /**
   * Check if relayer is healthy
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${PORTO_RELAYER_URL}/health`);
      return response.ok;
    } catch (error) {
      console.error('Health check failed:', error);
      return false;
    }
  }

  /**
   * Get capabilities for the chain
   */
  async getCapabilities(): Promise<any> {
    try {
      const response = await fetch(PORTO_RELAYER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_getCapabilities',
          params: [],
          id: 1,
        }),
      });
      
      const result = await response.json();
      return result.result;
    } catch (error) {
      console.error('Failed to get capabilities:', error);
      throw error;
    }
  }

  /**
   * Prepare calls for execution (get context for signing)
   */
  async prepareCalls(
    calls: Call[],
    from: string
  ): Promise<PrepareCallsResponse> {
    try {
      // Get capabilities first
      const capabilities = await this.getCapabilities();
      const chainCapabilities = capabilities[`0x${riseTestnet.id.toString(16)}`] || {};
      
      const request: PrepareCallsRequest = {
        calls,
        capabilities: {
          ...chainCapabilities,
          paymasterService: {
            supported: true,
            provider: 'porto',
          },
        },
        chainId: riseTestnet.id,
        from,
      };

      const response = await fetch(PORTO_RELAYER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_prepareCalls',
          params: [request],
          id: 2,
        }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result.result;
    } catch (error) {
      console.error('Failed to prepare calls:', error);
      throw error;
    }
  }

  /**
   * Send prepared calls with signature
   */
  async sendCalls(
    identifier: string,
    signature: string
  ): Promise<string> {
    try {
      const response = await fetch(PORTO_RELAYER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_sendCalls',
          params: [{
            identifier,
            signature,
          }],
          id: 3,
        }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result.result; // Transaction ID
    } catch (error) {
      console.error('Failed to send calls:', error);
      throw error;
    }
  }

  /**
   * Get status of sent calls
   */
  async getCallsStatus(transactionId: string): Promise<any> {
    try {
      const response = await fetch(PORTO_RELAYER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_getCallsStatus',
          params: [transactionId],
          id: 4,
        }),
      });

      const result = await response.json();
      if (result.error) {
        throw new Error(result.error.message);
      }
      
      return result.result;
    } catch (error) {
      console.error('Failed to get calls status:', error);
      throw error;
    }
  }

  /**
   * Execute a gasless transaction through the relayer
   */
  async executeGaslessTransaction(
    to: string,
    data: string,
    value?: string,
    from?: string
  ): Promise<string> {
    try {
      // Initialize session key if needed
      await this.initSessionKey();
      
      // Prepare the call
      const call: Call = {
        to,
        data,
        ...(value && { value }),
      };
      
      const prepareResult = await this.prepareCalls(
        [call],
        from || this.sessionKey!
      );
      
      // For now, we'll sign with the session key
      // In production, this should use passkey or the main wallet
      const signature = '0x'; // Placeholder - needs actual signing
      
      // Send the calls
      const txId = await this.sendCalls(
        prepareResult.identifier!,
        signature
      );
      
      console.log('Gasless transaction sent:', txId);
      return txId;
    } catch (error) {
      console.error('Failed to execute gasless transaction:', error);
      throw error;
    }
  }
}

// Helper to generate a private key (for session keys)
function generatePrivateKey(): `0x${string}` {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return `0x${Array.from(array).map(b => b.toString(16).padStart(2, '0')).join('')}`;
}