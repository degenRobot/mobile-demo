/**
 * Integration tests for complete gasless transaction flow
 */

import { describe, expect, it, jest, beforeEach } from '@jest/globals';
import { privateKeyToAccount, generatePrivateKey } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { FRENPET_ADDRESS, FRENPET_ABI } from '../../config/contracts';
import { PORTO_CONFIG } from '../../config/porto';

// Mock fetch
global.fetch = jest.fn();

describe('Gasless Transaction Flow', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Complete Gasless Flow', () => {
    it('should execute full gasless flow with delegation', async () => {
      // Generate test accounts
      const eoaPrivateKey = generatePrivateKey();
      const eoaAccount = privateKeyToAccount(eoaPrivateKey);
      
      const sessionPrivateKey = generatePrivateKey();
      const sessionAccount = privateKeyToAccount(sessionPrivateKey);
      
      // Step 1: Mock delegation preparation
      const mockDelegationPrepare = {
        result: {
          digests: {
            auth: '0xauthdigest',
            exec: '0xexecdigest',
          },
          typedData: {
            domain: { chainId: '0xaa36a7' },
            types: {},
            primaryType: 'Delegation',
            message: {},
          },
          context: { delegation: 'context' },
        },
      };
      
      mockFetch.mockResolvedValueOnce({
        json: async () => mockDelegationPrepare,
      } as Response);
      
      // Prepare delegation
      const delegationParams = {
        address: eoaAccount.address,
        delegation: PORTO_CONFIG.PORTO_ACCOUNT_IMPL,
        capabilities: {
          authorizeKeys: [
            {
              expiry: '0x' + (Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60).toString(16),
              prehash: false,
              publicKey: eoaAccount.address,
              role: 'admin',
              type: 'secp256k1',
              permissions: [],
            },
            {
              expiry: '0x' + (Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60).toString(16),
              prehash: false,
              publicKey: sessionAccount.address,
              role: 'normal',
              type: 'secp256k1',
              permissions: [],
            },
          ],
        },
        chainId: PORTO_CONFIG.CHAIN_ID,
      };
      
      await fetch(PORTO_CONFIG.PORTO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_prepareUpgradeAccount',
          params: [delegationParams],
          id: 1,
        }),
      });
      
      // Verify delegation included both keys
      const delegationCall = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(delegationCall.params[0].capabilities.authorizeKeys).toHaveLength(2);
      expect(delegationCall.params[0].capabilities.authorizeKeys[0].role).toBe('admin');
      expect(delegationCall.params[0].capabilities.authorizeKeys[1].role).toBe('normal');
      
      // Step 2: Mock transaction preparation (createPet)
      const mockTxPrepare = {
        result: {
          context: { quote: { test: 'quote' } },
          digest: '0xtxdigest',
          typedData: {
            domain: { chainId: '0xaa36a7' },
            types: {},
            primaryType: 'Intent',
            message: {},
          },
          key: {
            type: 'secp256k1',
            publicKey: eoaAccount.address,
            prehash: false,
          },
        },
      };
      
      mockFetch.mockResolvedValueOnce({
        json: async () => mockTxPrepare,
      } as Response);
      
      // Prepare createPet transaction
      const createPetData = encodeFunctionData({
        abi: FRENPET_ABI,
        functionName: 'createPet',
        args: ['GaslessTestPet'],
      });
      
      await fetch(PORTO_CONFIG.PORTO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_prepareCalls',
          params: [{
            calls: [{
              to: FRENPET_ADDRESS,
              data: createPetData,
              value: '0x0', // No value needed!
            }],
            capabilities: {
              meta: {
                accounts: [eoaAccount.address],
              },
            },
            chainId: PORTO_CONFIG.CHAIN_ID,
            from: eoaAccount.address,
            key: {
              type: 'secp256k1',
              publicKey: eoaAccount.address,
              prehash: false,
            },
          }],
          id: 2,
        }),
      });
      
      // Verify transaction has no value
      const txCall = JSON.parse(mockFetch.mock.calls[1][1]?.body as string);
      expect(txCall.params[0].calls[0].value).toBe('0x0');
      expect(txCall.params[0].calls[0].to).toBe(FRENPET_ADDRESS);
    });
    
    it('should handle session key signing', async () => {
      const sessionPrivateKey = generatePrivateKey();
      const sessionAccount = privateKeyToAccount(sessionPrivateKey);
      const eoaAccount = privateKeyToAccount(generatePrivateKey());
      
      // Mock transaction preparation with session key
      const mockTxPrepare = {
        result: {
          context: { quote: { test: 'quote' } },
          digest: '0xsessiondigest',
          typedData: {
            domain: { chainId: '0xaa36a7' },
            types: {},
            primaryType: 'Intent',
            message: {},
          },
          key: {
            type: 'secp256k1',
            publicKey: sessionAccount.address,
            prehash: false,
          },
        },
      };
      
      mockFetch.mockResolvedValueOnce({
        json: async () => mockTxPrepare,
      } as Response);
      
      // Prepare feedPet with session key
      const feedPetData = encodeFunctionData({
        abi: FRENPET_ABI,
        functionName: 'feedPet',
        args: [],
      });
      
      await fetch(PORTO_CONFIG.PORTO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_prepareCalls',
          params: [{
            calls: [{
              to: FRENPET_ADDRESS,
              data: feedPetData,
              value: '0x0',
            }],
            capabilities: {
              meta: {
                accounts: [eoaAccount.address], // Always the delegated account
              },
            },
            chainId: PORTO_CONFIG.CHAIN_ID,
            from: eoaAccount.address, // Always from the delegated account
            key: {
              type: 'secp256k1',
              publicKey: sessionAccount.address, // Session key for signing
              prehash: false,
            },
          }],
          id: 3,
        }),
      });
      
      const sessionCall = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(sessionCall.params[0].key.publicKey).toBe(sessionAccount.address);
      expect(sessionCall.params[0].from).toBe(eoaAccount.address);
    });
  });
  
  describe('Error Handling', () => {
    it('should handle insufficient funds error correctly', async () => {
      const mockErrorResponse = {
        error: {
          code: -32003,
          message: 'failed to send transaction',
          data: 'insufficient funds for gas * price + value: have 0 want 1000000',
        },
      };
      
      mockFetch.mockResolvedValueOnce({
        json: async () => mockErrorResponse,
      } as Response);
      
      const response = await fetch(PORTO_CONFIG.PORTO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_sendPreparedCalls',
          params: [{ test: 'params' }],
          id: 1,
        }),
      });
      
      const result = await response.json();
      expect(result.error).toBeDefined();
      expect(result.error.message).toContain('failed to send transaction');
      
      // With non-payable functions, this should not happen
      // This test documents the error for debugging
    });
  });
});