import { PortoClient } from '../portoClient.native';
import { privateKeyToAccount } from 'viem/accounts';

// Mock fetch
global.fetch = jest.fn();

// Mock viem
jest.mock('viem/accounts', () => ({
  privateKeyToAccount: jest.fn((key) => ({
    address: '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f',
    signTypedData: jest.fn().mockResolvedValue('0xsignature'),
  })),
}));

describe('PortoClient', () => {
  let portoClient: PortoClient;
  const mockFetch = global.fetch as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    portoClient = new PortoClient();
  });

  describe('initialization', () => {
    it('should initialize with private key', async () => {
      await portoClient.init('0xprivatekey');
      expect(privateKeyToAccount).toHaveBeenCalledWith('0xprivatekey');
    });

    it('should throw if not initialized', async () => {
      await expect(portoClient.prepareCalls([])).rejects.toThrow('Porto client not initialized');
    });
  });

  describe('prepareCalls', () => {
    beforeEach(async () => {
      await portoClient.init('0xprivatekey');
    });

    it('should prepare calls with correct format', async () => {
      const mockDigest = '0xdigest123';
      const mockTypedData = { domain: {}, types: {}, message: {} };
      
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            digest: mockDigest,
            typedData: mockTypedData,
          },
        }),
      });

      const calls = [{
        to: '0xcontract' as `0x${string}`,
        data: '0xdata' as `0x${string}`,
        value: BigInt(0),
      }];

      const result = await portoClient.prepareCalls(calls);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://rise-testnet-porto.fly.dev',
        expect.objectContaining({
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: expect.stringContaining('wallet_prepareCalls'),
        })
      );

      expect(result).toEqual({
        digest: mockDigest,
        typedData: mockTypedData,
      });
    });

    it('should include meta.accounts in capabilities', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({ result: { digest: '0x', typedData: {} } }),
      });

      await portoClient.prepareCalls([]);

      const callBody = JSON.parse(mockFetch.mock.calls[0][1].body);
      expect(callBody.params[0].capabilities.meta.accounts).toEqual([
        '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f'
      ]);
    });

    it('should handle prepare error', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          error: { message: 'Invalid params' },
        }),
      });

      await expect(portoClient.prepareCalls([])).rejects.toThrow('Failed to prepare: Invalid params');
    });
  });

  describe('sendPreparedCalls', () => {
    beforeEach(async () => {
      await portoClient.init('0xprivatekey');
    });

    it('should send prepared calls with signature', async () => {
      const mockBundleId = '0xbundle123';
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { bundleId: mockBundleId },
        }),
      });

      const result = await portoClient.sendPreparedCalls(
        '0xdigest',
        { domain: {}, types: {}, message: {} }
      );

      expect(mockFetch).toHaveBeenCalledWith(
        'https://rise-testnet-porto.fly.dev',
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('wallet_sendPreparedCalls'),
        })
      );

      expect(result).toBe(mockBundleId);
    });
  });

  describe('getCallsStatus', () => {
    it('should get status for bundle', async () => {
      const mockStatus = { status: 200, receipts: [] };
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: mockStatus,
        }),
      });

      const result = await portoClient.getCallsStatus('0xbundle123');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://rise-testnet-porto.fly.dev',
        expect.objectContaining({
          body: expect.stringContaining('wallet_getCallsStatus'),
        })
      );

      expect(result).toEqual(mockStatus);
    });
  });

  describe('executeTransaction', () => {
    beforeEach(async () => {
      await portoClient.init('0xprivatekey');
    });

    it('should execute complete transaction flow', async () => {
      // Mock prepare
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: {
            digest: '0xdigest',
            typedData: { domain: {}, types: {}, message: {} },
          },
        }),
      });

      // Mock send
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          result: { bundleId: '0xbundle' },
        }),
      });

      const result = await portoClient.executeTransaction(
        '0xcontract' as `0x${string}`,
        '0xdata' as `0x${string}`,
        BigInt(0)
      );

      expect(result).toBe('0xbundle');
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });
  });
});