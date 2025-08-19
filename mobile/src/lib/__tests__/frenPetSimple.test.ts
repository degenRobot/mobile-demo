/**
 * Tests for FrenPetSimple contract integration
 * Testing gasless transactions without payable functions
 */

import { describe, expect, it, jest, beforeEach, afterEach } from '@jest/globals';
import { privateKeyToAccount } from 'viem/accounts';
import { encodeFunctionData } from 'viem';
import { FRENPET_ADDRESS, FRENPET_ABI } from '../../config/contracts';

// Mock fetch for testing
global.fetch = jest.fn();

describe('FrenPetSimple Contract', () => {
  const mockFetch = global.fetch as jest.MockedFunction<typeof fetch>;
  
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Contract Configuration', () => {
    it('should have correct contract address', () => {
      expect(FRENPET_ADDRESS).toBe('0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25');
    });

    it('should have non-payable functions', () => {
      const feedPetAbi = FRENPET_ABI.find(item => item.name === 'feedPet');
      const playWithPetAbi = FRENPET_ABI.find(item => item.name === 'playWithPet');
      
      expect(feedPetAbi?.stateMutability).toBe('nonpayable');
      expect(playWithPetAbi?.stateMutability).toBe('nonpayable');
    });

    it('should not have battle functions', () => {
      const battleAbi = FRENPET_ABI.find(item => item.name === 'initiateBattle');
      expect(battleAbi).toBeUndefined();
    });
  });

  describe('Function Encoding', () => {
    it('should encode createPet correctly', () => {
      const data = encodeFunctionData({
        abi: FRENPET_ABI,
        functionName: 'createPet',
        args: ['TestPet'],
      });
      
      expect(data).toMatch(/^0x/);
      expect(data.length).toBeGreaterThan(10);
    });

    it('should encode feedPet without value', () => {
      const data = encodeFunctionData({
        abi: FRENPET_ABI,
        functionName: 'feedPet',
        args: [],
      });
      
      expect(data).toMatch(/^0x/);
      // feedPet should have no parameters
      expect(data).toHaveLength(10); // '0x' + 8 chars for function selector
    });

    it('should encode playWithPet without value', () => {
      const data = encodeFunctionData({
        abi: FRENPET_ABI,
        functionName: 'playWithPet',
        args: [],
      });
      
      expect(data).toMatch(/^0x/);
      expect(data).toHaveLength(10);
    });
  });

  describe('Gasless Transaction Preparation', () => {
    const testAccount = privateKeyToAccount('0x' + 'a'.repeat(64));
    const PORTO_URL = 'https://rise-testnet-porto.fly.dev';

    it('should prepare gasless transaction with no value', async () => {
      const mockPrepareResponse = {
        result: {
          context: { test: 'context' },
          digest: '0x1234567890abcdef',
          typedData: {
            domain: { chainId: '0xaa36a7' },
            types: {},
            primaryType: 'Intent',
            message: {},
          },
          key: {
            type: 'secp256k1',
            publicKey: testAccount.address,
            prehash: false,
          },
        },
      };

      mockFetch.mockResolvedValueOnce({
        json: async () => mockPrepareResponse,
      } as Response);

      const data = encodeFunctionData({
        abi: FRENPET_ABI,
        functionName: 'feedPet',
        args: [],
      });

      const response = await fetch(PORTO_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          method: 'wallet_prepareCalls',
          params: [{
            calls: [{
              to: FRENPET_ADDRESS,
              data,
              value: '0x0', // No value for gasless
            }],
            capabilities: {
              meta: {
                accounts: [testAccount.address],
              },
            },
            chainId: 11155931,
            from: testAccount.address,
            key: {
              type: 'secp256k1',
              publicKey: testAccount.address,
              prehash: false,
            },
          }],
          id: 1,
        }),
      });

      const result = await response.json();
      expect(result.result).toBeDefined();
      expect(result.result.digest).toBeDefined();
      
      // Verify the call had no value
      const callBody = JSON.parse(mockFetch.mock.calls[0][1]?.body as string);
      expect(callBody.params[0].calls[0].value).toBe('0x0');
    });
  });

  describe('Pet Stats Structure', () => {
    it('should have correct getPetStats output structure', () => {
      const getPetStatsAbi = FRENPET_ABI.find(item => item.name === 'getPetStats');
      const outputs = getPetStatsAbi?.outputs;
      
      expect(outputs).toHaveLength(6);
      expect(outputs?.[0].name).toBe('name');
      expect(outputs?.[1].name).toBe('level');
      expect(outputs?.[2].name).toBe('experience');
      expect(outputs?.[3].name).toBe('happiness');
      expect(outputs?.[4].name).toBe('hunger');
      expect(outputs?.[5].name).toBe('isAlive');
      
      // Should not have winStreak in simplified version
      const hasWinStreak = outputs?.some(o => o.name === 'winStreak');
      expect(hasWinStreak).toBe(false);
    });
  });
});