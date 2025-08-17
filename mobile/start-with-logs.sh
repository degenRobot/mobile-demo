#!/bin/bash

# FrenPet Mobile - Start with Full Logging
# This script starts Expo with enhanced logging for debugging

echo "🚀 Starting FrenPet Mobile with Enhanced Logging"
echo "================================================"
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check Node version
echo "📦 Checking environment..."
node_version=$(node -v)
npm_version=$(npm -v)
echo "Node: $node_version"
echo "NPM: $npm_version"
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Installing dependencies...${NC}"
    npm install
    echo ""
fi

# Test Porto connection first
echo "🔍 Testing Porto Relayer Connection..."
node test-porto.js
echo ""

# Set environment variables for debugging
export DEBUG=expo:*
export EXPO_DEBUG=true
export NODE_ENV=development

# Clear caches
echo "🧹 Clearing caches..."
npx expo start --clear &

# Store the PID
EXPO_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping Expo..."
    kill $EXPO_PID 2>/dev/null
    exit
}

# Set trap to cleanup on script exit
trap cleanup EXIT INT TERM

# Monitor logs
echo ""
echo "📱 Expo Development Server Starting..."
echo "======================================="
echo ""
echo "Available commands:"
echo "  Press 'a' → Open on Android"
echo "  Press 'i' → Open on iOS simulator"
echo "  Press 'w' → Open in web browser"
echo "  Press 'r' → Reload app"
echo "  Press 'd' → Open developer menu"
echo "  Press 'Ctrl+C' → Stop server"
echo ""
echo "📝 Monitoring logs..."
echo ""

# Wait for Expo process
wait $EXPO_PID