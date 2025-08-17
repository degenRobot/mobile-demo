#!/bin/bash

# Debug Failed Porto Transaction
# Usage: ./debug-failed-tx.sh

echo "🔍 Debugging Failed Porto Transaction"
echo "====================================="
echo ""

# Your wallet addresses from logs
MAIN_WALLET="0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f"
SESSION_KEY="0x98cA791fa6fcB03c0Bb6BBFFDf5357754EA77495"
BUNDLE_ID="0x163a0865e9b33bc6f8545a30a18a01c415d7e0f047deba978b575c83386be142"

echo "Main Wallet: $MAIN_WALLET"
echo "Session Key: $SESSION_KEY"
echo "Bundle ID: $BUNDLE_ID"
echo ""

# Check delegation status - if account has code, it's delegated
echo "1. Checking delegation status..."
echo "---"

echo "Main wallet code:"
cast code $MAIN_WALLET --rpc-url https://testnet.riselabs.xyz

echo ""
echo "Session key code:"
cast code $SESSION_KEY --rpc-url https://testnet.riselabs.xyz

echo ""
echo "If code is '0x' or empty, account is NOT delegated"
echo "If code exists, account IS delegated to Porto"
echo ""

# Check balances
echo "2. Checking balances..."
echo "---"
cast balance $MAIN_WALLET --rpc-url https://testnet.riselabs.xyz
echo "Main wallet balance: $(cast balance $MAIN_WALLET --rpc-url https://testnet.riselabs.xyz)"
echo "Session key balance: $(cast balance $SESSION_KEY --rpc-url https://testnet.riselabs.xyz)"
echo ""

# Try to get transaction info from bundle ID
echo "3. Checking transaction status..."
echo "---"
echo "Note: Bundle ID might not be a tx hash. Checking Porto for status..."
echo ""

# Check nonce
echo "4. Checking nonces..."
echo "---"
echo "Main wallet nonce: $(cast nonce $MAIN_WALLET --rpc-url https://testnet.riselabs.xyz)"
echo "Session key nonce: $(cast nonce $SESSION_KEY --rpc-url https://testnet.riselabs.xyz)"
echo ""

echo "====================================="
echo "Analysis:"
echo ""
echo "❓ Key Questions:"
echo "1. Is main wallet delegated? (has code)"
echo "2. Does main wallet have balance for gas?"
echo "3. Which account should Porto use?"
echo ""
echo "⚠️  Issue Found:"
echo "Porto is using session key ($SESSION_KEY)"
echo "But it should probably use main wallet ($MAIN_WALLET)"
echo ""
echo "Next: Run node test-porto-status.js to check bundle status"