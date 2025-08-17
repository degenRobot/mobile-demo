#!/bin/bash

# Deploy FrenPet contract to RISE testnet

echo "Deploying FrenPet contract to RISE testnet..."

# Load .env file from contracts directory
if [ -f contracts/.env ]; then
    echo "Loading environment from contracts/.env..."
    export $(cat contracts/.env | grep -v '^#' | xargs)
fi

# Check if PRIVATE_KEY is set
if [ -z "$PRIVATE_KEY" ]; then
    echo "Error: PRIVATE_KEY environment variable is not set"
    echo "Please set your private key: export PRIVATE_KEY=0x..."
    exit 1
fi

# Navigate to contracts directory
cd contracts

# Build the contracts
echo "Building contracts..."
forge build

# Deploy the contract
echo "Deploying to RISE testnet (Chain ID: 1123)..."
echo "RPC URL: https://testnet.riselabs.xyz"
forge script script/DeployFrenPet.s.sol:DeployFrenPetScript \
    --rpc-url https://testnet.riselabs.xyz \
    --broadcast \
    --slow \
    --legacy

echo "Deployment complete!"
echo "Check the broadcast directory for deployment details"