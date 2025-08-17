# 🚀 Step-by-Step Instructions to Run FrenPet Mobile

## Prerequisites Check
Open Terminal and run these commands to verify your setup:

```bash
# Check Node.js (should be 18+ or 20+)
node --version

# Check npm
npm --version

# Check if Android tools are installed
adb --version

# Check if Expo CLI is installed
npx expo --version
```

## Step 1: Open Terminal #1 (Porto Test & Expo)

```bash
# Navigate to the mobile directory
cd /Users/msmart/mobile-demo/mobile

# Install dependencies (if not already done)
npm install

# Test Porto relayer connection
node test-porto.js

# You should see:
# ✅ Porto is healthy!
# ✅ Capabilities retrieved
# ✅ Porto integration is working!
```

## Step 2: Start Expo Development Server

In the same terminal:

```bash
# Start Expo with clear cache
npx expo start --clear

# Or use the logging script
chmod +x start-with-logs.sh
./start-with-logs.sh
```

You'll see:
```
Starting Metro Bundler
▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄▄
█ ▄▄▄▄▄ █▀▄█▀ ▀▀██ ▄▄▄▄▄ █
█ █   █ █▄▀ █▄ ▀▄█ █   █ █
█ █▄▄▄█ █ ▄▄▄  ▄ █ █▄▄▄█ █
█▄▄▄▄▄▄▄█▄█▄█▄█▄█▄█▄▄▄▄▄▄▄█

› Metro waiting on exp://192.168.x.x:8081
› Scan the QR code with Expo Go (Android/iOS)

› Press a │ open Android
› Press i │ open iOS simulator
› Press w │ open web
```

## Step 3: Open Android Studio

1. **Launch Android Studio**

2. **Open AVD Manager**
   - Click "More Actions" → "AVD Manager"
   - Or Tools → AVD Manager

3. **Create/Start an Emulator**
   - Recommended: Pixel 6, API 33 or higher
   - Click the ▶️ Play button to start

4. **Wait for emulator to fully boot**
   - Home screen should appear
   - Status bar shows time/battery

## Step 4: Open Terminal #2 (Android Logs)

```bash
# Verify emulator is running
adb devices

# You should see something like:
# List of devices attached
# emulator-5554 device

# Clear old logs
adb logcat -c

# Start monitoring logs (filtered)
adb logcat | grep -E "(ReactNative|Porto|FrenPet|Expo)"
```

## Step 5: Run App on Android

Back in Terminal #1 (where Expo is running):

1. **Press 'a'** to open on Android
   - Expo will build and install the app
   - This may take 2-3 minutes first time

2. **Watch Terminal #2** for logs during startup

## Step 6: What You Should See

### In the App:
1. **Splash Screen** with FrenPet logo
2. **Home Screen** with:
   - Wallet address (auto-generated)
   - Balance: 0.0000 RISE
   - Green Porto status indicator: "✅ Active"
3. **Bottom tabs** with Home 🏠 and Pet 🐾 icons

### In Terminal #2 (Logs):
```
I/ReactNative: [Porto] Initialized with account: 0x...
I/ReactNative: [Porto] Health check: healthy
I/ReactNative: [usePorto] Porto relayer is healthy
I/ReactNative: Porto relayer is healthy and ready
I/ReactNative: [SessionWallet] Porto initialized successfully
```

## Step 7: Test Pet Creation

1. **Tap the Pet 🐾 tab**
2. **Enter a pet name** (e.g., "Fluffy")
3. **Tap "Create Pet"**

### Expected Logs:
```
I/ReactNative: [FrenPet] Sending gasless transaction via Porto...
I/ReactNative: [Porto] Preparing calls...
I/ReactNative: [Porto] Signing intent...
I/ReactNative: [Porto] Sending to relayer...
I/ReactNative: [Porto] Transaction sent, bundle ID: xxx-xxx-xxx
I/ReactNative: [FrenPet] Transaction confirmed!
```

## Troubleshooting

### Issue: "Metro has encountered an error"
```bash
# Clear all caches
npx expo start --clear
npx react-native start --reset-cache
rm -rf node_modules/.cache
```

### Issue: "Unable to resolve module" 
```bash
# Reinstall dependencies
rm -rf node_modules
npm install
```

### Issue: Android emulator not detected
```bash
# Check adb
adb devices

# If empty, in Android Studio:
# - Tools → AVD Manager
# - Cold Boot the emulator
```

### Issue: Porto health check fails
- Check internet connection
- Try the test again: `node test-porto.js`
- Porto might be temporarily down

### Issue: App crashes on startup
Check logs for:
- Missing polyfills (should be included)
- Wagmi errors (should be removed)
- Look for first error in stack trace

## Debug Commands

```bash
# View all logs
adb logcat

# Save logs to file
adb logcat > debug-$(date +%s).log

# View React Native specific
adb logcat | grep "ReactNativeJS"

# Clear and restart
adb logcat -c && npx expo start --clear
```

## Success Checklist

✅ Porto test passes (`node test-porto.js`)
✅ Expo starts without errors
✅ Android emulator is running
✅ App installs and launches
✅ Wallet address appears
✅ Porto status shows "Active"
✅ Can navigate between tabs
✅ Pet creation shows "bundle ID" (not tx hash)

## Next Steps

Once the app is running:
1. **Fund your wallet** with testnet RISE for testing
2. **Create a pet** to test gasless transactions
3. **Monitor logs** for any errors
4. **Test all features**: Feed, Play, Battle

---

**Need Help?**
If you see any errors, copy the full error message and stack trace from the logs!