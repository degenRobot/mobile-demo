/**
 * Pixel Art Icon Button Component
 * Square icon buttons with pixel styling for actions
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  Image,
  ViewStyle,
} from 'react-native';
import { pixelTheme } from '../../theme/pixelTheme';

interface PixelIconButtonProps {
  onPress: () => void;
  icon?: string; // Path to PNG icon
  emoji?: string; // Fallback emoji if no icon
  label?: string;
  disabled?: boolean;
  loading?: boolean;
  size?: 'small' | 'medium' | 'large';
  variant?: 'default' | 'primary' | 'success' | 'danger';
  style?: ViewStyle;
}

export const PixelIconButton: React.FC<PixelIconButtonProps> = ({
  onPress,
  icon,
  emoji,
  label,
  disabled = false,
  loading = false,
  size = 'medium',
  variant = 'default',
  style,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const getSize = () => {
    switch (size) {
      case 'small': return 40;
      case 'large': return 64;
      default: return 48;
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small': return 24;
      case 'large': return 40;
      default: return 32;
    }
  };

  const getBackgroundColor = () => {
    if (disabled) return pixelTheme.colors.textLight;
    
    const colors = {
      primary: pixelTheme.colors.primary,
      success: pixelTheme.colors.success,
      danger: pixelTheme.colors.danger,
      default: pixelTheme.colors.secondary,
    };
    
    return isPressed 
      ? pixelTheme.colors.primaryDark 
      : colors[variant];
  };

  const getBorderStyle = (): ViewStyle => {
    if (isPressed) {
      return {
        borderTopColor: pixelTheme.colors.shadow,
        borderLeftColor: pixelTheme.colors.shadow,
        borderBottomColor: pixelTheme.colors.background,
        borderRightColor: pixelTheme.colors.background,
      };
    }
    return {
      borderTopColor: pixelTheme.colors.background,
      borderLeftColor: pixelTheme.colors.background,
      borderBottomColor: pixelTheme.colors.shadow,
      borderRightColor: pixelTheme.colors.shadow,
    };
  };

  const buttonSize = getSize();
  const iconSize = getIconSize();

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        onPress={onPress}
        onPressIn={() => !disabled && setIsPressed(true)}
        onPressOut={() => setIsPressed(false)}
        disabled={disabled || loading}
        activeOpacity={1}
      >
        <View
          style={[
            styles.button,
            getBorderStyle(),
            {
              width: buttonSize,
              height: buttonSize,
              backgroundColor: getBackgroundColor(),
              transform: [{ translateY: isPressed ? 2 : 0 }],
            },
            disabled && styles.disabled,
          ]}
        >
          {icon ? (
            <Image
              source={{ uri: icon }}
              style={{ width: iconSize, height: iconSize }}
              resizeMode="contain"
            />
          ) : emoji ? (
            <Text style={[styles.emoji, { fontSize: iconSize * 0.8 }]}>
              {emoji}
            </Text>
          ) : null}
          
          {/* Highlight effect */}
          {!isPressed && !disabled && (
            <View style={[styles.highlight, { width: buttonSize - 8 }]} />
          )}
        </View>
      </TouchableOpacity>
      
      {label && (
        <Text style={styles.label}>{label.toUpperCase()}</Text>
      )}
    </View>
  );
};

// Action bar for grouping multiple icon buttons
export const PixelActionBar: React.FC<{
  children: React.ReactNode;
  style?: ViewStyle;
}> = ({ children, style }) => {
  return (
    <View style={[styles.actionBar, style]}>
      {children}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: pixelTheme.borders.width.thick,
    position: 'relative',
  },
  emoji: {
    textAlign: 'center',
  },
  disabled: {
    opacity: 0.5,
  },
  highlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  label: {
    marginTop: pixelTheme.spacing.xs,
    fontSize: pixelTheme.typography.fontSize.tiny,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.textLight,
    letterSpacing: pixelTheme.typography.letterSpacing.normal,
  },
  actionBar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: pixelTheme.spacing.sm,
    gap: pixelTheme.spacing.md,
  },
});