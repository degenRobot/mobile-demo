import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useWallet } from '../hooks/useWallet';
import { ensureDelegated, isAccountDelegated } from '../lib/accountUpgrade';
import { Storage } from '../lib/storage';

export function SignupScreen({ navigation }: any) {
  const { address, wallet } = useWallet();
  const [isChecking, setIsChecking] = useState(true);
  const [isDelegated, setIsDelegated] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);

  useEffect(() => {
    checkDelegation();
  }, [address]);

  const checkDelegation = async () => {
    if (!address) return;
    
    setIsChecking(true);
    try {
      const delegated = await isAccountDelegated(address);
      setIsDelegated(delegated);
      
      // If already delegated, navigate to home
      if (delegated) {
        navigation.navigate('Home');
      }
    } catch (error) {
      console.error('Failed to check delegation:', error);
    } finally {
      setIsChecking(false);
    }
  };

  const handleSignup = async () => {
    setIsUpgrading(true);
    
    try {
      // Get main private key for delegation
      const mainPrivateKey = await Storage.getItem('RISE_MAIN_WALLET_KEY');
      
      if (!mainPrivateKey) {
        Alert.alert('Error', 'Wallet not initialized');
        return;
      }

      // Perform delegation
      const success = await ensureDelegated(mainPrivateKey);
      
      if (success) {
        Alert.alert(
          'Success!',
          'Your account has been upgraded for gasless transactions',
          [{ text: 'Continue', onPress: () => navigation.navigate('Home') }]
        );
      } else {
        Alert.alert(
          'Delegation Pending',
          'Account upgrade is being processed. This may take a few moments.',
          [{ text: 'Continue Anyway', onPress: () => navigation.navigate('Home') }]
        );
      }
    } catch (error: any) {
      Alert.alert('Setup Failed', error.message || 'Failed to upgrade account');
    } finally {
      setIsUpgrading(false);
    }
  };

  if (isChecking) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#6B46C1" />
        <Text style={styles.loadingText}>Checking account status...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.logo}>🐾</Text>
        <Text style={styles.title}>Welcome to FrenPet!</Text>
        <Text style={styles.subtitle}>Let's set up your gasless account</Text>

        <View style={styles.infoCard}>
          <Text style={styles.infoTitle}>What is Account Delegation?</Text>
          <Text style={styles.infoText}>
            To enable gasless transactions, we need to upgrade your account to use Porto protocol.
            This is a one-time setup that allows you to:
          </Text>
          <Text style={styles.benefit}>✅ Send transactions without gas fees</Text>
          <Text style={styles.benefit}>✅ Use session keys for better security</Text>
          <Text style={styles.benefit}>✅ Batch multiple actions together</Text>
        </View>

        <View style={styles.addressCard}>
          <Text style={styles.addressLabel}>Your Wallet Address:</Text>
          <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
            {address}
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.button, isUpgrading && styles.buttonDisabled]}
          onPress={handleSignup}
          disabled={isUpgrading}
        >
          {isUpgrading ? (
            <>
              <ActivityIndicator color="white" />
              <Text style={styles.buttonText}>Upgrading Account...</Text>
            </>
          ) : (
            <Text style={styles.buttonText}>Enable Gasless Transactions</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.skipButton}
          onPress={() => navigation.navigate('Home')}
        >
          <Text style={styles.skipText}>Skip for now (use with gas)</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    width: '90%',
    maxWidth: 400,
    alignItems: 'center',
  },
  logo: {
    fontSize: 72,
    marginBottom: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 30,
    textAlign: 'center',
  },
  infoCard: {
    backgroundColor: 'white',
    padding: 20,
    borderRadius: 12,
    width: '100%',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 15,
    lineHeight: 20,
  },
  benefit: {
    fontSize: 14,
    color: '#059669',
    marginBottom: 5,
  },
  addressCard: {
    backgroundColor: '#F9FAFB',
    padding: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 30,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  addressLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 5,
  },
  address: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  button: {
    backgroundColor: '#6B46C1',
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 12,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 10,
  },
  skipButton: {
    padding: 10,
  },
  skipText: {
    color: '#6B7280',
    fontSize: 14,
    textDecorationLine: 'underline',
  },
  loadingText: {
    marginTop: 20,
    color: '#6B7280',
    fontSize: 16,
  },
});