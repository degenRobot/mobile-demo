// FrenPetSimple contract - gasless version without payable functions
export const FRENPET_ADDRESS = '0x3FDE139A94eEf14C4eBa229FDC80A54f7F5Fbf25';

export const FRENPET_ABI = [
  {
    "inputs": [{"internalType": "string", "name": "_name", "type": "string"}],
    "name": "createPet",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "feedPet",
    "outputs": [],
    "stateMutability": "nonpayable",  // Changed from payable
    "type": "function"
  },
  {
    "inputs": [],
    "name": "playWithPet",
    "outputs": [],
    "stateMutability": "nonpayable",  // Changed from payable
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "owner", "type": "address"}],
    "name": "getPetStats",
    "outputs": [
      {"internalType": "string", "name": "name", "type": "string"},
      {"internalType": "uint256", "name": "level", "type": "uint256"},
      {"internalType": "uint256", "name": "experience", "type": "uint256"},
      {"internalType": "uint256", "name": "happiness", "type": "uint256"},
      {"internalType": "uint256", "name": "hunger", "type": "uint256"},
      {"internalType": "bool", "name": "isAlive", "type": "bool"}
      // Removed winStreak from simplified version
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [{"internalType": "address", "name": "", "type": "address"}],
    "name": "hasPet",
    "outputs": [{"internalType": "bool", "name": "", "type": "bool"}],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "string", "name": "name", "type": "string"}
    ],
    "name": "PetCreated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "newHunger", "type": "uint256"}
    ],
    "name": "PetFed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "newHappiness", "type": "uint256"}
    ],
    "name": "PetPlayed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      {"indexed": true, "internalType": "address", "name": "owner", "type": "address"},
      {"indexed": false, "internalType": "uint256", "name": "newLevel", "type": "uint256"}
    ],
    "name": "PetLevelUp",
    "type": "event"
  }
] as const;