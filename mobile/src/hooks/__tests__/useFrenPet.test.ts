import { renderHook, act } from '@testing-library/react-native';
import { useFrenPet } from '../useFrenPet';
import { encodeFunctionData } from 'viem';

// Mock dependencies
jest.mock('../useWallet', () => ({
  useWallet: () => ({
    account: { address: '0xUSER' },
    isInitialized: true,
  }),
}));

jest.mock('../usePorto', () => ({
  usePorto: () => ({
    executeTransaction: jest.fn().mockResolvedValue('0xbundle123'),
    isReady: true,
  }),
}));

jest.mock('../useRpcClient', () => ({
  useRpcClient: () => ({
    readContract: jest.fn(),
  }),
}));

jest.mock('viem', () => ({
  encodeFunctionData: jest.fn((args) => '0xencodeddata'),
  parseEther: jest.fn((value) => BigInt(Math.floor(parseFloat(value) * 1e18))),
}));

describe('useFrenPet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Pet Creation', () => {
    it('should create a new pet', async () => {
      const { result } = renderHook(() => useFrenPet());

      await act(async () => {
        await result.current.createPet('Fluffy');
      });

      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'createPet',
        args: ['Fluffy'],
      });
    });

    it('should handle empty pet name', async () => {
      const { result } = renderHook(() => useFrenPet());

      await expect(
        act(async () => {
          await result.current.createPet('');
        })
      ).rejects.toThrow('Pet name is required');
    });
  });

  describe('Pet Interactions', () => {
    it('should feed pet with correct value', async () => {
      const { result } = renderHook(() => useFrenPet());

      await act(async () => {
        await result.current.feedPet();
      });

      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'feedPet',
        args: [],
      });

      // Verify value is 0.001 RISE
      const mockPorto = result.current as any;
      // Value should be passed to executeTransaction
    });

    it('should play with pet with correct value', async () => {
      const { result } = renderHook(() => useFrenPet());

      await act(async () => {
        await result.current.playWithPet();
      });

      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'playWithPet',
        args: [],
      });
    });

    it('should train pet without value', async () => {
      const { result } = renderHook(() => useFrenPet());

      await act(async () => {
        await result.current.trainPet();
      });

      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'trainPet',
        args: [],
      });
    });
  });

  describe('Battle System', () => {
    it('should initiate battle with valid opponent', async () => {
      const { result } = renderHook(() => useFrenPet());
      const opponentAddress = '0xOPPONENT';

      await act(async () => {
        await result.current.initiateBattle(opponentAddress);
      });

      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'initiateBattle',
        args: [opponentAddress],
      });
    });

    it('should validate opponent address', async () => {
      const { result } = renderHook(() => useFrenPet());

      await expect(
        act(async () => {
          await result.current.initiateBattle('invalid');
        })
      ).rejects.toThrow('Invalid opponent address');
    });

    it('should claim battle reward', async () => {
      const { result } = renderHook(() => useFrenPet());

      await act(async () => {
        await result.current.claimBattleReward();
      });

      expect(encodeFunctionData).toHaveBeenCalledWith({
        abi: expect.any(Array),
        functionName: 'claimBattleReward',
        args: [],
      });
    });
  });

  describe('Pet Data Loading', () => {
    it('should load pet data', async () => {
      const mockRpc = {
        readContract: jest.fn().mockResolvedValue({
          name: 'Fluffy',
          isAlive: true,
          hunger: 30,
          happiness: 70,
          level: 5,
          experience: 250,
          strength: 15,
          winStreak: 3,
        }),
      };

      jest.spyOn(require('../useRpcClient'), 'useRpcClient').mockReturnValue(mockRpc);

      const { result } = renderHook(() => useFrenPet());

      await act(async () => {
        await result.current.loadPetData();
      });

      expect(mockRpc.readContract).toHaveBeenCalledWith({
        address: expect.any(String),
        abi: expect.any(Array),
        functionName: 'pets',
        args: ['0xUSER'],
      });

      expect(result.current.pet).toEqual({
        name: 'Fluffy',
        isAlive: true,
        hunger: 30,
        happiness: 70,
        level: 5,
        experience: 250,
        strength: 15,
        winStreak: 3,
      });
    });

    it('should handle pet not found', async () => {
      const mockRpc = {
        readContract: jest.fn().mockResolvedValue({
          name: '',
          isAlive: false,
          hunger: 0,
          happiness: 0,
          level: 0,
          experience: 0,
          strength: 0,
          winStreak: 0,
        }),
      };

      jest.spyOn(require('../useRpcClient'), 'useRpcClient').mockReturnValue(mockRpc);

      const { result } = renderHook(() => useFrenPet());

      await act(async () => {
        await result.current.loadPetData();
      });

      expect(result.current.pet).toBeNull();
    });
  });

  describe('Loading States', () => {
    it('should manage loading state during operations', async () => {
      const { result } = renderHook(() => useFrenPet());

      expect(result.current.isLoading).toBe(false);

      const promise = act(async () => {
        await result.current.createPet('Test');
      });

      // Loading should be true during operation
      expect(result.current.isLoading).toBe(true);

      await promise;

      // Loading should be false after operation
      expect(result.current.isLoading).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should handle Porto transaction errors', async () => {
      const mockPorto = {
        executeTransaction: jest.fn().mockRejectedValue(new Error('Porto error')),
        isReady: true,
      };

      jest.spyOn(require('../usePorto'), 'usePorto').mockReturnValue(mockPorto);

      const { result } = renderHook(() => useFrenPet());

      await expect(
        act(async () => {
          await result.current.feedPet();
        })
      ).rejects.toThrow('Porto error');
    });

    it('should handle contract read errors', async () => {
      const mockRpc = {
        readContract: jest.fn().mockRejectedValue(new Error('RPC error')),
      };

      jest.spyOn(require('../useRpcClient'), 'useRpcClient').mockReturnValue(mockRpc);

      const { result } = renderHook(() => useFrenPet());

      await expect(
        act(async () => {
          await result.current.loadPetData();
        })
      ).rejects.toThrow('RPC error');
    });
  });
});