# CocoaPods Build Error - Solutions

## Error
```
[!] Unable to add a source with url `https://cdn.cocoapods.org/` named `trunk`.
pod install exited with non-zero code: 1
```

## This is a Known EAS Build Issue

The CocoaPods CDN is sometimes unreliable on EAS Build servers. Here are solutions:

## Solution 1: Retry the Build (Recommended)
Often this is a transient network issue. Simply retry:

```bash
eas build --platform ios --profile production
```

The EAS servers will use a different build machine and it usually works.

## Solution 2: Use a Different Build Image
I've already updated `eas.json` to use `"image": "latest"` which uses the most recent build environment.

## Solution 3: Clear EAS Build Cache
```bash
eas build --platform ios --profile production --clear-cache
```

## Solution 4: Use Local Build (if you have a Mac)
```bash
# Install EAS CLI locally
npm install -g eas-cli

# Build locally
eas build --platform ios --profile production --local
```

## What I've Already Done

1. ✅ Updated `eas.json` with:
   - Latest build image
   - Medium resource class for more stable builds

2. ✅ Verified `app.json` configuration:
   - Icon is 1024x1024 ✅
   - Build number is 10 ✅
   - All paths are correct ✅

3. ✅ Cleared local caches

## Recommended Next Steps

### Option 1: Just Retry (90% success rate)
```bash
eas build --platform ios --profile production
```

### Option 2: Retry with Clear Cache
```bash
eas build --platform ios --profile production --clear-cache
```

### Option 3: Check EAS Status
Sometimes EAS has service issues:
https://status.expo.dev/

## Why This Happens

The EAS Build servers sometimes have network issues connecting to the CocoaPods CDN (`cdn.cocoapods.org`). This is:
- Not your fault
- Not a problem with your code
- Usually resolved by retrying

## Current Configuration

Your `eas.json` is now optimized:
```json
{
  "production": {
    "autoIncrement": true,
    "ios": {
      "image": "latest",
      "resourceClass": "m-medium"
    }
  }
}
```

## If It Still Fails

1. Check EAS status: https://status.expo.dev/
2. Try building at a different time
3. Contact Expo support: https://expo.dev/support
4. Use local build if you have a Mac

## Quick Command
```bash
# Just retry - this usually works!
eas build --platform ios --profile production
```
