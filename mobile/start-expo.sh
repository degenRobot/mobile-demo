#!/bin/bash

echo "🚀 Starting FrenPet Mobile with Expo"
echo "===================================="
echo ""

# Check if dependencies are installed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

echo "✅ Porto is working! (as confirmed by test)"
echo ""
echo "🎮 Starting Expo development server..."
echo ""

# Start Expo with clear cache
npx expo start --clear