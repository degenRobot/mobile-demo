/**
 * Pixel Art Button Component
 * Retro 8-bit style button with press effects
 */

import React from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  View,
  ViewStyle,
  TextStyle,
  ActivityIndicator,
} from 'react-native';
import { pixelTheme } from '../../theme/pixelTheme';

interface PixelButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'success' | 'danger' | 'warning';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  loading?: boolean;
  fullWidth?: boolean;
  icon?: React.ReactNode;
  style?: ViewStyle;
  textStyle?: TextStyle;
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  icon,
  style,
  textStyle,
}) => {
  const [isPressed, setIsPressed] = React.useState(false);

  const getBackgroundColor = () => {
    if (disabled) return pixelTheme.colors.textLight;
    
    switch (variant) {
      case 'primary':
        return isPressed ? pixelTheme.colors.primaryDark : pixelTheme.colors.primary;
      case 'secondary':
        return isPressed ? pixelTheme.colors.secondaryDark : pixelTheme.colors.secondary;
      case 'success':
        return isPressed ? '#4CAF50' : pixelTheme.colors.success;
      case 'danger':
        return isPressed ? '#D32F2F' : pixelTheme.colors.danger;
      case 'warning':
        return isPressed ? '#F57C00' : pixelTheme.colors.warning;
      default:
        return pixelTheme.colors.primary;
    }
  };

  const getTextColor = () => {
    if (disabled) return pixelTheme.colors.background;
    if (variant === 'secondary') return pixelTheme.colors.text;
    return '#FFFFFF';
  };

  const getSizeStyles = (): ViewStyle => {
    const { button } = pixelTheme.components;
    switch (size) {
      case 'small':
        return {
          height: button.height.small,
          paddingHorizontal: button.padding.small.horizontal,
          paddingVertical: button.padding.small.vertical,
        };
      case 'large':
        return {
          height: button.height.large,
          paddingHorizontal: button.padding.large.horizontal,
          paddingVertical: button.padding.large.vertical,
        };
      default:
        return {
          height: button.height.medium,
          paddingHorizontal: button.padding.medium.horizontal,
          paddingVertical: button.padding.medium.vertical,
        };
    }
  };

  const getFontSize = () => {
    switch (size) {
      case 'small': return pixelTheme.typography.fontSize.small;
      case 'large': return pixelTheme.typography.fontSize.large;
      default: return pixelTheme.typography.fontSize.medium;
    }
  };

  const getBorderStyle = (): ViewStyle => {
    if (isPressed) {
      // Inset border for pressed state
      return {
        borderTopWidth: 2,
        borderLeftWidth: 2,
        borderBottomWidth: 2,
        borderRightWidth: 2,
        borderTopColor: pixelTheme.colors.shadow,
        borderLeftColor: pixelTheme.colors.shadow,
        borderBottomColor: pixelTheme.colors.textLight,
        borderRightColor: pixelTheme.colors.textLight,
      };
    }
    // Outset border for normal state
    return {
      borderTopWidth: 2,
      borderLeftWidth: 2,
      borderBottomWidth: 2,
      borderRightWidth: 2,
      borderTopColor: pixelTheme.colors.background,
      borderLeftColor: pixelTheme.colors.background,
      borderBottomColor: pixelTheme.colors.shadow,
      borderRightColor: pixelTheme.colors.shadow,
    };
  };

  const handlePressIn = () => {
    if (!disabled && !loading) {
      setIsPressed(true);
    }
  };

  const handlePressOut = () => {
    setIsPressed(false);
  };

  const handlePress = () => {
    if (!disabled && !loading) {
      onPress();
    }
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      activeOpacity={1}
      disabled={disabled || loading}
      style={[
        fullWidth && styles.fullWidth,
        style,
      ]}
    >
      <View
        style={[
          styles.button,
          getSizeStyles(),
          getBorderStyle(),
          {
            backgroundColor: getBackgroundColor(),
            transform: [{ translateY: isPressed ? 2 : 0 }],
          },
          disabled && styles.disabled,
        ]}
      >
        {/* Pixel border effect */}
        <View style={styles.innerContent}>
          {loading ? (
            <ActivityIndicator
              size="small"
              color={getTextColor()}
            />
          ) : (
            <View style={styles.contentContainer}>
              {icon && <View style={styles.icon}>{icon}</View>}
              <Text
                style={[
                  styles.text,
                  {
                    fontSize: getFontSize(),
                    color: getTextColor(),
                  },
                  textStyle,
                ]}
                numberOfLines={1}
              >
                {title.toUpperCase()}
              </Text>
            </View>
          )}
        </View>

        {/* Pixel highlight effect */}
        {!isPressed && !disabled && (
          <View style={styles.highlight} />
        )}
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  fullWidth: {
    width: '100%',
  },
  button: {
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    // No border radius for authentic pixel style
    borderRadius: 0,
  },
  innerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: pixelTheme.spacing.xs,
  },
  text: {
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    letterSpacing: pixelTheme.typography.letterSpacing.wide,
    textTransform: 'uppercase',
  },
  disabled: {
    opacity: 0.5,
  },
  highlight: {
    position: 'absolute',
    top: 2,
    left: 2,
    right: 2,
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
});

export default PixelButton;