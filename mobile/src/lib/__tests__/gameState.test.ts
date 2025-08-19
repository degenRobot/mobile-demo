/**
 * Game State Tests
 * Tests for reading and managing FrenPet game state
 */

describe('FrenPet Game State', () => {
  const CONTRACT_ADDRESS = '0xfaf41c4e338d5f712e4aa221c654f764036f168a';
  const TEST_ADDRESS = '0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f';

  describe('Pet State Reading', () => {
    it('should detect when no pet exists', () => {
      const petData = {
        name: '',
        hunger: 0,
        happiness: 0,
        isAlive: false,
        level: 0,
      };

      const hasPet = petData.name !== '';
      expect(hasPet).toBe(false);
    });

    it('should detect when pet exists', () => {
      const petData = {
        name: 'Fluffy',
        hunger: 30,
        happiness: 70,
        isAlive: true,
        level: 5,
      };

      const hasPet = petData.name !== '';
      expect(hasPet).toBe(true);
    });

    it('should calculate if pet needs feeding', () => {
      const petData = {
        hunger: 75,
        lastFed: Math.floor(Date.now() / 1000) - 7200, // 2 hours ago
      };

      // Hunger increases by 10 per hour
      const timeSinceFed = Math.floor(Date.now() / 1000) - petData.lastFed;
      const hungerIncrease = Math.floor(timeSinceFed / 3600) * 10;
      const currentHunger = Math.min(100, petData.hunger + hungerIncrease);

      const needsFeeding = currentHunger > 50;
      expect(needsFeeding).toBe(true);
      expect(currentHunger).toBeGreaterThanOrEqual(95);
    });

    it('should calculate if pet needs playing', () => {
      const petData = {
        happiness: 30,
        lastPlayed: Math.floor(Date.now() / 1000) - 10800, // 3 hours ago
      };

      // Happiness decreases by 5 per hour
      const timeSincePlayed = Math.floor(Date.now() / 1000) - petData.lastPlayed;
      const happinessDecrease = Math.floor(timeSincePlayed / 3600) * 5;
      const currentHappiness = Math.max(0, petData.happiness - happinessDecrease);

      const needsPlaying = currentHappiness < 50;
      expect(needsPlaying).toBe(true);
      expect(currentHappiness).toBeLessThanOrEqual(15);
    });

    it('should detect critical state', () => {
      const criticalHunger = {
        hunger: 95,
        happiness: 50,
      };

      const criticalHappiness = {
        hunger: 50,
        happiness: 5,
      };

      const isCritical = (pet: any) => pet.hunger > 90 || pet.happiness < 10;

      expect(isCritical(criticalHunger)).toBe(true);
      expect(isCritical(criticalHappiness)).toBe(true);
      expect(isCritical({ hunger: 50, happiness: 50 })).toBe(false);
    });
  });

  describe('Pet Status Display', () => {
    it('should show correct emoji for pet state', () => {
      const getEmoji = (hunger: number, happiness: number, isAlive: boolean) => {
        if (!isAlive) return '💀';
        if (hunger > 80) return '😢';
        if (hunger > 60) return '😕';
        if (happiness < 20) return '😔';
        if (happiness > 70 && hunger < 30) return '😄';
        return '😊';
      };

      expect(getEmoji(90, 50, true)).toBe('😢'); // Starving
      expect(getEmoji(70, 50, true)).toBe('😕'); // Hungry
      expect(getEmoji(30, 10, true)).toBe('😔'); // Sad
      expect(getEmoji(20, 80, true)).toBe('😄'); // Very Happy
      expect(getEmoji(50, 50, false)).toBe('💀'); // Dead
    });

    it('should format time correctly', () => {
      const formatTime = (timestamp: number) => {
        if (!timestamp) return 'Never';
        const now = Date.now();
        const diff = now - timestamp * 1000;
        const hours = Math.floor(diff / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

        if (hours > 24) {
          return `${Math.floor(hours / 24)} days ago`;
        } else if (hours > 0) {
          return `${hours}h ${minutes}m ago`;
        } else {
          return `${minutes} minutes ago`;
        }
      };

      const now = Math.floor(Date.now() / 1000);
      expect(formatTime(now - 300)).toBe('5 minutes ago');
      expect(formatTime(now - 3600)).toBe('1h 0m ago');
      expect(formatTime(now - 86400 * 2)).toBe('2 days ago');
      expect(formatTime(0)).toBe('Never');
    });
  });

  describe('Action Requirements', () => {
    it('should determine required actions for new player', () => {
      const newPlayer = {
        hasPet: false,
        pet: null,
      };

      const actions = {
        createPet: !newPlayer.hasPet,
        feedPet: false,
        playWithPet: false,
        trainPet: false,
        battle: false,
      };

      expect(actions.createPet).toBe(true);
      expect(actions.feedPet).toBe(false);
    });

    it('should determine required actions for existing pet', () => {
      const player = {
        hasPet: true,
        pet: {
          hunger: 70,
          happiness: 30,
          level: 5,
          isAlive: true,
        },
      };

      const actions = {
        createPet: false,
        feedPet: player.pet.hunger > 50,
        playWithPet: player.pet.happiness < 50,
        trainPet: player.pet.isAlive && player.pet.level < 10,
        battle: player.pet.isAlive && player.pet.level > 3,
      };

      expect(actions.createPet).toBe(false);
      expect(actions.feedPet).toBe(true);
      expect(actions.playWithPet).toBe(true);
      expect(actions.trainPet).toBe(true);
      expect(actions.battle).toBe(true);
    });

    it('should handle dead pet state', () => {
      const player = {
        hasPet: true,
        pet: {
          name: 'Fluffy',
          isAlive: false,
        },
      };

      const actions = {
        createPet: !player.pet.isAlive, // Need new pet
        feedPet: false,
        playWithPet: false,
        revive: false, // Could add revive feature
      };

      expect(actions.createPet).toBe(true);
      expect(actions.feedPet).toBe(false);
    });
  });

  describe('Battle State', () => {
    it('should check active battle status', () => {
      const battleData = {
        opponent: '0x1234567890123456789012345678901234567890',
        isActive: true,
        winner: '0x0000000000000000000000000000000000000000',
        wager: '1000000000000000', // 0.001 ETH
      };

      const hasBattle = battleData.isActive;
      const battleComplete = battleData.winner !== '0x0000000000000000000000000000000000000000';

      expect(hasBattle).toBe(true);
      expect(battleComplete).toBe(false);
    });

    it('should check battle results', () => {
      const battleData = {
        opponent: '0x1234567890123456789012345678901234567890',
        isActive: false,
        winner: TEST_ADDRESS,
        wager: '1000000000000000',
      };

      const hasBattle = battleData.isActive;
      const isWinner = battleData.winner === TEST_ADDRESS;
      const canClaimReward = !battleData.isActive && isWinner;

      expect(hasBattle).toBe(false);
      expect(isWinner).toBe(true);
      expect(canClaimReward).toBe(true);
    });
  });

  describe('Mobile App State Management', () => {
    it('should create app state from contract data', () => {
      const contractData = {
        pet: null,
        battle: null,
      };

      const appState = {
        needsOnboarding: !contractData.pet,
        currentScreen: contractData.pet ? 'pet' : 'create',
        actions: {
          primary: contractData.pet ? 'feed' : 'create',
          secondary: contractData.pet ? 'play' : null,
        },
      };

      expect(appState.needsOnboarding).toBe(true);
      expect(appState.currentScreen).toBe('create');
      expect(appState.actions.primary).toBe('create');
    });

    it('should prioritize critical actions', () => {
      const getPriority = (pet: any) => {
        if (!pet) return 'create';
        if (!pet.isAlive) return 'create_new';
        if (pet.hunger > 90) return 'feed_urgent';
        if (pet.happiness < 10) return 'play_urgent';
        if (pet.hunger > 50) return 'feed';
        if (pet.happiness < 50) return 'play';
        return 'train';
      };

      expect(getPriority(null)).toBe('create');
      expect(getPriority({ isAlive: false })).toBe('create_new');
      expect(getPriority({ isAlive: true, hunger: 95, happiness: 50 })).toBe('feed_urgent');
      expect(getPriority({ isAlive: true, hunger: 30, happiness: 5 })).toBe('play_urgent');
      expect(getPriority({ isAlive: true, hunger: 60, happiness: 60 })).toBe('feed');
      expect(getPriority({ isAlive: true, hunger: 30, happiness: 30 })).toBe('play');
      expect(getPriority({ isAlive: true, hunger: 20, happiness: 80 })).toBe('train');
    });
  });
});