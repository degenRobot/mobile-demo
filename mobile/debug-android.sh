#!/bin/bash

# Android Debug Script for FrenPet Mobile
# Captures all logs from Android emulator/device

echo "🤖 Android Debug Mode for FrenPet"
echo "=================================="
echo ""

# Check if Android emulator is running
check_emulator() {
    adb devices | grep -q "emulator"
    return $?
}

# Start Android emulator if not running
if ! check_emulator; then
    echo "📱 Starting Android emulator..."
    echo "Please start your Android emulator manually from Android Studio"
    echo "Waiting for emulator..."
    
    while ! check_emulator; do
        sleep 2
        echo -n "."
    done
    echo ""
fi

echo "✅ Android device/emulator detected"
echo ""

# Clear previous logs
echo "🧹 Clearing previous logs..."
adb logcat -c

# Start Metro bundler in background
echo "🚀 Starting Metro bundler..."
npx react-native start --reset-cache &
METRO_PID=$!

# Wait for Metro to start
sleep 5

# Install and run app on Android
echo "📲 Installing app on Android..."
cd /Users/msmart/mobile-demo/mobile
npx expo run:android

# Function to filter relevant logs
filter_logs() {
    grep -E "(ReactNative|Porto|FrenPet|Expo|Console|Error|Warning|crypto|viem|wagmi)"
}

# Start logging
echo ""
echo "📝 Capturing Android logs..."
echo "============================"
echo ""
echo "Filters applied: ReactNative, Porto, FrenPet, Expo, Errors, Warnings"
echo ""

# Capture logs with colors
adb logcat -v color | filter_logs

# Cleanup function
cleanup() {
    echo ""
    echo "🛑 Stopping Metro bundler..."
    kill $METRO_PID 2>/dev/null
    exit
}

trap cleanup EXIT INT TERM