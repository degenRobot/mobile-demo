/**
 * Inventory Screen - Item Collection & Management
 * Players can view and use their collected items
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
import { useToast } from '../components/ui/PixelToast';

interface Item {
  id: string;
  name: string;
  emoji: string;
  quantity: number;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  type: 'food' | 'toy' | 'battle' | 'evolution' | 'cosmetic';
  description: string;
}

export function InventoryScreen() {
  const { showToast } = useToast();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [items] = useState<Item[]>([
    {
      id: '1',
      name: 'APPLE',
      emoji: '🍎',
      quantity: 5,
      rarity: 'common',
      type: 'food',
      description: 'RESTORES 20 HUNGER',
    },
    {
      id: '2',
      name: 'RARE CANDY',
      emoji: '🍬',
      quantity: 2,
      rarity: 'rare',
      type: 'evolution',
      description: 'INSTANT LEVEL UP',
    },
    {
      id: '3',
      name: 'BALL',
      emoji: '⚽',
      quantity: 3,
      rarity: 'common',
      type: 'toy',
      description: '+30 HAPPINESS',
    },
    {
      id: '4',
      name: 'POWER STONE',
      emoji: '💎',
      quantity: 1,
      rarity: 'epic',
      type: 'battle',
      description: '+10 ATTACK POWER',
    },
  ]);

  const getRarityColor = (rarity: Item['rarity']) => {
    switch (rarity) {
      case 'legendary': return '#FFD700';
      case 'epic': return '#B847F1';
      case 'rare': return '#4169E1';
      default: return pixelTheme.colors.textLight;
    }
  };

  const handleUseItem = (item: Item) => {
    showToast(`USED ${item.name}!`, 'success');
    // TODO: Implement item usage
  };

  const filteredItems = selectedCategory === 'all' 
    ? items 
    : items.filter(item => item.type === selectedCategory);

  const categories = [
    { id: 'all', label: 'ALL', emoji: '📦' },
    { id: 'food', label: 'FOOD', emoji: '🍖' },
    { id: 'toy', label: 'TOYS', emoji: '🎮' },
    { id: 'battle', label: 'BATTLE', emoji: '⚔️' },
    { id: 'evolution', label: 'EVO', emoji: '✨' },
  ];

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <PixelCard variant="elevated" style={styles.header}>
        <Text style={styles.title}>🎒 INVENTORY</Text>
        <View style={styles.capacityBar}>
          <Text style={styles.capacityText}>
            {items.reduce((sum, item) => sum + item.quantity, 0)} / 50 ITEMS
          </Text>
        </View>
      </PixelCard>

      {/* Category Tabs */}
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesContainer}
      >
        {categories.map(cat => (
          <TouchableOpacity
            key={cat.id}
            onPress={() => setSelectedCategory(cat.id)}
            style={[
              styles.categoryTab,
              selectedCategory === cat.id && styles.categoryTabActive,
            ]}
          >
            <Text style={styles.categoryEmoji}>{cat.emoji}</Text>
            <Text style={[
              styles.categoryLabel,
              selectedCategory === cat.id && styles.categoryLabelActive,
            ]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Items Grid */}
      <PixelCard variant="default" style={styles.itemsCard}>
        <View style={styles.itemsGrid}>
          {filteredItems.length === 0 ? (
            <Text style={styles.emptyText}>NO ITEMS IN THIS CATEGORY</Text>
          ) : (
            filteredItems.map(item => (
              <TouchableOpacity
                key={item.id}
                onPress={() => handleUseItem(item)}
                style={[
                  styles.itemSlot,
                  { borderColor: getRarityColor(item.rarity) },
                ]}
              >
                <Text style={styles.itemEmoji}>{item.emoji}</Text>
                <Text style={styles.itemQuantity}>×{item.quantity}</Text>
                <View style={[
                  styles.rarityIndicator,
                  { backgroundColor: getRarityColor(item.rarity) },
                ]} />
              </TouchableOpacity>
            ))
          )}
        </View>
      </PixelCard>

      {/* Selected Item Details */}
      {filteredItems.length > 0 && (
        <PixelCard title="ITEM DETAILS" variant="inset" style={styles.detailsCard}>
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{filteredItems[0].name}</Text>
            <Text style={[
              styles.itemRarity,
              { color: getRarityColor(filteredItems[0].rarity) },
            ]}>
              {filteredItems[0].rarity.toUpperCase()}
            </Text>
          </View>
          <Text style={styles.itemDescription}>
            {filteredItems[0].description}
          </Text>
        </PixelCard>
      )}

      {/* Daily Reward */}
      <PixelCard variant="elevated" style={styles.dailyCard}>
        <Text style={styles.dailyTitle}>📅 DAILY REWARD</Text>
        <Text style={styles.dailyTimer}>NEXT IN: 23:45:12</Text>
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
  capacityBar: {
    marginTop: pixelTheme.spacing.sm,
    paddingHorizontal: pixelTheme.spacing.md,
    paddingVertical: pixelTheme.spacing.xs,
    backgroundColor: pixelTheme.colors.surface,
    borderWidth: pixelTheme.borders.width.medium,
    borderColor: pixelTheme.colors.border,
  },
  capacityText: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.text,
  },
  categoriesContainer: {
    paddingHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.md,
  },
  categoryTab: {
    alignItems: 'center',
    marginRight: pixelTheme.spacing.md,
    padding: pixelTheme.spacing.sm,
    borderWidth: pixelTheme.borders.width.medium,
    borderColor: pixelTheme.colors.border,
    backgroundColor: pixelTheme.colors.surface,
  },
  categoryTabActive: {
    backgroundColor: pixelTheme.colors.primary,
    borderColor: pixelTheme.colors.primaryDark,
  },
  categoryEmoji: {
    fontSize: 24,
  },
  categoryLabel: {
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
    marginTop: pixelTheme.spacing.xs,
  },
  categoryLabelActive: {
    color: pixelTheme.colors.surface,
  },
  itemsCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  itemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  itemSlot: {
    width: 64,
    height: 64,
    margin: pixelTheme.spacing.xs,
    borderWidth: pixelTheme.borders.width.thick,
    backgroundColor: pixelTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  itemEmoji: {
    fontSize: 28,
  },
  itemQuantity: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
    backgroundColor: pixelTheme.colors.background,
    paddingHorizontal: 2,
  },
  rarityIndicator: {
    position: 'absolute',
    top: 2,
    left: 2,
    width: 6,
    height: 6,
  },
  emptyText: {
    width: '100%',
    textAlign: 'center',
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
    paddingVertical: pixelTheme.spacing.xl,
  },
  detailsCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.lg,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: pixelTheme.spacing.sm,
  },
  itemName: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  itemRarity: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
  },
  itemDescription: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  dailyCard: {
    marginHorizontal: pixelTheme.spacing.lg,
    marginBottom: pixelTheme.spacing.xl,
    alignItems: 'center',
  },
  dailyTitle: {
    fontSize: pixelTheme.typography.fontSize.large,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  dailyTimer: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.warning,
    marginTop: pixelTheme.spacing.xs,
  },
});