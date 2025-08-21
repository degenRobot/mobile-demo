/**
 * Pixel Art Progress Bar Component
 * Segmented progress bar with retro styling
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { pixelTheme } from '../../theme/pixelTheme';

interface PixelProgressBarProps {
  value: number;
  max: number;
  label?: string;
  color?: string;
  backgroundColor?: string;
  showValue?: boolean;
  showPercentage?: boolean;
  height?: number;
  segments?: number;
  style?: ViewStyle;
  animate?: boolean;
}

export const PixelProgressBar: React.FC<PixelProgressBarProps> = ({
  value,
  max,
  label,
  color = pixelTheme.colors.success,
  backgroundColor = '#DDD',
  showValue = false,
  showPercentage = false,
  height = pixelTheme.components.progressBar.height,
  segments = 10,
  style,
  animate = true,
}) => {
  const percentage = Math.min(100, Math.max(0, (value / max) * 100));
  const filledSegments = Math.floor((percentage / 100) * segments);

  // Get color based on percentage for health/hunger bars
  const getDynamicColor = () => {
    if (color) return color;
    
    if (percentage > 70) return pixelTheme.colors.success;
    if (percentage > 30) return pixelTheme.colors.warning;
    return pixelTheme.colors.danger;
  };

  const renderSegments = () => {
    return Array.from({ length: segments }).map((_, index) => {
      const isFilled = index < filledSegments;
      const isPartiallyFilled = index === filledSegments && percentage % (100 / segments) > 0;
      
      return (
        <View
          key={index}
          style={[
            styles.segment,
            {
              backgroundColor: isFilled ? getDynamicColor() : backgroundColor,
              opacity: isPartiallyFilled ? 0.5 : 1,
            },
          ]}
        />
      );
    });
  };

  const renderContinuousBar = () => {
    return (
      <>
        <View
          style={[
            styles.fillBar,
            {
              width: `${percentage}%`,
              backgroundColor: getDynamicColor(),
            },
            animate && styles.animated,
          ]}
        />
        {/* Segment dividers */}
        {Array.from({ length: segments - 1 }).map((_, index) => (
          <View
            key={index}
            style={[
              styles.segmentDivider,
              {
                left: `${((index + 1) / segments) * 100}%`,
              },
            ]}
          />
        ))}
      </>
    );
  };

  return (
    <View style={[styles.container, style]}>
      {label && (
        <View style={styles.labelContainer}>
          <Text style={styles.label}>{label}</Text>
          {(showValue || showPercentage) && (
            <Text style={styles.value}>
              {showPercentage ? `${Math.round(percentage)}%` : `${value}/${max}`}
            </Text>
          )}
        </View>
      )}
      
      <View style={styles.barWrapper}>
        {/* Outer pixel border */}
        <View
          style={[
            styles.barContainer,
            {
              height,
              backgroundColor,
            },
          ]}
        >
          {/* Choose between segmented or continuous style */}
          {segments <= 15 ? renderSegments() : renderContinuousBar()}
        </View>
        
        {/* 3D effect borders */}
        <View style={[styles.borderTop, { height }]} />
        <View style={[styles.borderBottom, { height }]} />
        <View style={[styles.borderLeft, { height }]} />
        <View style={[styles.borderRight, { height }]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: pixelTheme.spacing.xs,
  },
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: pixelTheme.spacing.xs,
  },
  label: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.text,
    letterSpacing: pixelTheme.typography.letterSpacing.normal,
    textTransform: 'uppercase',
  },
  value: {
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
  },
  barWrapper: {
    position: 'relative',
  },
  barContainer: {
    flexDirection: 'row',
    borderWidth: pixelTheme.borders.width.medium,
    borderColor: pixelTheme.colors.border,
    borderRadius: 0, // Sharp corners for pixel style
    overflow: 'hidden',
    position: 'relative',
  },
  segment: {
    flex: 1,
    marginHorizontal: 1,
  },
  fillBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  animated: {
    // Add transition for smooth updates (optional)
  },
  segmentDivider: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: pixelTheme.colors.border,
    opacity: 0.3,
  },
  // 3D pixel border effects
  borderTop: {
    position: 'absolute',
    top: -2,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: pixelTheme.colors.shadow,
  },
  borderBottom: {
    position: 'absolute',
    bottom: -2,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: pixelTheme.colors.textLight,
  },
  borderLeft: {
    position: 'absolute',
    left: -2,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: pixelTheme.colors.shadow,
  },
  borderRight: {
    position: 'absolute',
    right: -2,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: pixelTheme.colors.textLight,
  },
});

// Specialized progress bars for common stats
export const HealthBar: React.FC<Omit<PixelProgressBarProps, 'color' | 'label'>> = (props) => (
  <PixelProgressBar
    {...props}
    label="HP"
    color={pixelTheme.colors.danger}
  />
);

export const EnergyBar: React.FC<Omit<PixelProgressBarProps, 'color' | 'label'>> = (props) => (
  <PixelProgressBar
    {...props}
    label="Energy"
    color={pixelTheme.colors.info}
  />
);

export const HappinessBar: React.FC<Omit<PixelProgressBarProps, 'color' | 'label'>> = (props) => (
  <PixelProgressBar
    {...props}
    label="Happiness"
    color={pixelTheme.colors.success}
  />
);

export const HungerBar: React.FC<Omit<PixelProgressBarProps, 'color' | 'label'>> = (props) => (
  <PixelProgressBar
    {...props}
    label="Hunger"
    color={pixelTheme.colors.warning}
  />
);

export const ExperienceBar: React.FC<Omit<PixelProgressBarProps, 'color' | 'label'>> = (props) => (
  <PixelProgressBar
    {...props}
    label="XP"
    color={pixelTheme.colors.primary}
  />
);

export default PixelProgressBar;