# Architecture

## Overview

FrenPet is a React Native mobile app that interacts with RISE blockchain through Porto relayer for gasless transactions.

## Stack

- **Mobile**: React Native + Expo
- **Blockchain**: RISE Testnet  
- **Relayer**: Porto (gasless transactions)
- **Smart Contracts**: Solidity + Foundry

## Key Components

### 1. Porto Client (`lib/portoClient.native.ts`)
Handles gasless transactions through Porto relayer:
- Prepares transaction intents
- Signs with EIP-712
- Sends to relayer for execution
- Monitors transaction status

### 2. Session Wallet (`lib/sessionWallet.ts`)
Manages wallet keys:
- Main wallet: Stored securely, rarely used
- Session keys: Temporary keys for signing
- Auto-initialization with Expo SecureStore

### 3. FrenPet Hook (`hooks/useFrenPet.ts`)
Game logic interface:
- Uses Porto for gasless transactions
- Falls back to direct RPC if needed
- Handles all pet interactions

## Transaction Flow

```
User Action
    ↓
Porto Client (prepares intent)
    ↓
EIP-712 Signing (session key)
    ↓
Porto Relayer (sponsors gas)
    ↓
RISE Blockchain
```

## Security

- Private keys stored in Expo SecureStore
- Session keys for reduced exposure
- All signing happens locally
- Porto never sees private keys

## Network Details

- **Chain ID**: 1123 (RISE Testnet)
- **RPC**: https://testnet.riselabs.xyz
- **Porto**: https://rise-testnet-porto.fly.dev
- **Porto Chain ID**: 11155931 (Sepolia fork)