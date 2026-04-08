# Fix: Modular Header Include Error in @react-native-firebase/app

## Problem
Build fails with 6 errors like:
```
include of non-modular header inside framework module 'RNFBApp.RCTConvert_FIRApp': 
'/Users/mac/Documents/Projects/CediWise/cediwise-mobile-app/ios/Pods/Headers/Public/React-Core/React/RCTConvert.h'
```

## Root Cause
- `@react-native-firebase/app` imports React headers (`<React/RCTConvert.h>`, `<React/RCTBridgeModule.h>`, etc.)
- These headers are not treated as modular by the compiler
- React Native 0.81.5 + Expo 54 uses `React-Core-prebuilt` which doesn't provide proper module maps for these headers
- Without `use_frameworks! :static`, the Firebase pod builds as a static framework but tries to import headers that aren't modular

## Solution (Attempted: use_frameworks! :static — DID NOT WORK)
The `use_frameworks! :static` approach did not resolve the issue. The real fix is to build React Native from source instead of using the prebuilt binary.

### File to Edit
`/Users/mac/Documents/Projects/CediWise/cediwise-mobile-app/ios/Podfile.properties.json`

### Change
**Before:**
```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "newArchEnabled": "true"
}
```

**After:**
```json
{
  "expo.jsEngine": "hermes",
  "EX_DEV_CLIENT_NETWORK_INSPECTOR": "true",
  "newArchEnabled": "true",
  "ios.buildReactNativeFromSource": "true"
}
```

### Steps to Apply
1. Edit `ios/Podfile.properties.json` — add `"ios.buildReactNativeFromSource": "true"`
2. Run `cd ios && pod install` to regenerate the Pods (this will build React Native from source instead of using prebuilt binaries)
3. Run `npx expo run:ios` to rebuild

## Why This Works
Building React Native from source generates proper module maps for all React headers, which resolves the non-modular header import issue that `@react-native-firebase` encounters with the prebuilt core. The `ios.buildReactNativeFromSource` property is already checked in the Podfile at line 17-18 — setting it to `"true"` disables `RCT_USE_PREBUILT_RNCORE`.

## Tradeoff
Building from source increases initial build time (first build will take longer), but subsequent builds are cached. This is the recommended approach for projects using `@react-native-firebase` with Expo SDK 54+.
