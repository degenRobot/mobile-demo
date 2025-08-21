# 🎮 FrenPet Pixel Art Design System

## Vision
Transform FrenPet into a nostalgic, engaging pixel art experience combining the best of Pokemon and Digimon with modern Web3 gasless UX.

## 🎨 Visual Design Language

### Art Style
- **Resolution**: 16x16 or 32x32 base sprites (scalable to 64x64 for detail views)
- **Color Palette**: Limited 16-32 color palette per sprite for authentic retro feel
- **Style References**: 
  - Pokemon Gen 1-2 (Game Boy Color era)
  - Digimon World (PS1 era)
  - Tamagotchi pixel aesthetics

### Core Color Themes

#### Light Theme (Day Mode)
```
Background:     #F4E4C1  (Cream)
Primary:        #5A4FCF  (Purple - matching current brand)
Secondary:      #FFD93D  (Gold)
Accent:         #6BCB77  (Green - happiness)
Danger:         #FF6B6B  (Red - hunger)
Text:           #2D3436  (Dark Gray)
```

#### Dark Theme (Night Mode)
```
Background:     #1A1A2E  (Deep Blue)
Primary:        #7B68EE  (Light Purple)
Secondary:      #FFD93D  (Gold)
Accent:         #4CBD88  (Mint Green)
Danger:         #FF4757  (Bright Red)
Text:           #F5F5F5  (Off White)
```

## 🐾 Pet Sprite System

### Base Pet Types (Initial Release)
1. **Fire Type** - Dragon-like creatures (red/orange palette)
2. **Water Type** - Aquatic creatures (blue/cyan palette)
3. **Nature Type** - Plant/beast creatures (green/brown palette)
4. **Electric Type** - Energy beings (yellow/purple palette)
5. **Spirit Type** - Ghost/ethereal creatures (purple/white palette)

### Evolution Stages
```
Egg → Baby → Child → Teen → Adult → Ultimate
(0)    (1)    (2)     (3)    (4)      (5)
```

### Sprite Requirements Per Pet
- **Idle Animation**: 2-4 frames
- **Happy Animation**: 4 frames (jumping/dancing)
- **Eating Animation**: 3-4 frames
- **Playing Animation**: 4-6 frames
- **Sleeping Animation**: 2 frames (breathing effect)
- **Battle Stance**: 2-3 frames
- **Attack Animation**: 4-6 frames
- **Hurt Animation**: 2-3 frames
- **Victory Animation**: 4-6 frames

## 📱 UI Components

### Pixel UI Elements
```
Button States:
┌─────────┐  ┌═════════┐  ┌╔═══════╗┐
│ Normal  │  ║ Hover   ║  ║║Active ║║
└─────────┘  └═════════┘  └╚═══════╝┘

Progress Bars:
[████████░░░░░░░] 60%
▓▓▓▓▓▓▓▓▒▒▒▒▒▒▒▒ 50%

Dialog Boxes:
╔══════════════════╗
║ Your pet is      ║
║ hungry!          ║
╚══════════════════╝
```

### Screen Layouts

#### Main Pet View
```
┌──────────────────────┐
│  [Status Bar]        │
├──────────────────────┤
│                      │
│    [Pet Sprite]      │ <- Animated sprite
│     "PET NAME"       │
│      Lv.15          │
│                      │
├──────────────────────┤
│ HP: ████████░░ 80/100│
│ XP: ██████░░░░ 60/100│
│ 😊: ████████░░ 80/100│
│ 🍖: ██░░░░░░░░ 20/100│
├──────────────────────┤
│ [Feed] [Play] [Battle]│
│ [Stats] [Evolve] [NFT]│
└──────────────────────┘
```

#### Battle Screen
```
┌──────────────────────┐
│     BATTLE MODE      │
├──────────────────────┤
│ [Enemy Sprite]       │
│  Lv.14 Wild Slime    │
│  HP: ███░░░░░        │
├──────────────────────┤
│       VS             │
├──────────────────────┤
│ [Your Pet Sprite]    │
│  Lv.15 FrenPet       │
│  HP: ████████        │
├──────────────────────┤
│[Attack][Defend][Item]│
│[Special][Run]        │
└──────────────────────┘
```

## 🎮 Game Mechanics Expansion

### Core Loop
1. **Nurture** - Feed, play, clean (Tamagotchi-style)
2. **Train** - Mini-games to increase stats
3. **Battle** - Turn-based combat with other pets
4. **Evolve** - Different paths based on care and battle stats
5. **Collect** - Rare pets, items, achievements

### New Features

#### Training Mini-Games
- **Rhythm Game** - Tap to the beat (increases Speed)
- **Memory Game** - Simon Says style (increases Intelligence)
- **Reflex Game** - Quick tap challenges (increases Attack)
- **Endurance Game** - Hold actions (increases Defense)

#### Battle System
```javascript
// Simplified battle mechanics
{
  moves: [
    { name: "Tackle", power: 40, type: "normal" },
    { name: "Fireball", power: 60, type: "fire", cost: 10 },
    { name: "Heal", power: 0, heal: 30, cost: 15 }
  ],
  types: {
    fire: { strong: ["nature"], weak: ["water"] },
    water: { strong: ["fire"], weak: ["electric"] },
    // ... type effectiveness chart
  }
}
```

#### Evolution Paths
- **Care-based**: High happiness → Friendly evolutions
- **Battle-based**: Many victories → Fighter evolutions
- **Neglect-based**: Low stats → Dark evolutions
- **Special**: Specific item/time/condition evolutions

## 🎬 Animation System

### Sprite Sheet Structure
```
spritesheet.png (256x256)
┌────┬────┬────┬────┐
│Idle│Idle│Idle│Idle│ Row 1: Idle frames
├────┼────┼────┼────┤
│Walk│Walk│Walk│Walk│ Row 2: Walking
├────┼────┼────┼────┤
│Eat │Eat │Eat │Eat │ Row 3: Eating
├────┼────┼────┼────┤
│Play│Play│Play│Play│ Row 4: Playing
└────┴────┴────┴────┘
```

### Animation Controller
```javascript
class PetAnimator {
  animations = {
    idle: { frames: [0,1,2,1], duration: 200 },
    walk: { frames: [4,5,6,7], duration: 150 },
    eat: { frames: [8,9,10,9], duration: 100 },
    play: { frames: [12,13,14,15], duration: 100 },
    sleep: { frames: [16,17], duration: 500 },
  }
  
  play(animationName) {
    // Cycle through frames based on duration
  }
}
```

## 🛠️ Implementation Phases

### Phase 1: Foundation (Week 1-2)
- [ ] Set up pixel art UI framework
- [ ] Implement sprite loading system
- [ ] Create base UI components (buttons, bars, dialogs)
- [ ] Design and implement 3 starter pets

### Phase 2: Core Experience (Week 3-4)
- [ ] Implement pet animations (idle, eat, play)
- [ ] Add stat bars with pixel styling
- [ ] Create day/night theme system
- [ ] Implement basic sound effects

### Phase 3: Battle System (Week 5-6)
- [ ] Design battle UI screens
- [ ] Implement turn-based combat
- [ ] Add 5-10 enemy types
- [ ] Create victory/defeat animations

### Phase 4: Evolution & Collection (Week 7-8)
- [ ] Design evolution trees
- [ ] Implement evolution animations
- [ ] Add pet collection gallery
- [ ] Create achievement system

## 📦 Asset Sources

### Open Source Sprites
- [OpenGameArt.org](https://opengameart.org/)
  - Search: "16x16 creatures", "pixel monsters", "rpg enemies"
- [itch.io Asset Store](https://itch.io/game-assets/free/tag-pixel-art)
- [Kenney.nl](https://kenney.nl/assets?q=2d)

### Custom Generation
- Use Scenario.gg API for AI-generated sprites
- Pixel art tools: Aseprite, Piskel, GraphicsGale
- Sprite sheet packers: TexturePacker, Shoebox

### Sound Assets
- [Freesound.org](https://freesound.org/) - 8-bit sound effects
- [SFXR](https://sfxr.me/) - Retro sound generator
- [Bfxr](https://www.bfxr.net/) - Enhanced retro sounds

## 🎯 Success Metrics

1. **Visual Cohesion** - All UI elements match pixel art style
2. **Performance** - 60 FPS animations on mobile
3. **Nostalgia Factor** - Evokes classic handheld gaming feel
4. **Accessibility** - Clear, readable pixel fonts
5. **Engagement** - Increased session time with animations

## 🚀 Quick Start Assets

### Immediate Needs
1. **3 Starter Pet Sprites** (32x32, 4 animation states each)
2. **UI Tileset** (buttons, frames, backgrounds)
3. **Food/Item Icons** (16x16, ~20 items)
4. **Emotion Bubbles** (happy, sad, hungry, sleepy)
5. **Battle Effects** (hit, miss, critical, heal)

### Color Palette File
```css
:root {
  /* FrenPet Pixel Palette */
  --pixel-purple: #5A4FCF;
  --pixel-purple-light: #7B68EE;
  --pixel-gold: #FFD93D;
  --pixel-green: #6BCB77;
  --pixel-red: #FF6B6B;
  --pixel-blue: #4A90E2;
  --pixel-brown: #8B6F47;
  --pixel-cream: #F4E4C1;
  --pixel-dark: #2D3436;
  --pixel-white: #F5F5F5;
}
```

## 📝 Next Steps

1. **Create Sprite Sheet Template** - Base template for pet sprites
2. **Design UI Component Library** - Pixel-perfect buttons, bars, frames
3. **Prototype Animation System** - Test sprite animation performance
4. **Generate First Pet Set** - 3 starter pets with full animation sets
5. **Implement Pixel Font** - Find/create readable pixel font

---

*This design system provides the foundation for transforming FrenPet into an engaging pixel art experience that combines nostalgia with modern Web3 gaming.*