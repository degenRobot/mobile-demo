/**
 * Pixel Art Card/Frame Component
 * Retro-styled container with pixel borders
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { pixelTheme } from '../../theme/pixelTheme';

interface PixelCardProps {
  children: React.ReactNode;
  title?: string;
  variant?: 'default' | 'elevated' | 'inset' | 'dialog';
  padding?: 'none' | 'small' | 'medium' | 'large';
  style?: ViewStyle;
  borderColor?: string;
  backgroundColor?: string;
}

export const PixelCard: React.FC<PixelCardProps> = ({
  children,
  title,
  variant = 'default',
  padding = 'medium',
  style,
  borderColor = pixelTheme.colors.border,
  backgroundColor = pixelTheme.colors.surface,
}) => {
  const getPadding = () => {
    switch (padding) {
      case 'none': return 0;
      case 'small': return pixelTheme.spacing.sm;
      case 'large': return pixelTheme.spacing.lg;
      default: return pixelTheme.spacing.md;
    }
  };

  const getBorderStyle = (): ViewStyle => {
    switch (variant) {
      case 'elevated':
        return {
          borderWidth: 3,
          borderColor,
          borderTopColor: pixelTheme.colors.background,
          borderLeftColor: pixelTheme.colors.background,
          borderBottomColor: pixelTheme.colors.shadow,
          borderRightColor: pixelTheme.colors.shadow,
        };
      case 'inset':
        return {
          borderWidth: 3,
          borderColor,
          borderTopColor: pixelTheme.colors.shadow,
          borderLeftColor: pixelTheme.colors.shadow,
          borderBottomColor: pixelTheme.colors.background,
          borderRightColor: pixelTheme.colors.background,
        };
      case 'dialog':
        return {
          borderWidth: 4,
          borderColor,
        };
      default:
        return {
          borderWidth: 2,
          borderColor,
        };
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Main card */}
      <View
        style={[
          styles.card,
          getBorderStyle(),
          {
            backgroundColor,
            padding: getPadding(),
          },
        ]}
      >
        {title && (
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title.toUpperCase()}</Text>
            <View style={styles.titleDivider} />
          </View>
        )}
        {children}
      </View>

      {/* Pixel shadow effect for elevated variant */}
      {variant === 'elevated' && (
        <>
          <View style={[styles.shadowBottom, { backgroundColor: borderColor }]} />
          <View style={[styles.shadowRight, { backgroundColor: borderColor }]} />
          <View style={styles.shadowCorner} />
        </>
      )}
    </View>
  );
};

// Dialog variant with special styling
export const PixelDialog: React.FC<{
  title: string;
  children: React.ReactNode;
  onClose?: () => void;
  style?: ViewStyle;
}> = ({ title, children, onClose, style }) => {
  return (
    <View style={[styles.dialogOverlay]}>
      <PixelCard
        variant="dialog"
        style={[styles.dialog, style]}
        backgroundColor={pixelTheme.colors.background}
      >
        <View style={styles.dialogHeader}>
          <Text style={styles.dialogTitle}>{title.toUpperCase()}</Text>
          {onClose && (
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>✕</Text>
            </TouchableOpacity>
          )}
        </View>
        <View style={styles.dialogContent}>
          {children}
        </View>
      </PixelCard>
    </View>
  );
};

// Stats display card
export const PixelStatsCard: React.FC<{
  title: string;
  stats: Array<{ label: string; value: string | number }>;
  style?: ViewStyle;
}> = ({ title, stats, style }) => {
  return (
    <PixelCard title={title} variant="inset" style={style}>
      {stats.map((stat, index) => (
        <View key={index} style={styles.statRow}>
          <Text style={styles.statLabel}>{stat.label.toUpperCase()}</Text>
          <Text style={styles.statValue}>{stat.value}</Text>
        </View>
      ))}
    </PixelCard>
  );
};

import { TouchableOpacity } from 'react-native';

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  card: {
    borderRadius: 0, // Sharp corners for pixel style
    position: 'relative',
  },
  titleContainer: {
    marginBottom: pixelTheme.spacing.sm,
  },
  title: {
    fontSize: pixelTheme.typography.fontSize.large,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
    letterSpacing: pixelTheme.typography.letterSpacing.wide,
    marginBottom: pixelTheme.spacing.xs,
  },
  titleDivider: {
    height: 2,
    backgroundColor: pixelTheme.colors.border,
    marginTop: pixelTheme.spacing.xs,
  },
  // Shadow effects for elevated variant
  shadowBottom: {
    position: 'absolute',
    bottom: -3,
    left: 3,
    right: -3,
    height: 3,
  },
  shadowRight: {
    position: 'absolute',
    top: 3,
    bottom: -3,
    right: -3,
    width: 3,
  },
  shadowCorner: {
    position: 'absolute',
    bottom: -3,
    right: -3,
    width: 3,
    height: 3,
    backgroundColor: pixelTheme.colors.border,
  },
  // Dialog styles
  dialogOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    maxWidth: pixelTheme.components.dialog.maxWidth,
    width: '90%',
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: pixelTheme.spacing.md,
    paddingBottom: pixelTheme.spacing.sm,
    borderBottomWidth: 2,
    borderBottomColor: pixelTheme.colors.border,
  },
  dialogTitle: {
    fontSize: pixelTheme.typography.fontSize.xlarge,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
    letterSpacing: pixelTheme.typography.letterSpacing.wide,
  },
  dialogContent: {
    // Content styling
  },
  closeButton: {
    padding: pixelTheme.spacing.xs,
  },
  closeButtonText: {
    fontSize: pixelTheme.typography.fontSize.xlarge,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  // Stats card styles
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: pixelTheme.spacing.xs,
    borderBottomWidth: 1,
    borderBottomColor: pixelTheme.colors.border,
    opacity: 0.8,
  },
  statLabel: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
    letterSpacing: pixelTheme.typography.letterSpacing.normal,
  },
  statValue: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
});

export default PixelCard;