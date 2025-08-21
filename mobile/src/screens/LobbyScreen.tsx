/**
 * Lobby Screen - Battle Challenges
 * Players can create and accept battle challenges
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { PixelCard, PixelButton, pixelTheme } from '../components/ui';
import { useToast } from '../components/ui/PixelToast';

interface BattleChallenge {
  id: string;
  challenger: string;
  challengerPet: string;
  level: number;
  wager?: number;
  timestamp: number;
}

export function LobbyScreen() {
  const { showToast } = useToast();
  const [challenges, setChallenges] = useState<BattleChallenge[]>([
    // Mock data for now
    {
      id: '1',
      challenger: '0x1234...5678',
      challengerPet: 'FLUFFY',
      level: 5,
      wager: 10,
      timestamp: Date.now() - 300000,
    },
    {
      id: '2',
      challenger: '0xABCD...EFGH',
      challengerPet: 'SPIKE',
      level: 8,
      timestamp: Date.now() - 600000,
    },
  ]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isCreatingChallenge, setIsCreatingChallenge] = useState(false);

  const onRefresh = async () => {
    setIsRefreshing(true);
    // TODO: Fetch challenges from blockchain
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  const handleAcceptChallenge = async (challengeId: string) => {
    showToast('ENTERING BATTLE...', 'info');
    // TODO: Implement battle acceptance
    setTimeout(() => {
      showToast('BATTLE STARTED!', 'success');
    }, 1500);
  };

  const handleCreateChallenge = () => {
    setIsCreatingChallenge(true);
    // TODO: Show create challenge dialog
    showToast('CHALLENGE CREATED!', 'success');
    setIsCreatingChallenge(false);
  };

  const formatTime = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 60) return `${minutes}M AGO`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}H AGO`;
    return `${Math.floor(hours / 24)}D AGO`;
  };

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
      {/* Header */}
      <PixelCard variant="elevated" style={styles.header}>
        <Text style={styles.title}>⚔️ BATTLE LOBBY</Text>
        <Text style={styles.subtitle}>PROVE YOUR STRENGTH!</Text>
      </PixelCard>

      {/* Create Challenge Button */}
      <View style={styles.createSection}>
        <PixelButton
          title="🎯 CREATE CHALLENGE"
          onPress={handleCreateChallenge}
          variant="primary"
          size="large"
          fullWidth
          loading={isCreatingChallenge}
        />
      </View>

      {/* Active Challenges */}
      <PixelCard title="OPEN CHALLENGES" variant="default" style={styles.challengesCard}>
        {challenges.length === 0 ? (
          <Text style={styles.emptyText}>NO CHALLENGES AVAILABLE</Text>
        ) : (
          challenges.map((challenge) => (
            <View key={challenge.id} style={styles.challengeItem}>
              <View style={styles.challengeInfo}>
                <Text style={styles.petName}>{challenge.challengerPet}</Text>
                <Text style={styles.level}>LV.{challenge.level}</Text>
                {challenge.wager && (
                  <Text style={styles.wager}>💰 {challenge.wager}</Text>
                )}
              </View>
              <View style={styles.challengeActions}>
                <Text style={styles.timestamp}>{formatTime(challenge.timestamp)}</Text>
                <PixelButton
                  title="FIGHT"
                  onPress={() => handleAcceptChallenge(challenge.id)}
                  variant="danger"
                  size="small"
                />
              </View>
            </View>
          ))
        )}
      </PixelCard>

      {/* Battle Stats */}
      <PixelCard title="YOUR STATS" variant="inset" style={styles.statsCard}>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>BATTLES WON</Text>
          <Text style={styles.statValue}>0</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>WIN STREAK</Text>
          <Text style={styles.statValue}>0</Text>
        </View>
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>RANK</Text>
          <Text style={styles.statValue}>UNRANKED</Text>
        </View>
      </PixelCard>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: pixelTheme.colors.background,
  },
  header: {
    margin: pixelTheme.spacing.lg,
    alignItems: 'center',
  },
  title: {
    fontSize: pixelTheme.typography.fontSize.huge,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
    letterSpacing: pixelTheme.typography.letterSpacing.wide,
  },
  subtitle: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
    marginTop: pixelTheme.spacing.xs,
  },
  createSection: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  challengesCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  challengeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: pixelTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: pixelTheme.colors.border,
  },
  challengeInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pixelTheme.spacing.sm,
  },
  petName: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  level: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.primary,
  },
  wager: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.warning,
  },
  challengeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pixelTheme.spacing.sm,
  },
  timestamp: {
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
    paddingVertical: pixelTheme.spacing.lg,
  },
  statsCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.xl,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: pixelTheme.spacing.xs,
  },
  statLabel: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  statValue: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
});