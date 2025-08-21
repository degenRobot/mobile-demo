import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useWallet } from '../hooks/useWallet';
import { useFrenPet, PetData } from '../hooks/useFrenPet';
import {
  PixelButton,
  PixelCard,
  PixelStatsCard,
  HappinessBar,
  HungerBar,
  ExperienceBar,
  pixelTheme,
} from '../components/ui';
import { PixelIconButton, PixelActionBar } from '../components/ui/PixelIconButton';
import { useToast } from '../components/ui/PixelToast';

export function PetScreen() {
  const { address, wallet, porto } = useWallet();
  const frenPet = useFrenPet({ wallet, porto, useGasless: true });
  const { showToast } = useToast();
  
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
      showToast('ENTER A NAME!', 'error');
      return;
    }

    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await frenPet.createPet(petName);
      showToast('PET CREATED!', 'success');
      setPetName('');
      await loadPetData();
    } catch (error: any) {
      showToast(error.message || 'FAILED TO CREATE', 'error');
    }
  };

  const handleFeedPet = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await frenPet.feedPet();
      showToast('PET FED!', 'success');
      await loadPetData();
    } catch (error: any) {
      showToast(error.message || 'FAILED TO FEED', 'error');
    }
  };

  const handlePlayWithPet = async () => {
    try {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      await frenPet.playWithPet();
      showToast('PET IS HAPPY!', 'success');
      await loadPetData();
    } catch (error: any) {
      showToast(error.message || 'FAILED TO PLAY', 'error');
    }
  };

  const handleTrainPet = async () => {
    showToast('TRAINING...', 'info');
    // TODO: Implement training
    setTimeout(() => showToast('+10 XP!', 'success'), 1000);
  };

  const handleHealPet = async () => {
    showToast('HEALING...', 'info');
    // TODO: Implement healing
    setTimeout(() => showToast('FULLY HEALED!', 'success'), 1000);
  };

  const handleBattlePet = async () => {
    showToast('FINDING OPPONENT...', 'info');
    // TODO: Navigate to battle screen
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
        <ActivityIndicator size="large" color={pixelTheme.colors.primary} />
        <Text style={styles.loadingText}>PROCESSING...</Text>
      </View>
    );
  }

  // Show create pet screen if no pet or pet is dead
  if (!myPet || !myPet.isAlive) {
    return (
      <ScrollView style={styles.container}>
        <PixelCard
          title={myPet && !myPet.isAlive ? 'GAME OVER' : 'NEW GAME'}
          variant="elevated"
          style={styles.createCardContainer}
        >
          {myPet && !myPet.isAlive && (
            <Text style={styles.deadPetText}>
              {myPet.name} HAS FAINTED.
              START A NEW ADVENTURE!
            </Text>
          )}
          <TextInput
            style={styles.pixelInput}
            placeholder="ENTER PET NAME"
            placeholderTextColor={pixelTheme.colors.textLight}
            value={petName}
            onChangeText={setPetName}
            maxLength={20}
          />
          <PixelButton
            title="CREATE PET"
            onPress={handleCreatePet}
            variant="primary"
            size="large"
            fullWidth
          />
        </PixelCard>
      </ScrollView>
    );
  }

  return (
    <ScrollView 
      style={styles.container}
      refreshControl={
        <RefreshControl 
          refreshing={isRefreshing} 
          onRefresh={onRefresh}
          tintColor={pixelTheme.colors.primary}
        />
      }
    >
      {/* Pet Display */}
      <PixelCard variant="elevated" style={styles.petCardContainer}>
        <View style={styles.petDisplay}>
          <Text style={styles.petEmoji}>{getPetEmoji()}</Text>
          <Text style={styles.petName}>{myPet.name.toUpperCase()}</Text>
          <View style={styles.levelBadge}>
            <Text style={styles.levelText}>LV.{myPet.level}</Text>
          </View>
        </View>
      </PixelCard>

      {/* Stats */}
      <PixelCard title="STATS" variant="inset" style={styles.statsCardContainer}>
        <HappinessBar
          value={myPet.happiness}
          max={100}
          showValue
        />
        <HungerBar
          value={myPet.hunger}
          max={100}
          showValue
        />
        <ExperienceBar
          value={myPet.experience}
          max={myPet.level * 100}
          showValue
        />
      </PixelCard>

      {/* Action Buttons */}
      <PixelCard title="ACTIONS" variant="default" style={styles.actionsCardContainer}>
        <PixelActionBar>
          <PixelIconButton
            emoji="🍎"
            label="FEED"
            onPress={handleFeedPet}
            variant="success"
            size="large"
          />
          <PixelIconButton
            emoji="🎮"
            label="PLAY"
            onPress={handlePlayWithPet}
            variant="primary"
            size="large"
          />
          <PixelIconButton
            emoji="💪"
            label="TRAIN"
            onPress={handleTrainPet}
            variant="default"
            size="large"
          />
          <PixelIconButton
            emoji="💊"
            label="HEAL"
            onPress={handleHealPet}
            variant="success"
            size="large"
          />
          <PixelIconButton
            emoji="⚔️"
            label="BATTLE"
            onPress={handleBattlePet}
            variant="danger"
            size="large"
          />
        </PixelActionBar>
      </PixelCard>

      {/* Gasless indicator */}
      <View style={styles.gaslessIndicator}>
        <Text style={styles.gaslessText}>⚡ GASLESS MODE ACTIVE</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: pixelTheme.colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: pixelTheme.colors.background,
  },
  loadingText: {
    marginTop: pixelTheme.spacing.md,
    color: pixelTheme.colors.textLight,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    fontSize: pixelTheme.typography.fontSize.medium,
    letterSpacing: pixelTheme.typography.letterSpacing.wide,
  },
  createCardContainer: {
    margin: pixelTheme.spacing.lg,
  },
  deadPetText: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.danger,
    textAlign: 'center',
    marginBottom: pixelTheme.spacing.lg,
    letterSpacing: pixelTheme.typography.letterSpacing.normal,
  },
  pixelInput: {
    borderWidth: pixelTheme.borders.width.thick,
    borderColor: pixelTheme.colors.border,
    backgroundColor: pixelTheme.colors.surface,
    paddingHorizontal: pixelTheme.spacing.md,
    paddingVertical: pixelTheme.spacing.sm,
    marginBottom: pixelTheme.spacing.md,
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.text,
    letterSpacing: pixelTheme.typography.letterSpacing.wide,
  },
  // Pet display styles
  petCardContainer: {
    margin: pixelTheme.spacing.lg,
  },
  petDisplay: {
    alignItems: 'center',
  },
  petEmoji: {
    fontSize: 80,
    marginBottom: pixelTheme.spacing.sm,
  },
  petName: {
    fontSize: pixelTheme.typography.fontSize.huge,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
    marginBottom: pixelTheme.spacing.sm,
    letterSpacing: pixelTheme.typography.letterSpacing.wide,
  },
  levelBadge: {
    backgroundColor: pixelTheme.colors.primary,
    paddingHorizontal: pixelTheme.spacing.md,
    paddingVertical: pixelTheme.spacing.xs,
    borderWidth: pixelTheme.borders.width.medium,
    borderColor: pixelTheme.colors.border,
  },
  levelText: {
    color: pixelTheme.colors.surface,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    fontSize: pixelTheme.typography.fontSize.medium,
    letterSpacing: pixelTheme.typography.letterSpacing.wide,
  },
  // Stats styles
  statsCardContainer: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  // Actions styles
  actionsCardContainer: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  actionButtons: {
    gap: pixelTheme.spacing.md,
  },
  actionButtonContainer: {
    flex: 1,
  },
  actionDescription: {
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
    textAlign: 'center',
    marginTop: pixelTheme.spacing.xs,
    letterSpacing: pixelTheme.typography.letterSpacing.normal,
  },
  // Gasless indicator
  gaslessIndicator: {
    alignItems: 'center',
    paddingVertical: pixelTheme.spacing.md,
    marginBottom: pixelTheme.spacing.xl,
  },
  gaslessText: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.success,
    letterSpacing: pixelTheme.typography.letterSpacing.wide,
  },
});