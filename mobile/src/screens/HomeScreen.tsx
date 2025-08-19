import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useWallet } from '../hooks/useWallet';

export function HomeScreen({ navigation }: any) {
  const { address, balance, isLoading, refreshBalance, porto } = useWallet();

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
        <Text style={styles.loadingText}>Initializing wallet...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>FrenPet</Text>
        <Text style={styles.subtitle}>Your Virtual Pet on RISE</Text>
      </View>

      <View style={styles.walletCard}>
        <Text style={styles.cardTitle}>Wallet</Text>
        <View style={styles.addressContainer}>
          <Text style={styles.label}>Address:</Text>
          <Text style={styles.address} numberOfLines={1} ellipsizeMode="middle">
            {address}
          </Text>
        </View>
        <View style={styles.balanceContainer}>
          <Text style={styles.label}>Balance:</Text>
          <Text style={styles.balance}>{parseFloat(balance).toFixed(4)} RISE</Text>
        </View>
        <TouchableOpacity style={styles.refreshButton} onPress={refreshBalance}>
          <Text style={styles.refreshButtonText}>Refresh Balance</Text>
        </TouchableOpacity>
      </View>

      {porto.isReady && (
        <View style={styles.portoCard}>
          <Text style={styles.cardTitle}>🚀 Gasless Transactions</Text>
          <Text style={styles.portoStatus}>
            Porto Relayer: {porto.isHealthy ? '✅ Active' : '⚠️ Offline'}
          </Text>
          {porto.isHealthy && (
            <Text style={styles.portoInfo}>
              All transactions are free - no gas required!
            </Text>
          )}
        </View>
      )}

      <TouchableOpacity
        style={styles.playButton}
        onPress={() => navigation.navigate('Pet')}
      >
        <Text style={styles.playButtonText}>Play with Pet</Text>
      </TouchableOpacity>

      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How to Play</Text>
        <Text style={styles.infoText}>
          1. Create your virtual pet{'\n'}
          2. Keep it happy and fed{'\n'}
          3. Play games and battle other pets{'\n'}
          4. Level up and become the champion!
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F3F4F6',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  header: {
    backgroundColor: '#6B46C1',
    padding: 30,
    paddingTop: 60,
    alignItems: 'center',
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  subtitle: {
    fontSize: 16,
    color: '#E9D5FF',
    marginTop: 5,
  },
  walletCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1F2937',
  },
  addressContainer: {
    marginBottom: 15,
  },
  balanceContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  address: {
    fontSize: 14,
    color: '#1F2937',
    fontFamily: 'monospace',
  },
  balance: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#6B46C1',
  },
  refreshButton: {
    backgroundColor: '#F3F4F6',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  refreshButtonText: {
    color: '#6B46C1',
    fontWeight: '600',
  },
  playButton: {
    backgroundColor: '#6B46C1',
    margin: 20,
    marginTop: 0,
    padding: 18,
    borderRadius: 12,
    alignItems: 'center',
  },
  playButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  infoCard: {
    backgroundColor: 'white',
    margin: 20,
    marginTop: 0,
    padding: 20,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#1F2937',
  },
  infoText: {
    fontSize: 14,
    color: '#6B7280',
    lineHeight: 22,
  },
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },
  portoCard: {
    backgroundColor: '#F0FDF4',
    margin: 20,
    marginTop: 0,
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#86EFAC',
  },
  portoStatus: {
    fontSize: 14,
    color: '#15803D',
    marginTop: 5,
  },
  portoInfo: {
    fontSize: 12,
    color: '#166534',
    marginTop: 8,
    fontStyle: 'italic',
  },
});