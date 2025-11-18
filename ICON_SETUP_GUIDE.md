# App Icon Setup Guide for Quack Plan

## Current Issue
Your `quackplanicon.png` is **256x285 pixels** (not square). App icons MUST be square.

## Requirements
- **iOS**: 1024x1024 pixels (PNG, no transparency)
- **Android**: 1024x1024 pixels (PNG, can have transparency)
- **Format**: PNG
- **Shape**: Perfect square

## Steps to Fix

### 1. Create a Square Icon
You need to resize/crop your `quackplanicon.png` to be square (1024x1024 pixels).

Options:
- Use an image editor (Photoshop, Figma, Canva)
- Use online tool: https://www.iloveimg.com/resize-image
- Use ImageMagick: `convert quackplanicon.png -resize 1024x1024 -background white -gravity center -extent 1024x1024 icon-1024.png`

### 2. Replace the Icon
Once you have a square 1024x1024 icon:
```bash
# Replace the current icon
cp your-new-square-icon.png assets/images/quackplanicon.png
```

### 3. Clear All Caches (ALREADY DONE)
```bash
rm -rf .expo
rm -rf ios android
npx expo prebuild --clean
```

### 4. Build with EAS
```bash
# For iOS
eas build --platform ios --profile production

# For Android
eas build --platform android --profile production
```

### 5. Submit to TestFlight
```bash
eas submit --platform ios
```

## Current Configuration (app.json)
✅ Icon path is correct: `./assets/images/quackplanicon.png`
✅ Build number incremented to: 10
✅ Splash screen configured
✅ iOS and Android icons configured

## Important Notes
- The icon MUST be square before building
- EAS Build will fail or generate incorrect icons if the source is not square
- Always clear cache before building with a new icon
- The buildNumber has been incremented to ensure a fresh build

## Next Steps
1. Create a square 1024x1024 version of your icon
2. Replace `assets/images/quackplanicon.png` with the square version
3. Run: `eas build --platform ios --profile production`
4. Run: `eas submit --platform ios`
