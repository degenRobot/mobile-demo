import { useState, useCallback } from 'react';
import { parseEther, encodeFunctionData, createWalletClient, http } from 'viem';
import { rpcClient } from '../config/rpcClient';
import { FRENPET_ADDRESS, FRENPET_ABI } from '../config/contracts';
import { SessionWallet } from '../lib/sessionWallet';
import { riseTestnet, RISE_RPC_URL } from '../config/chain';
import type { TransactionResult } from './usePorto';

export interface PetData {
  name: string;
  level: number;
  experience: number;
  happiness: number;
  hunger: number;
  isAlive: boolean;
  winStreak: number;
}

export interface UseFrenPetOptions {
  wallet: SessionWallet;
  porto?: {
    isReady: boolean;
    sendTransaction: (to: string, data: string, value?: string) => Promise<TransactionResult>;
    checkStatus: (bundleId: string) => Promise<TransactionResult>;
  };
  useGasless?: boolean;
}

export function useFrenPet({ wallet, porto, useGasless = true }: UseFrenPetOptions) {
  const [isLoading, setIsLoading] = useState(false);
  const [pendingTx, setPendingTx] = useState<string | null>(null);

  const sendTransaction = useCallback(async (
    functionName: string,
    args: any[],
    value?: bigint
  ) => {
    const data = encodeFunctionData({
      abi: FRENPET_ABI,
      functionName,
      args,
    });

    // Use Porto for gasless transactions if available
    if (useGasless && porto?.isReady) {
      try {
        console.log('[FrenPet] Sending gasless transaction via Porto...');
        const valueHex = value ? `0x${value.toString(16)}` : '0x0';
        const result = await porto.sendTransaction(
          FRENPET_ADDRESS,
          data,
          valueHex
        );
        
        setPendingTx(result.bundleId);
        
        // Wait for transaction to be confirmed
        let attempts = 0;
        const maxAttempts = 30;
        
        while (attempts < maxAttempts) {
          const status = await porto.checkStatus(result.bundleId);
          
          if (status.status === 'success') {
            console.log('[FrenPet] Transaction confirmed!');
            setPendingTx(null);
            return { status: 'success', receipt: status.receipt };
          } else if (status.status === 'failed') {
            console.error('[FrenPet] Transaction failed');
            setPendingTx(null);
            throw new Error('Transaction failed');
          }
          
          // Wait before next check
          await new Promise(resolve => setTimeout(resolve, 2000));
          attempts++;
        }
        
        console.warn('[FrenPet] Transaction timeout');
        setPendingTx(null);
        throw new Error('Transaction timeout');
      } catch (error) {
        console.error('[FrenPet] Porto transaction failed:', error);
        setPendingTx(null);
        
        // Try fallback with wallet's Porto method
        if (wallet.executePortoTransaction) {
          try {
            console.log('[FrenPet] Trying wallet Porto method...');
            const valueHex = value ? `0x${value.toString(16)}` : '0x0';
            const result = await wallet.executePortoTransaction(
              FRENPET_ADDRESS,
              data,
              valueHex
            );
            return { status: 'success', bundleId: result.bundleId };
          } catch (walletError) {
            console.error('[FrenPet] Wallet Porto also failed:', walletError);
          }
        }
        
        // Fall through to direct RPC if Porto fails
        console.log('[FrenPet] Falling back to direct RPC...');
      }
    }
    
    // Direct RPC transaction (requires gas)
    const mainAccount = wallet.getMainAccount();
    if (!mainAccount) {
      throw new Error('Wallet not initialized for direct RPC');
    }
    
    const walletClient = createWalletClient({
      account: mainAccount,
      chain: riseTestnet,
      transport: http(RISE_RPC_URL),
    });

    const hash = await walletClient.sendTransaction({
      to: FRENPET_ADDRESS as `0x${string}`,
      data,
      value: value || 0n,
      gas: 300000n,
    });
    
    const receipt = await rpcClient.waitForTransactionReceipt({ hash });
    return receipt;
  }, [wallet, porto, useGasless]);

  const createPet = useCallback(async (name: string) => {
    setIsLoading(true);
    try {
      const receipt = await sendTransaction('createPet', [name]);
      return receipt;
    } finally {
      setIsLoading(false);
    }
  }, [sendTransaction]);

  const feedPet = useCallback(async () => {
    setIsLoading(true);
    try {
      // FrenPetSimple has non-payable functions - no value needed
      const receipt = await sendTransaction('feedPet', []);
      return receipt;
    } finally {
      setIsLoading(false);
    }
  }, [sendTransaction]);

  const playWithPet = useCallback(async () => {
    setIsLoading(true);
    try {
      // FrenPetSimple has non-payable functions - no value needed
      const receipt = await sendTransaction('playWithPet', []);
      return receipt;
    } finally {
      setIsLoading(false);
    }
  }, [sendTransaction]);

  const initiateBattle = useCallback(async (opponent: string) => {
    setIsLoading(true);
    try {
      const receipt = await sendTransaction('initiateBattle', [opponent], parseEther('0.002'));
      return receipt;
    } finally {
      setIsLoading(false);
    }
  }, [sendTransaction]);

  const getPetStats = useCallback(async (address: string): Promise<PetData | null> => {
    try {
      // First check if pet exists to avoid underflow errors on new pets
      const petExists = await rpcClient.readContract({
        address: FRENPET_ADDRESS as `0x${string}`,
        abi: FRENPET_ABI,
        functionName: 'hasPet',
        args: [address as `0x${string}`],
      });
      
      if (!petExists) {
        return null;
      }
      
      const result = await rpcClient.readContract({
        address: FRENPET_ADDRESS as `0x${string}`,
        abi: FRENPET_ABI,
        functionName: 'getPetStats',
        args: [address as `0x${string}`],
      });

      if (result) {
        const [name, level, experience, happiness, hunger, isAlive, winStreak] = result as any;
        return {
          name: name as string,
          level: Number(level),
          experience: Number(experience),
          happiness: Number(happiness),
          hunger: Number(hunger),
          isAlive: isAlive as boolean,
          winStreak: Number(winStreak || 0), // Default to 0 if undefined
        };
      }
      return null;
    } catch (error) {
      // Check if it's an underflow error (happens with very new pets)
      if (error.message?.includes('underflow') || error.message?.includes('overflow')) {
        console.log('Pet stats calculation error (new pet) - returning defaults');
        // Return default stats for a new pet
        return {
          name: 'New Pet',
          level: 1,
          experience: 0,
          happiness: 100,
          hunger: 0,
          isAlive: true,
          winStreak: 0,
        };
      }
      console.error('Failed to get pet stats:', error);
      return null;
    }
  }, []);

  const hasPet = useCallback(async (address: string): Promise<boolean> => {
    try {
      const result = await rpcClient.readContract({
        address: FRENPET_ADDRESS as `0x${string}`,
        abi: FRENPET_ABI,
        functionName: 'hasPet',
        args: [address as `0x${string}`],
      });
      return result as boolean;
    } catch (error) {
      console.error('Failed to check hasPet:', error);
      return false;
    }
  }, []);

  return {
    isLoading,
    pendingTx,
    createPet,
    feedPet,
    playWithPet,
    initiateBattle,
    getPetStats,
    hasPet,
  };
}