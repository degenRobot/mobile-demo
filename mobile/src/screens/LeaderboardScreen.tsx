/**
 * Leaderboard Screen - Rankings & Competition
 * Display top players and seasonal rankings
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { PixelCard, pixelTheme } from '../components/ui';

interface PlayerRank {
  rank: number;
  address: string;
  petName: string;
  level: number;
  wins: number;
  winStreak: number;
  points: number;
}

export function LeaderboardScreen() {
  const [selectedTab, setSelectedTab] = useState<'season' | 'alltime'>('season');
  const [players] = useState<PlayerRank[]>([
    {
      rank: 1,
      address: '0xKING...2024',
      petName: 'DRAGONLORD',
      level: 42,
      wins: 156,
      winStreak: 23,
      points: 9999,
    },
    {
      rank: 2,
      address: '0xCHAMP...1337',
      petName: 'THUNDER',
      level: 38,
      wins: 142,
      winStreak: 15,
      points: 8750,
    },
    {
      rank: 3,
      address: '0xHERO...9000',
      petName: 'BLAZE',
      level: 35,
      wins: 128,
      winStreak: 12,
      points: 7500,
    },
    {
      rank: 4,
      address: '0xPRO...4567',
      petName: 'SHADOW',
      level: 33,
      wins: 115,
      winStreak: 8,
      points: 6200,
    },
    {
      rank: 5,
      address: '0xYOU...HERE',
      petName: 'YOUR PET',
      level: 5,
      wins: 0,
      winStreak: 0,
      points: 100,
    },
  ]);

  const getRankColor = (rank: number) => {
    switch (rank) {
      case 1: return '#FFD700'; // Gold
      case 2: return '#C0C0C0'; // Silver
      case 3: return '#CD7F32'; // Bronze
      default: return pixelTheme.colors.text;
    }
  };

  const getRankEmoji = (rank: number) => {
    switch (rank) {
      case 1: return '👑';
      case 2: return '🥈';
      case 3: return '🥉';
      default: return `#${rank}`;
    }
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <PixelCard variant="elevated" style={styles.header}>
        <Text style={styles.title}>🏆 LEADERBOARD</Text>
        <View style={styles.seasonInfo}>
          <Text style={styles.seasonText}>SEASON 1</Text>
          <Text style={styles.seasonTimer}>ENDS IN: 15D 8H 32M</Text>
        </View>
      </PixelCard>

      {/* Tab Selector */}
      <View style={styles.tabs}>
        <TouchableOpacity
          onPress={() => setSelectedTab('season')}
          style={[
            styles.tab,
            selectedTab === 'season' && styles.tabActive,
          ]}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'season' && styles.tabTextActive,
          ]}>
            SEASON
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setSelectedTab('alltime')}
          style={[
            styles.tab,
            selectedTab === 'alltime' && styles.tabActive,
          ]}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'alltime' && styles.tabTextActive,
          ]}>
            ALL TIME
          </Text>
        </TouchableOpacity>
      </View>

      {/* Top 3 Podium */}
      <PixelCard variant="elevated" style={styles.podiumCard}>
        <View style={styles.podium}>
          {/* 2nd Place */}
          <View style={styles.podiumPlace}>
            <Text style={styles.podiumEmoji}>🥈</Text>
            <View style={[styles.podiumBar, { height: 60 }]}>
              <Text style={styles.podiumRank}>2</Text>
            </View>
            <Text style={styles.podiumName}>THUNDER</Text>
            <Text style={styles.podiumPoints}>8750</Text>
          </View>
          
          {/* 1st Place */}
          <View style={styles.podiumPlace}>
            <Text style={styles.podiumEmoji}>👑</Text>
            <View style={[styles.podiumBar, { height: 80, backgroundColor: '#FFD700' }]}>
              <Text style={styles.podiumRank}>1</Text>
            </View>
            <Text style={styles.podiumName}>DRAGONLORD</Text>
            <Text style={styles.podiumPoints}>9999</Text>
          </View>
          
          {/* 3rd Place */}
          <View style={styles.podiumPlace}>
            <Text style={styles.podiumEmoji}>🥉</Text>
            <View style={[styles.podiumBar, { height: 40 }]}>
              <Text style={styles.podiumRank}>3</Text>
            </View>
            <Text style={styles.podiumName}>BLAZE</Text>
            <Text style={styles.podiumPoints}>7500</Text>
          </View>
        </View>
      </PixelCard>

      {/* Rankings List */}
      <PixelCard title="RANKINGS" variant="default" style={styles.rankingsCard}>
        {players.map((player) => (
          <View 
            key={player.rank} 
            style={[
              styles.rankItem,
              player.rank === 5 && styles.yourRank,
            ]}
          >
            <View style={styles.rankLeft}>
              <Text style={[
                styles.rankNumber,
                { color: getRankColor(player.rank) },
              ]}>
                {getRankEmoji(player.rank)}
              </Text>
              <View style={styles.playerInfo}>
                <Text style={styles.petName}>{player.petName}</Text>
                <Text style={styles.playerAddress}>{player.address}</Text>
              </View>
            </View>
            <View style={styles.rankRight}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>LV</Text>
                <Text style={styles.statValue}>{player.level}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>WINS</Text>
                <Text style={styles.statValue}>{player.wins}</Text>
              </View>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>PTS</Text>
                <Text style={styles.statValueBig}>{player.points}</Text>
              </View>
            </View>
          </View>
        ))}
      </PixelCard>

      {/* Season Rewards */}
      <PixelCard title="🎁 SEASON REWARDS" variant="inset" style={styles.rewardsCard}>
        <View style={styles.rewardItem}>
          <Text style={styles.rewardRank}>🥇 TOP 1</Text>
          <Text style={styles.rewardPrize}>1000 COINS + LEGENDARY PET</Text>
        </View>
        <View style={styles.rewardItem}>
          <Text style={styles.rewardRank}>🥈 TOP 2-5</Text>
          <Text style={styles.rewardPrize}>500 COINS + EPIC ITEM</Text>
        </View>
        <View style={styles.rewardItem}>
          <Text style={styles.rewardRank}>🥉 TOP 6-10</Text>
          <Text style={styles.rewardPrize}>250 COINS + RARE ITEM</Text>
        </View>
        <View style={styles.rewardItem}>
          <Text style={styles.rewardRank}>🎖️ TOP 11-50</Text>
          <Text style={styles.rewardPrize}>100 COINS</Text>
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
  seasonInfo: {
    marginTop: pixelTheme.spacing.sm,
    alignItems: 'center',
  },
  seasonText: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.primary,
  },
  seasonTimer: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.warning,
    marginTop: pixelTheme.spacing.xs,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.md,
  },
  tab: {
    flex: 1,
    paddingVertical: pixelTheme.spacing.sm,
    borderWidth: pixelTheme.borders.width.medium,
    borderColor: pixelTheme.colors.border,
    backgroundColor: pixelTheme.colors.surface,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: pixelTheme.colors.primary,
    borderColor: pixelTheme.colors.primaryDark,
  },
  tabText: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  tabTextActive: {
    color: pixelTheme.colors.surface,
  },
  podiumCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  podium: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    paddingVertical: pixelTheme.spacing.md,
  },
  podiumPlace: {
    alignItems: 'center',
    flex: 1,
  },
  podiumEmoji: {
    fontSize: 32,
    marginBottom: pixelTheme.spacing.xs,
  },
  podiumBar: {
    width: '80%',
    backgroundColor: pixelTheme.colors.primary,
    borderWidth: pixelTheme.borders.width.medium,
    borderColor: pixelTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  podiumRank: {
    fontSize: pixelTheme.typography.fontSize.large,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.surface,
  },
  podiumName: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.text,
    marginTop: pixelTheme.spacing.xs,
  },
  podiumPoints: {
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  rankingsCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  rankItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: pixelTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: pixelTheme.colors.border,
  },
  yourRank: {
    backgroundColor: pixelTheme.colors.primaryLight + '20',
  },
  rankLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  rankNumber: {
    width: 40,
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    textAlign: 'center',
  },
  playerInfo: {
    marginLeft: pixelTheme.spacing.sm,
  },
  petName: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  playerAddress: {
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  rankRight: {
    flexDirection: 'row',
    gap: pixelTheme.spacing.md,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  statValue: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  statValueBig: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.primary,
  },
  rewardsCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.xl,
  },
  rewardItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: pixelTheme.spacing.xs,
  },
  rewardRank: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  rewardPrize: {
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.success,
  },
});