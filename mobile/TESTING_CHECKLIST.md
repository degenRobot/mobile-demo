# Testing Checklist for FrenPet Mobile

## 🚀 Quick Start Testing

```bash
# Make scripts executable
chmod +x start-with-logs.sh debug-android.sh

# Test Porto connection
node test-porto.js

# Start with enhanced logging
./start-with-logs.sh

# Or for Android specific debugging
./debug-android.sh
```

## 📱 Android Studio Setup

1. **Open Android Studio**
2. **Start AVD (Android Virtual Device)**
   - Tools → AVD Manager
   - Create/Start an emulator (Pixel 6, API 33+ recommended)
3. **Verify emulator is running**
   ```bash
   adb devices
   ```

## ✅ Testing Checklist

### 1. Initial App Launch
- [ ] App launches without crashes
- [ ] Splash screen displays
- [ ] Navigation tabs appear (Home & Pet icons)

### 2. Wallet Initialization
- [ ] Check console for: `[Porto] Initialized with account: 0x...`
- [ ] Home screen shows wallet address
- [ ] Balance displays (will be 0 initially)
- [ ] Porto status indicator shows (green = healthy, yellow = offline)

### 3. Porto Integration
- [ ] Check console for: `[Porto] Health check: healthy`
- [ ] Look for: `Porto relayer is healthy and ready`
- [ ] Verify gasless status indicator on HomeScreen

### 4. Pet Creation (First Test)
- [ ] Navigate to Pet tab
- [ ] Enter pet name
- [ ] Tap "Create Pet"
- [ ] **Expected logs:**
  ```
  [FrenPet] Sending gasless transaction via Porto...
  [Porto] Preparing calls...
  [Porto] Signing intent...
  [Porto] Sending to relayer...
  [Porto] Transaction sent, bundle ID: xxx
  ```

### 5. Error Scenarios to Test
- [ ] No network connection (should show error)
- [ ] Porto offline (should fallback to RPC)
- [ ] Invalid pet name (empty string)

## 🔍 Log Monitoring

### Key Log Patterns to Watch

**Success Indicators:**
```
✅ [Porto] Initialized with account
✅ [Porto] Health check: healthy
✅ [usePorto] Porto relayer is healthy
✅ [FrenPet] Transaction confirmed!
```

**Warning Signs:**
```
⚠️ [Porto] Health check failed
⚠️ [FrenPet] Falling back to direct RPC
⚠️ Porto relayer health check failed
```

**Error Patterns:**
```
❌ [Porto] Failed to initialize
❌ [FrenPet] Transaction failed
❌ WagmiProviderNotFoundError (if present, Wagmi removal incomplete)
```

## 🐛 Common Issues & Fixes

### 1. Metro Bundler Issues
```bash
# Clear cache and restart
npx expo start --clear
npx react-native start --reset-cache
```

### 2. BigInt Serialization Error
- Already fixed in polyfills.ts
- If occurs, check polyfills are imported in index.ts

### 3. Crypto/Random Values Error
- Already polyfilled
- Verify expo-crypto is installed

### 4. Porto Connection Failed
- Check network connectivity
- Verify URL: https://rise-testnet-porto.fly.dev
- Test with: `node test-porto.js`

### 5. Android Build Issues
```bash
cd android
./gradlew clean
cd ..
npx expo run:android
```

## 📊 Performance Metrics

Monitor these in logs:
- Bundle size (should be < 5MB)
- JS bundle load time (< 3s)
- Porto health check time (< 1s)
- Transaction preparation time (< 2s)
- Transaction confirmation time (< 10s)

## 🎯 Expected Flow

1. **App Start** → Auto-generates wallet → Initializes Porto
2. **Home Screen** → Shows address & Porto status
3. **Pet Screen** → Create pet with gasless transaction
4. **Transaction** → Porto prepares → Signs → Sends → Monitors
5. **Success** → Pet created, UI updates

## 📝 Debug Commands

```bash
# View all React Native logs
adb logcat | grep ReactNative

# View Porto specific logs
adb logcat | grep Porto

# View all app logs
adb logcat | grep -E "(FrenPet|Porto|ReactNative)"

# Clear logs
adb logcat -c

# Save logs to file
adb logcat > debug-logs.txt
```

## 🔧 Environment Variables

If needed, set these before starting:
```bash
export DEBUG=expo:*
export EXPO_DEBUG=true
export NODE_ENV=development
```

## ✨ Success Criteria

The app is working correctly when:
1. ✅ Wallet auto-generates on first launch
2. ✅ Porto health check passes
3. ✅ Can create pet without gas fees
4. ✅ Transactions show "bundle ID" not "tx hash"
5. ✅ No crashes or unhandled errors