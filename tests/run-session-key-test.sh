#!/bin/bash

# Run Session Key Authorization Tests
# This tests Porto's session key functionality

echo "🔑 Running Porto Session Key Authorization Tests"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Test environment
MAIN_WALLET="0x6999c3aeD0a9241C07CdF2c8fBD38d858476b44f"
SESSION_KEY="0x98cA791fa6fcB03c0Bb6BBFFDf5357754EA77495"

echo -e "${BLUE}Test Configuration:${NC}"
echo "Main Wallet: $MAIN_WALLET"
echo "Session Key: $SESSION_KEY"
echo "Porto URL: https://rise-testnet-porto.fly.dev"
echo ""

# Check if node is installed
if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js found:${NC} $(node --version)"
echo ""

# Run tests in sequence
echo -e "${YELLOW}1. Testing Session Key Authorization...${NC}"
echo "========================================="
node test-session-key-auth.js
echo ""

echo -e "${YELLOW}2. Debugging Intent Data Format...${NC}"
echo "===================================="
node debug-intent-data.js
echo ""

echo -e "${YELLOW}3. Testing Complete Porto Flow...${NC}"
echo "=================================="
node test-complete-porto-flow.js
echo ""

echo -e "${YELLOW}4. Checking Failed Transaction Status...${NC}"
echo "========================================"
node test-porto-status.js
echo ""

# Check delegation status using cast if available
if command -v cast &> /dev/null; then
    echo -e "${YELLOW}5. Checking Delegation Status with Cast...${NC}"
    echo "==========================================="
    
    echo "Main wallet code:"
    MAIN_CODE=$(cast code $MAIN_WALLET --rpc-url https://testnet.riselabs.xyz 2>/dev/null)
    if [ "$MAIN_CODE" = "0x" ] || [ -z "$MAIN_CODE" ]; then
        echo -e "${RED}❌ Main wallet NOT delegated (no code)${NC}"
    else
        echo -e "${GREEN}✅ Main wallet IS delegated (has code)${NC}"
        echo "Code length: ${#MAIN_CODE} chars"
    fi
    
    echo ""
    echo "Session key code:"
    SESSION_CODE=$(cast code $SESSION_KEY --rpc-url https://testnet.riselabs.xyz 2>/dev/null)
    if [ "$SESSION_CODE" = "0x" ] || [ -z "$SESSION_CODE" ]; then
        echo -e "${RED}❌ Session key NOT delegated (no code)${NC}"
    else
        echo -e "${GREEN}✅ Session key IS delegated (has code)${NC}"
        echo "Code length: ${#SESSION_CODE} chars"
    fi
    
    echo ""
    echo "Balances:"
    echo "Main wallet: $(cast balance $MAIN_WALLET --rpc-url https://testnet.riselabs.xyz 2>/dev/null || echo 'Unable to fetch')"
    echo "Session key: $(cast balance $SESSION_KEY --rpc-url https://testnet.riselabs.xyz 2>/dev/null || echo 'Unable to fetch')"
else
    echo -e "${YELLOW}ℹ️  Cast not found - skipping on-chain checks${NC}"
    echo "Install Foundry for additional debugging: https://getfoundry.sh"
fi

echo ""
echo "================================================"
echo -e "${GREEN}📊 Test Summary${NC}"
echo "================================================"
echo ""

echo -e "${BLUE}Key Findings:${NC}"
echo "1. Session keys need authorization during account upgrade"
echo "2. Use 'role: session' with expiry for session keys"
echo "3. Main wallet should use 'role: admin'"
echo "4. Both accounts need proper key format in Porto requests"
echo ""

echo -e "${BLUE}Next Steps:${NC}"
echo "1. If session key tests fail: Use main wallet for now"
echo "2. If main wallet tests fail: Check delegation status"
echo "3. If both fail: Account may need initial delegation"
echo ""

echo -e "${GREEN}✅ Tests Complete!${NC}"