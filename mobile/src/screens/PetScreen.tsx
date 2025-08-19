import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../hooks/useWallet';
import { useFrenPet, PetData } from '../hooks/useFrenPet';

export function PetScreen() {
  const { address, wallet, porto } = useWallet();
  const frenPet = useFrenPet({ wallet, porto, useGasless: true });
  
  const [petName, setPetName] = useState('');
  const [myPet, setMyPet] = useState<PetData | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [hasPetCheck, setHasPetCheck] = useState(false);

  const loadPetData = useCallback(async () => {
    if (!address) return;
    
    try {
      const hasExistingPet = await frenPet.hasPet(address);
      setHasPetCheck(hasExistingPet);
      
      if (hasExistingPet) {
        const stats = await frenPet.getPetStats(address);
        setMyPet(stats);
      }
    } catch (error) {
      console.error('Failed to load pet data:', error);
    }
  }, [address, frenPet]);

  useEffect(() => {
    loadPetData();
  }, [loadPetData]);

  const onRefresh = async () => {
    setIsRefreshing(true);
    await loadPetData();
    setIsRefreshing(false);
  };

  const handleCreatePet = async () => {
    if (!petName.trim()) {
      Alert.alert('Error', 'Please enter a name for your pet');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await frenPet.createPet(petName);
      Alert.alert('Success', 'Your pet has been created!');
      setPetName('');
      await loadPetData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create pet');
    }
  };

  const handleFeedPet = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await frenPet.feedPet();
      Alert.alert('Success', 'Your pet has been fed!');
      await loadPetData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to feed pet');
    }
  };

  const handlePlayWithPet = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await frenPet.playWithPet();
      Alert.alert('Success', 'Your pet is happy!');
      await loadPetData();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to play with pet');
    }
  };

  // Battle functionality removed in simplified version

  const getPetEmoji = () => {
    if (!myPet || !myPet.isAlive) return '💀';
    if (myPet.happiness > 70 && myPet.hunger < 30) return '😊';
    if (myPet.happiness > 50) return '🙂';
    if (myPet.hunger > 70) return '😢';
    return '😐';
  };

  if (frenPet.isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#6B46C1" />
        <Text style={styles.loadingText}>Processing...</Text>
      </View>
    );
  }

  // Show create pet screen if no pet or pet is dead
  if (!myPet || !myPet.isAlive) {
    return (
      <ScrollView style={styles.container}>
        <View style={styles.createCard}>
          <Text style={styles.createTitle}>
            {myPet && !myPet.isAlive ? 'Your pet has passed away 😢' : 'Create Your FrenPet'}
          </Text>
          {myPet && !myPet.isAlive && (
            <Text style={styles.deadPetText}>
              {myPet.name} lived a good life. Create a new pet to continue playing.
            </Text>
          )}
          <TextInput
            style={styles.input}
            placeholder="Enter pet name"
            value={petName}
            onChangeText={setPetName}
            maxLength={20}
          />
          <TouchableOpacity style={styles.createButton} onPress={handleCreatePet}>
            <Text style={styles.createButtonText}>Create Pet 🐾</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Pet Display */}
      <View style={styles.petCard}>
        <Text style={styles.petEmoji}>{getPetEmoji()}</Text>
        <Text style={styles.petName}>{myPet.name}</Text>
        <View style={styles.levelBadge}>
          <Text style={styles.levelText}>Level {myPet.level}</Text>
        </View>
      </View>

      {/* Stats */}
      <View style={styles.statsCard}>
        <View style={styles.stat}>
          <Text style={styles.statLabel}>Happiness</Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, styles.happinessFill, { width: `${myPet.happiness}%` }]} 
            />
          </View>
          <Text style={styles.statValue}>{myPet.happiness}/100</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statLabel}>Hunger</Text>
          <View style={styles.progressBar}>
            <View 
              style={[styles.progressFill, styles.hungerFill, { width: `${myPet.hunger}%` }]} 
            />
          </View>
          <Text style={styles.statValue}>{myPet.hunger}/100</Text>
        </View>

        <View style={styles.stat}>
          <Text style={styles.statLabel}>Experience</Text>
          <View style={styles.progressBar}>
            <View 
              style={[
                styles.progressFill, 
                styles.expFill, 
                { width: `${(myPet.experience / (myPet.level * 100)) * 100}%` }
              ]} 
            />
          </View>
          <Text style={styles.statValue}>{myPet.experience}/{myPet.level * 100}</Text>
        </View>

        {/* Win streak removed in simplified version */}
      </View>

      {/* Action Buttons */}
      <View style={styles.actionsCard}>
        <Text style={styles.sectionTitle}>Actions</Text>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={handleFeedPet}>
            <Text style={styles.actionEmoji}>🍎</Text>
            <Text style={styles.actionText}>Feed</Text>
            <Text style={styles.actionCost}>Free! 🎉</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handlePlayWithPet}>
            <Text style={styles.actionEmoji}>🎮</Text>
            <Text style={styles.actionText}>Play</Text>
            <Text style={styles.actionCost}>Free! 🎉</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Battle functionality removed in simplified version */}
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
  loadingText: {
    marginTop: 10,
    color: '#6B7280',
  },
  createCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  createTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#1F2937',
  },
  deadPetText: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  createButton: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
  },
  petCard: {
    backgroundColor: 'white',
    margin: 20,
    padding: 30,
    borderRadius: 12,
    alignItems: 'center',
  },
  petEmoji: {
    fontSize: 80,
    marginBottom: 10,
  },
  petName: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  levelBadge: {
    backgroundColor: '#6B46C1',
    paddingHorizontal: 15,
    paddingVertical: 5,
    borderRadius: 20,
  },
  levelText: {
    color: 'white',
    fontWeight: 'bold',
  },
  statsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  stat: {
    marginBottom: 20,
  },
  statLabel: {
    fontSize: 14,
    color: '#6B7280',
    marginBottom: 5,
  },
  progressBar: {
    height: 20,
    backgroundColor: '#E5E7EB',
    borderRadius: 10,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 10,
  },
  happinessFill: {
    backgroundColor: '#10B981',
  },
  hungerFill: {
    backgroundColor: '#EF4444',
  },
  expFill: {
    backgroundColor: '#3B82F6',
  },
  statValue: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 5,
    textAlign: 'right',
  },
  winStreakContainer: {
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  winStreakText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#6B46C1',
  },
  actionsCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 20,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#1F2937',
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  actionButton: {
    backgroundColor: '#F3F4F6',
    padding: 20,
    borderRadius: 12,
    alignItems: 'center',
    flex: 0.45,
  },
  actionEmoji: {
    fontSize: 30,
    marginBottom: 5,
  },
  actionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 5,
  },
  actionCost: {
    fontSize: 12,
    color: '#6B7280',
  },
  battleCard: {
    backgroundColor: 'white',
    marginHorizontal: 20,
    marginBottom: 40,
    padding: 20,
    borderRadius: 12,
  },
  battleButton: {
    backgroundColor: '#DC2626',
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  battleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
});