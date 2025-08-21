// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

/**
 * @title IPetTypes
 * @notice Defines all types and structures for the FrenPet system
 */
interface IPetTypes {
    // ============ Pet Types ============
    enum PetType {
        None,
        Normal,
        Fire,
        Water,
        Grass,
        Electric,
        Dragon
    }
    
    // ============ Item Types ============
    enum ItemType {
        None,
        BasicFood,
        RareFood,
        EpicFood,
        Toy,
        HealthPotion,
        RevivePotion,
        ExpBoost,
        StatBoost,
        EvolutionStone
    }
    
    // ============ Battle Moves ============
    enum BattleMove {
        None,
        Attack,
        Defend,
        Special
    }
    
    // ============ Structures ============
    
    struct Pet {
        string name;
        PetType petType;
        uint256 evolutionStage;
        uint256 level;
        uint256 experience;
        uint256 lastHappiness;
        uint256 lastHunger;
        uint256 lastFed;
        uint256 lastPlayed;
        uint256 lastBattle;
        uint256 birthTime;
        bool isAlive;
        // Battle stats
        uint256 wins;
        uint256 losses;
        uint256 winStreak;
        // Attributes
        uint256 attack;
        uint256 defense;
        uint256 speed;
        uint256 health;
        uint256 maxHealth;
    }
    
    struct PetStats {
        uint256 attack;
        uint256 defense;
        uint256 speed;
        uint256 health;
    }
    
    struct Inventory {
        uint256 coins;
        mapping(ItemType => uint256) items;
        uint256 lastDailyReward;
    }
    
    struct Battle {
        address challenger;
        address opponent;
        address winner;
        uint256 startTime;
        bool completed;
        BattleMove challengerMove;
        BattleMove opponentMove;
    }
    
    struct MarketListing {
        address seller;
        ItemType item;
        uint256 quantity;
        uint256 pricePerItem;
        bool active;
    }
}