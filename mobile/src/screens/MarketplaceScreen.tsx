/**
 * Marketplace Screen - Trade Items
 * Players can buy and sell items with other players
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
} from 'react-native';
import { PixelCard, PixelButton, pixelTheme } from '../components/ui';
import { useToast } from '../components/ui/PixelToast';

interface MarketListing {
  id: string;
  seller: string;
  itemName: string;
  itemEmoji: string;
  price: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  quantity: number;
  timestamp: number;
}

export function MarketplaceScreen() {
  const { showToast } = useToast();
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [listings] = useState<MarketListing[]>([
    {
      id: '1',
      seller: '0x1234...5678',
      itemName: 'FIRE STONE',
      itemEmoji: '🔥',
      price: 100,
      rarity: 'rare',
      quantity: 1,
      timestamp: Date.now() - 3600000,
    },
    {
      id: '2',
      seller: '0xABCD...EFGH',
      itemName: 'MEGA POTION',
      itemEmoji: '🧪',
      price: 50,
      rarity: 'common',
      quantity: 5,
      timestamp: Date.now() - 7200000,
    },
    {
      id: '3',
      seller: '0x9876...5432',
      itemName: 'DRAGON SCALE',
      itemEmoji: '🐉',
      price: 500,
      rarity: 'legendary',
      quantity: 1,
      timestamp: Date.now() - 1800000,
    },
  ]);

  const [playerCoins] = useState(250);

  const getRarityColor = (rarity: MarketListing['rarity']) => {
    switch (rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#B847F1';
      case 'rare': return '#4169E1';
      default: return pixelTheme.colors.textLight;
    }
  };

  const handleBuyItem = (listing: MarketListing) => {
    if (playerCoins >= listing.price) {
      showToast(`PURCHASED ${listing.itemName}!`, 'success');
      // TODO: Implement purchase logic
    } else {
      showToast('NOT ENOUGH COINS!', 'error');
    }
  };

  const handleCreateListing = () => {
    showToast('OPENING SELL MENU...', 'info');
    // TODO: Show create listing dialog
  };

  const filteredListings = selectedFilter === 'all'
    ? listings
    : listings.filter(l => l.rarity === selectedFilter);

  const filters = [
    { id: 'all', label: 'ALL' },
    { id: 'common', label: 'COMMON' },
    { id: 'rare', label: 'RARE' },
    { id: 'epic', label: 'EPIC' },
    { id: 'legendary', label: 'LEGEND' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <PixelCard variant="elevated" style={styles.header}>
        <Text style={styles.title}>🏪 MARKETPLACE</Text>
        <View style={styles.coinsDisplay}>
          <Text style={styles.coinsText}>💰 {playerCoins} COINS</Text>
        </View>
      </PixelCard>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <PixelButton
          title="📤 SELL ITEM"
          onPress={handleCreateListing}
          variant="secondary"
          size="medium"
          fullWidth
        />
      </View>

      {/* Filters */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.filtersContainer}
      >
        {filters.map(filter => (
          <TouchableOpacity
            key={filter.id}
            onPress={() => setSelectedFilter(filter.id)}
            style={[
              styles.filterChip,
              selectedFilter === filter.id && styles.filterChipActive,
            ]}
          >
            <Text style={[
              styles.filterText,
              selectedFilter === filter.id && styles.filterTextActive,
            ]}>
              {filter.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Listings */}
      <PixelCard title="MARKET LISTINGS" variant="default" style={styles.listingsCard}>
        {filteredListings.length === 0 ? (
          <Text style={styles.emptyText}>NO ITEMS AVAILABLE</Text>
        ) : (
          filteredListings.map(listing => (
            <View key={listing.id} style={styles.listingItem}>
              <View style={styles.listingLeft}>
                <Text style={styles.itemEmoji}>{listing.itemEmoji}</Text>
                <View style={styles.itemInfo}>
                  <Text style={styles.itemName}>{listing.itemName}</Text>
                  <Text style={[
                    styles.itemRarity,
                    { color: getRarityColor(listing.rarity) },
                  ]}>
                    {listing.rarity.toUpperCase()} × {listing.quantity}
                  </Text>
                </View>
              </View>
              <View style={styles.listingRight}>
                <Text style={styles.price}>💰 {listing.price}</Text>
                <PixelButton
                  title="BUY"
                  onPress={() => handleBuyItem(listing)}
                  variant={playerCoins >= listing.price ? 'success' : 'danger'}
                  size="small"
                  disabled={playerCoins < listing.price}
                />
              </View>
            </View>
          ))
        )}
      </PixelCard>

      {/* Hot Deals */}
      <PixelCard title="🔥 HOT DEALS" variant="elevated" style={styles.dealsCard}>
        <View style={styles.dealItem}>
          <Text style={styles.dealEmoji}>⚡</Text>
          <View style={styles.dealInfo}>
            <Text style={styles.dealName}>STARTER PACK</Text>
            <Text style={styles.dealDescription}>5 RANDOM ITEMS</Text>
          </View>
          <PixelButton
            title="💰 75"
            onPress={() => showToast('PURCHASED STARTER PACK!', 'success')}
            variant="warning"
            size="small"
          />
        </View>
      </PixelCard>

      {/* Trade History */}
      <PixelCard title="RECENT TRADES" variant="inset" style={styles.historyCard}>
        <Text style={styles.historyItem}>📥 BOUGHT APPLE × 3 - 30 COINS</Text>
        <Text style={styles.historyItem}>📤 SOLD RARE CANDY × 1 - 150 COINS</Text>
        <Text style={styles.historyItem}>📥 BOUGHT BALL × 2 - 40 COINS</Text>
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
  coinsDisplay: {
    marginTop: pixelTheme.spacing.sm,
    paddingHorizontal: pixelTheme.spacing.md,
    paddingVertical: pixelTheme.spacing.xs,
    backgroundColor: pixelTheme.colors.warning,
    borderWidth: pixelTheme.borders.width.medium,
    borderColor: pixelTheme.colors.border,
  },
  coinsText: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.surface,
  },
  quickActions: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.md,
  },
  filtersContainer: {
    paddingHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.md,
  },
  filterChip: {
    paddingHorizontal: pixelTheme.spacing.md,
    paddingVertical: pixelTheme.spacing.xs,
    marginRight: pixelTheme.spacing.sm,
    borderWidth: pixelTheme.borders.width.medium,
    borderColor: pixelTheme.colors.border,
    backgroundColor: pixelTheme.colors.surface,
  },
  filterChipActive: {
    backgroundColor: pixelTheme.colors.primary,
    borderColor: pixelTheme.colors.primaryDark,
  },
  filterText: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  filterTextActive: {
    color: pixelTheme.colors.surface,
  },
  listingsCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  listingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: pixelTheme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: pixelTheme.colors.border,
  },
  listingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  itemEmoji: {
    fontSize: 32,
    marginRight: pixelTheme.spacing.sm,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  itemRarity: {
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
  },
  listingRight: {
    alignItems: 'flex-end',
    gap: pixelTheme.spacing.xs,
  },
  price: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.warning,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
    paddingVertical: pixelTheme.spacing.xl,
  },
  dealsCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  dealItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: pixelTheme.spacing.sm,
  },
  dealEmoji: {
    fontSize: 32,
  },
  dealInfo: {
    flex: 1,
  },
  dealName: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  dealDescription: {
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  historyCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.xl,
  },
  historyItem: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
    paddingVertical: pixelTheme.spacing.xs,
  },
});