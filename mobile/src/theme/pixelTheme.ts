/**
 * Pixel Art Theme for FrenPet
 * Nostalgic 8-bit/16-bit styling
 */

export const pixelTheme = {
  // Color Palette - Limited colors for authentic pixel art feel
  colors: {
    // Primary colors
    primary: '#5A4FCF',      // Purple (Rise/Porto brand)
    primaryLight: '#7B68EE', // Light Purple
    primaryDark: '#3D3475',  // Dark Purple
    
    // Secondary colors
    secondary: '#FFD93D',    // Gold
    secondaryLight: '#FFED4E',
    secondaryDark: '#F5B800',
    
    // Game state colors
    success: '#6BCB77',      // Green (happiness/health)
    danger: '#FF6B6B',       // Red (hunger/damage)
    warning: '#FFA502',      // Orange (caution)
    info: '#4A90E2',         // Blue (energy/mana)
    
    // UI colors
    background: '#F4E4C1',   // Cream (paper-like)
    surface: '#FFFFFF',
    text: '#2D3436',         // Dark gray
    textLight: '#636E72',
    border: '#2D3436',       // Black border for pixel style
    shadow: '#000000',
    
    // Dark mode
    dark: {
      background: '#1A1A2E',   // Deep blue
      surface: '#16213E',
      text: '#F5F5F5',
      textLight: '#B2B2B2',
    },
    
    // Pet type colors
    types: {
      fire: '#FF6B6B',
      water: '#4A90E2',
      nature: '#6BCB77',
      electric: '#FFD93D',
      spirit: '#7B68EE',
      normal: '#95A5A6',
    },
    
    // Status colors
    status: {
      happy: '#6BCB77',
      sad: '#5DADE2',
      hungry: '#FF6B6B',
      sleepy: '#9B59B6',
      energetic: '#FFD93D',
      sick: '#95A5A6',
    }
  },
  
  // Typography - Pixel fonts
  typography: {
    fontFamily: {
      pixel: 'Courier', // Temporary - will be replaced with pixel font
      pixelBold: 'Courier-Bold',
      system: 'System',
    },
    fontSize: {
      tiny: 8,
      small: 10,
      medium: 12,
      large: 14,
      xlarge: 16,
      huge: 20,
      giant: 24,
    },
    letterSpacing: {
      tight: 0,
      normal: 1,
      wide: 2,
    }
  },
  
  // Spacing - Based on 8px grid (pixel-perfect)
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  
  // Border styles for pixel art
  borders: {
    width: {
      thin: 1,
      medium: 2,
      thick: 3,
      extraThick: 4,
    },
    radius: {
      none: 0,        // Sharp corners for pixel style
      small: 2,       // Slight rounding
      medium: 4,      // Moderate rounding
      large: 8,       // For special elements
    },
    pixelStyle: {
      // Double border for retro look
      double: {
        borderWidth: 2,
        borderColor: '#2D3436',
      },
      // Inset border for pressed effect
      inset: {
        borderWidth: 2,
        borderTopColor: '#636E72',
        borderLeftColor: '#636E72',
        borderBottomColor: '#2D3436',
        borderRightColor: '#2D3436',
      },
      // Outset border for raised effect
      outset: {
        borderWidth: 2,
        borderTopColor: '#F5F5F5',
        borderLeftColor: '#F5F5F5',
        borderBottomColor: '#2D3436',
        borderRightColor: '#2D3436',
      }
    }
  },
  
  // Shadows for depth
  shadows: {
    pixel: {
      // Hard pixel shadow (no blur)
      small: {
        shadowColor: '#000000',
        shadowOffset: { width: 2, height: 2 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 2,
      },
      medium: {
        shadowColor: '#000000',
        shadowOffset: { width: 3, height: 3 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 3,
      },
      large: {
        shadowColor: '#000000',
        shadowOffset: { width: 4, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 0,
        elevation: 4,
      },
    },
    // Soft shadows for modern touch
    soft: {
      small: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
      },
      medium: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 6,
        elevation: 4,
      },
    }
  },
  
  // Animation timings
  animations: {
    timing: {
      instant: 0,
      fast: 100,
      normal: 200,
      slow: 300,
      verySlow: 500,
    },
    easing: {
      linear: 'linear',
      easeIn: 'ease-in',
      easeOut: 'ease-out',
      easeInOut: 'ease-in-out',
      bounce: 'cubic-bezier(0.68, -0.55, 0.265, 1.55)',
    }
  },
  
  // Component specific styles
  components: {
    button: {
      height: {
        small: 32,
        medium: 40,
        large: 48,
      },
      padding: {
        small: { horizontal: 12, vertical: 6 },
        medium: { horizontal: 16, vertical: 8 },
        large: { horizontal: 24, vertical: 12 },
      }
    },
    progressBar: {
      height: 16,
      segmentWidth: 10, // For pixel segments
      borderWidth: 2,
    },
    card: {
      padding: 16,
      borderWidth: 3,
      borderColor: '#2D3436',
    },
    dialog: {
      padding: 16,
      borderWidth: 4,
      maxWidth: 320,
    }
  },
  
  // Z-index layers
  zIndex: {
    background: -1,
    content: 0,
    card: 10,
    dropdown: 100,
    modal: 200,
    dialog: 300,
    tooltip: 400,
    notification: 500,
  }
};

// Helper function to create pixel-perfect borders
export const createPixelBorder = (color: string = pixelTheme.colors.border) => ({
  borderWidth: 2,
  borderColor: color,
  borderStyle: 'solid' as const,
});

// Helper function for pixel shadow
export const createPixelShadow = (size: 'small' | 'medium' | 'large' = 'small') => 
  pixelTheme.shadows.pixel[size];

// Helper to get color with opacity
export const withOpacity = (color: string, opacity: number): string => {
  const hex = color.replace('#', '');
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

export default pixelTheme;