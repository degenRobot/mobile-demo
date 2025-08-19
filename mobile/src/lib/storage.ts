/**
 * Storage abstraction layer
 * Provides a fallback for SecureStore when not available
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Try to import SecureStore, but handle if it's not available
let SecureStore: any = null;
try {
  SecureStore = require('expo-secure-store');
} catch (error) {
  console.log('SecureStore not available, using AsyncStorage fallback');
}

// Check if we're in a web environment or SecureStore is not available
const isWeb = typeof window !== 'undefined' && !window.ReactNativeWebView;
const useAsyncStorage = isWeb || !SecureStore;

class StorageService {
  private useSecure: boolean = false;

  async init() {
    try {
      // Check if SecureStore is available
      if (!isWeb && SecureStore && SecureStore.isAvailableAsync) {
        this.useSecure = await SecureStore.isAvailableAsync();
      } else {
        this.useSecure = false;
      }
    } catch (error) {
      console.warn('SecureStore not available, using AsyncStorage:', error);
      this.useSecure = false;
    }
  }

  async getItem(key: string): Promise<string | null> {
    try {
      if (this.useSecure && SecureStore) {
        return await SecureStore.getItemAsync(key);
      } else {
        // Fallback to AsyncStorage
        return await AsyncStorage.getItem(key);
      }
    } catch (error) {
      console.error('Storage getItem error:', error);
      return null;
    }
  }

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (this.useSecure && SecureStore) {
        await SecureStore.setItemAsync(key, value);
      } else {
        // Fallback to AsyncStorage
        await AsyncStorage.setItem(key, value);
      }
    } catch (error) {
      console.error('Storage setItem error:', error);
      throw error;
    }
  }

  async deleteItem(key: string): Promise<void> {
    try {
      if (this.useSecure && SecureStore) {
        await SecureStore.deleteItemAsync(key);
      } else {
        // Fallback to AsyncStorage
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.error('Storage deleteItem error:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      if (!this.useSecure) {
        await AsyncStorage.clear();
      }
      // SecureStore doesn't have a clear method, would need to delete keys individually
    } catch (error) {
      console.error('Storage clear error:', error);
    }
  }
}

// Export singleton instance
export const Storage = new StorageService();

// Initialize on import
Storage.init().catch(console.error);