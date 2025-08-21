# 🎮 Sprite Animation System for React Native

## Architecture Overview

```
┌─────────────────────────────────────┐
│         React Native App            │
├─────────────────────────────────────┤
│   SpriteAnimator Component          │
│   ├── Sprite Sheet Loader           │
│   ├── Animation Controller          │
│   └── Frame Renderer                │
├─────────────────────────────────────┤
│   Pet State Manager                 │
│   ├── Animation State Machine       │
│   ├── Stats Tracker                 │
│   └── Evolution Controller          │
└─────────────────────────────────────┘
```

## Core Components

### 1. Sprite Sheet Loader
```typescript
// mobile/src/components/sprites/SpriteSheet.tsx
import { Image } from 'react-native';

interface SpriteSheetConfig {
  source: any; // require('./assets/sprites/pet1.png')
  frameWidth: number;
  frameHeight: number;
  animations: {
    [key: string]: {
      frames: number[];
      duration: number; // ms per frame
      loop?: boolean;
    }
  }
}

class SpriteSheet {
  private config: SpriteSheetConfig;
  private currentAnimation: string = 'idle';
  private currentFrame: number = 0;
  private lastFrameTime: number = 0;
  
  constructor(config: SpriteSheetConfig) {
    this.config = config;
  }
  
  getFramePosition(frameIndex: number) {
    const cols = Math.floor(this.config.source.width / this.config.frameWidth);
    const x = (frameIndex % cols) * this.config.frameWidth;
    const y = Math.floor(frameIndex / cols) * this.config.frameHeight;
    return { x, y };
  }
  
  update(deltaTime: number) {
    const anim = this.config.animations[this.currentAnimation];
    this.lastFrameTime += deltaTime;
    
    if (this.lastFrameTime >= anim.duration) {
      this.currentFrame = (this.currentFrame + 1) % anim.frames.length;
      this.lastFrameTime = 0;
    }
  }
}
```

### 2. Animated Sprite Component
```typescript
// mobile/src/components/sprites/AnimatedSprite.tsx
import React, { useEffect, useRef, useState } from 'react';
import { View, Image, Animated } from 'react-native';

interface AnimatedSpriteProps {
  spriteSheet: string; // Path to sprite sheet
  animation: string; // Current animation name
  width: number;
  height: number;
  scale?: number;
}

export const AnimatedSprite: React.FC<AnimatedSpriteProps> = ({
  spriteSheet,
  animation,
  width,
  height,
  scale = 1
}) => {
  const [currentFrame, setCurrentFrame] = useState(0);
  const animationRef = useRef<any>();
  
  // Sprite animations config
  const animations = {
    idle: { frames: [0, 1, 2, 1], duration: 200 },
    walk: { frames: [4, 5, 6, 7], duration: 150 },
    eat: { frames: [8, 9, 10, 11], duration: 100 },
    play: { frames: [12, 13, 14, 15], duration: 120 },
    sleep: { frames: [16, 17], duration: 500 },
    happy: { frames: [18, 19, 20, 19], duration: 100 },
    battle: { frames: [24, 25, 26, 25], duration: 150 },
    attack: { frames: [28, 29, 30, 31], duration: 80 },
    hurt: { frames: [32, 33], duration: 150 },
    victory: { frames: [36, 37, 38, 39], duration: 150 }
  };
  
  useEffect(() => {
    const anim = animations[animation];
    let frameIndex = 0;
    
    animationRef.current = setInterval(() => {
      setCurrentFrame(anim.frames[frameIndex]);
      frameIndex = (frameIndex + 1) % anim.frames.length;
    }, anim.duration);
    
    return () => clearInterval(animationRef.current);
  }, [animation]);
  
  const getFrameStyle = () => {
    const cols = 8; // Assuming 8 columns in sprite sheet
    const x = (currentFrame % cols) * width;
    const y = Math.floor(currentFrame / cols) * height;
    
    return {
      width: width * scale,
      height: height * scale,
      overflow: 'hidden' as const,
    };
  };
  
  const getImageStyle = () => {
    const cols = 8;
    const x = (currentFrame % cols) * width;
    const y = Math.floor(currentFrame / cols) * height;
    
    return {
      width: width * cols * scale,
      height: height * 5 * scale, // 5 rows
      transform: [
        { translateX: -x * scale },
        { translateY: -y * scale }
      ]
    };
  };
  
  return (
    <View style={getFrameStyle()}>
      <Image 
        source={spriteSheet}
        style={getImageStyle()}
        resizeMode="nearest" // Maintains pixel art sharpness
      />
    </View>
  );
};
```

### 3. Pet Animation Controller
```typescript
// mobile/src/components/pet/PetAnimationController.tsx
import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { AnimatedSprite } from '../sprites/AnimatedSprite';

interface PetAnimationControllerProps {
  petType: string;
  petStats: {
    happiness: number;
    hunger: number;
    energy: number;
    isAlive: boolean;
  };
  currentAction?: string;
}

export const PetAnimationController: React.FC<PetAnimationControllerProps> = ({
  petType,
  petStats,
  currentAction
}) => {
  const [animation, setAnimation] = useState('idle');
  
  // Determine animation based on stats and actions
  useEffect(() => {
    if (!petStats.isAlive) {
      setAnimation('sleep');
      return;
    }
    
    if (currentAction) {
      setAnimation(currentAction);
      return;
    }
    
    // Auto-determine based on stats
    if (petStats.hunger > 80) {
      setAnimation('hungry');
    } else if (petStats.happiness > 80) {
      setAnimation('happy');
    } else if (petStats.energy < 20) {
      setAnimation('sleep');
    } else {
      setAnimation('idle');
    }
  }, [petStats, currentAction]);
  
  // Get sprite sheet based on pet type
  const getSpriteSheet = () => {
    const spriteSheets = {
      fire: require('../../assets/sprites/fire_pet.png'),
      water: require('../../assets/sprites/water_pet.png'),
      nature: require('../../assets/sprites/nature_pet.png'),
      electric: require('../../assets/sprites/electric_pet.png'),
      spirit: require('../../assets/sprites/spirit_pet.png'),
    };
    return spriteSheets[petType] || spriteSheets.fire;
  };
  
  return (
    <View style={styles.container}>
      <AnimatedSprite
        spriteSheet={getSpriteSheet()}
        animation={animation}
        width={32}
        height={32}
        scale={4} // Scale up for mobile display
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  }
});
```

### 4. Pixel Perfect UI Components
```typescript
// mobile/src/components/ui/PixelButton.tsx
import React from 'react';
import { TouchableOpacity, Text, StyleSheet, View } from 'react-native';

interface PixelButtonProps {
  onPress: () => void;
  title: string;
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
}

export const PixelButton: React.FC<PixelButtonProps> = ({
  onPress,
  title,
  variant = 'primary',
  size = 'medium'
}) => {
  const getButtonStyle = () => {
    const base = styles.button;
    const variantStyle = styles[variant];
    const sizeStyle = styles[size];
    return [base, variantStyle, sizeStyle];
  };
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={getButtonStyle()}>
        <View style={styles.innerBorder}>
          <Text style={styles.text}>{title}</Text>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    backgroundColor: '#5A4FCF',
    borderWidth: 2,
    borderColor: '#2D3436',
    padding: 2,
    // Pixel art style corners
    borderRadius: 0,
  },
  innerBorder: {
    borderWidth: 2,
    borderColor: '#7B68EE',
    padding: 8,
  },
  primary: {
    backgroundColor: '#5A4FCF',
  },
  secondary: {
    backgroundColor: '#FFD93D',
  },
  danger: {
    backgroundColor: '#FF6B6B',
  },
  small: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  medium: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  large: {
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  text: {
    fontFamily: 'Courier', // Temporary - replace with pixel font
    fontSize: 14,
    color: '#F5F5F5',
    textTransform: 'uppercase',
    letterSpacing: 1,
  }
});
```

### 5. Pixel Progress Bar
```typescript
// mobile/src/components/ui/PixelProgressBar.tsx
import React from 'react';
import { View, StyleSheet, Text } from 'react-native';

interface PixelProgressBarProps {
  value: number;
  max: number;
  color?: string;
  label?: string;
  showValue?: boolean;
}

export const PixelProgressBar: React.FC<PixelProgressBarProps> = ({
  value,
  max,
  color = '#6BCB77',
  label,
  showValue = true
}) => {
  const percentage = Math.min(100, (value / max) * 100);
  
  return (
    <View style={styles.container}>
      {label && <Text style={styles.label}>{label}</Text>}
      <View style={styles.barContainer}>
        <View style={styles.barBackground}>
          <View 
            style={[
              styles.barFill, 
              { width: `${percentage}%`, backgroundColor: color }
            ]}
          />
          {/* Pixel segments */}
          {Array.from({ length: 10 }).map((_, i) => (
            <View 
              key={i}
              style={[
                styles.segment,
                { left: `${i * 10}%` }
              ]}
            />
          ))}
        </View>
        {showValue && (
          <Text style={styles.value}>{value}/{max}</Text>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 4,
  },
  label: {
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#2D3436',
    marginBottom: 2,
  },
  barContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  barBackground: {
    flex: 1,
    height: 16,
    backgroundColor: '#DDD',
    borderWidth: 2,
    borderColor: '#2D3436',
    position: 'relative',
  },
  barFill: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
  },
  segment: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: '#2D3436',
    opacity: 0.2,
  },
  value: {
    marginLeft: 8,
    fontFamily: 'Courier',
    fontSize: 12,
    color: '#2D3436',
    minWidth: 60,
  }
});
```

## Sprite Generation Workflow

### 1. Using Scenario.gg API
```python
# spriteGeneration/generate_pet_sprites.py
def generate_pet_sprite_sheet(pet_type: str, evolution_stage: int):
    prompts = {
        "fire": "pixel art fire dragon creature, 32x32, side view, game sprite",
        "water": "pixel art water creature, 32x32, side view, game sprite",
        "nature": "pixel art plant beast, 32x32, side view, game sprite",
    }
    
    animations = [
        "idle standing",
        "walking",
        "eating food",
        "playing happy",
        "sleeping",
        "battle stance",
        "attacking",
        "hurt damaged",
        "victory celebration"
    ]
    
    sprite_frames = []
    for anim in animations:
        full_prompt = f"{prompts[pet_type]}, {anim}, evolution stage {evolution_stage}"
        # Call Scenario API
        frames = generate_animation_frames(full_prompt, num_frames=4)
        sprite_frames.extend(frames)
    
    # Combine into sprite sheet
    create_sprite_sheet(sprite_frames, f"{pet_type}_stage_{evolution_stage}.png")
```

### 2. Manual Pixel Art Creation
```
Tools:
- Aseprite (recommended)
- Piskel (free, web-based)
- GraphicsGale (free)

Template:
- Canvas: 256x256px
- Grid: 32x32px per frame
- 8 columns x 5 rows = 40 frames total
```

## Performance Optimization

### 1. Sprite Caching
```typescript
const spriteCache = new Map<string, any>();

export const loadSprite = async (path: string) => {
  if (spriteCache.has(path)) {
    return spriteCache.get(path);
  }
  
  const sprite = await Image.prefetch(path);
  spriteCache.set(path, sprite);
  return sprite;
};
```

### 2. Animation Frame Pool
```typescript
// Reuse frame objects to reduce garbage collection
class FramePool {
  private frames: Frame[] = [];
  private activeFrames: Set<Frame> = new Set();
  
  getFrame(): Frame {
    const frame = this.frames.pop() || new Frame();
    this.activeFrames.add(frame);
    return frame;
  }
  
  releaseFrame(frame: Frame) {
    frame.reset();
    this.activeFrames.delete(frame);
    this.frames.push(frame);
  }
}
```

## Integration with FrenPet

### 1. Update PetScreen
```typescript
// mobile/src/screens/PetScreen.tsx
import { PetAnimationController } from '../components/pet/PetAnimationController';
import { PixelProgressBar } from '../components/ui/PixelProgressBar';
import { PixelButton } from '../components/ui/PixelButton';

export const PetScreen = () => {
  const { pet, feedPet, playWithPet } = usePet();
  
  return (
    <View style={pixelStyles.screen}>
      <View style={pixelStyles.petContainer}>
        <PetAnimationController
          petType={pet.type}
          petStats={pet.stats}
          currentAction={currentAction}
        />
        <Text style={pixelStyles.petName}>{pet.name}</Text>
        <Text style={pixelStyles.petLevel}>Lv.{pet.level}</Text>
      </View>
      
      <View style={pixelStyles.statsContainer}>
        <PixelProgressBar
          label="Happiness"
          value={pet.stats.happiness}
          max={100}
          color="#6BCB77"
        />
        <PixelProgressBar
          label="Hunger"
          value={pet.stats.hunger}
          max={100}
          color="#FF6B6B"
        />
        <PixelProgressBar
          label="Experience"
          value={pet.stats.experience}
          max={100}
          color="#4A90E2"
        />
      </View>
      
      <View style={pixelStyles.actionsContainer}>
        <PixelButton
          title="Feed"
          onPress={feedPet}
          variant="primary"
        />
        <PixelButton
          title="Play"
          onPress={playWithPet}
          variant="secondary"
        />
      </View>
    </View>
  );
};
```

## Asset Pipeline

```bash
# Directory structure
mobile/src/assets/
├── sprites/
│   ├── pets/
│   │   ├── fire_pet_stage_1.png
│   │   ├── fire_pet_stage_2.png
│   │   └── ...
│   ├── items/
│   │   ├── food_items.png
│   │   └── battle_items.png
│   ├── ui/
│   │   ├── buttons.png
│   │   ├── frames.png
│   │   └── icons.png
│   └── effects/
│       ├── battle_effects.png
│       └── emotion_bubbles.png
├── fonts/
│   └── pixel_font.ttf
└── sounds/
    ├── sfx/
    └── music/
```

## Next Implementation Steps

1. **Week 1**: Set up sprite loading system and basic animations
2. **Week 2**: Implement pixel UI components library
3. **Week 3**: Integrate animation controller with pet state
4. **Week 4**: Add battle animations and effects
5. **Week 5**: Polish and performance optimization

---

*This implementation guide provides the technical foundation for adding sprite animations to the FrenPet mobile app.*