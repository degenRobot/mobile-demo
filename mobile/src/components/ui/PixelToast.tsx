/**
 * Pixel Art Toast Notification Component
 * Retro-styled toast messages for transaction feedback
 */

import React, { useEffect, useRef } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { pixelTheme } from '../../theme/pixelTheme';

interface ToastProps {
  message: string;
  type?: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onHide?: () => void;
  visible: boolean;
}

export const PixelToast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onHide,
  visible,
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(-100)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          speed: 12,
          bounciness: 8,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto hide after duration
      const timer = setTimeout(() => {
        hideToast();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [visible]);

  const hideToast = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onHide?.();
    });
  };

  if (!visible) return null;

  const getBackgroundColor = () => {
    switch (type) {
      case 'success': return pixelTheme.colors.success;
      case 'error': return pixelTheme.colors.danger;
      case 'warning': return pixelTheme.colors.warning;
      default: return pixelTheme.colors.info;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✓';
      case 'error': return '✕';
      case 'warning': return '!';
      default: return 'ⓘ';
    }
  };

  return (
    <Animated.View
      style={[
        styles.container,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }],
        },
      ]}
    >
      <View
        style={[
          styles.toast,
          { backgroundColor: getBackgroundColor() },
        ]}
      >
        <View style={styles.iconContainer}>
          <Text style={styles.icon}>{getIcon()}</Text>
        </View>
        <Text style={styles.message}>{message.toUpperCase()}</Text>
      </View>
      
      {/* Pixel border effect */}
      <View style={styles.borderBottom} />
      <View style={styles.borderRight} />
    </Animated.View>
  );
};

// Toast Provider for global toast management
export const ToastContext = React.createContext<{
  showToast: (message: string, type?: ToastProps['type']) => void;
}>({
  showToast: () => {},
});

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toast, setToast] = React.useState<{
    message: string;
    type: ToastProps['type'];
    visible: boolean;
  }>({
    message: '',
    type: 'info',
    visible: false,
  });

  const showToast = (message: string, type: ToastProps['type'] = 'info') => {
    setToast({ message, type, visible: true });
  };

  const hideToast = () => {
    setToast(prev => ({ ...prev, visible: false }));
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <PixelToast
        message={toast.message}
        type={toast.type}
        visible={toast.visible}
        onHide={hideToast}
      />
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 60,
    left: pixelTheme.spacing.md,
    right: pixelTheme.spacing.md,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: pixelTheme.spacing.md,
    borderWidth: pixelTheme.borders.width.thick,
    borderColor: pixelTheme.colors.border,
  },
  iconContainer: {
    width: 24,
    height: 24,
    backgroundColor: pixelTheme.colors.surface,
    borderWidth: pixelTheme.borders.width.medium,
    borderColor: pixelTheme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: pixelTheme.spacing.sm,
  },
  icon: {
    fontSize: pixelTheme.typography.fontSize.medium,
    fontFamily: pixelTheme.typography.fontFamily.pixelBold,
    color: pixelTheme.colors.text,
  },
  message: {
    flex: 1,
    fontSize: pixelTheme.typography.fontSize.small,
    fontFamily: pixelTheme.typography.fontFamily.pixel,
    color: pixelTheme.colors.surface,
    letterSpacing: pixelTheme.typography.letterSpacing.normal,
  },
  borderBottom: {
    position: 'absolute',
    bottom: -3,
    left: 3,
    right: -3,
    height: 3,
    backgroundColor: pixelTheme.colors.shadow,
  },
  borderRight: {
    position: 'absolute',
    top: 3,
    bottom: -3,
    right: -3,
    width: 3,
    backgroundColor: pixelTheme.colors.shadow,
  },
});