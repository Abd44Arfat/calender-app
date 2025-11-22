#!/bin/bash

echo "🚀 Quack Plan - Build & Submit Script"
echo "======================================"
echo ""

# Verify icon is square
dimensions=$(file assets/images/quackplanicon.png | grep -o '[0-9]* x [0-9]*' | head -1)
echo "📏 Icon dimensions: $dimensions"

if [[ $dimensions != "1024 x 1024" ]]; then
    echo "❌ Error: Icon must be 1024x1024 pixels"
    echo "Current: $dimensions"
    exit 1
fi

echo "✅ Icon is correct size (1024x1024)"
echo ""

# Clear caches
echo "🧹 Clearing caches..."
rm -rf .expo
rm -rf ios
rm -rf android
echo "✅ Caches cleared"
echo ""

# Ask which platform to build
echo "Select platform to build:"
echo "1) iOS only"
echo "2) Android only"
echo "3) Both"
read -p "Enter choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🍎 Building for iOS..."
        eas build --platform ios --profile production
        
        read -p "Submit to TestFlight? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📤 Submitting to TestFlight..."
            eas submit --platform ios
        fi
        ;;
    2)
        echo ""
        echo "🤖 Building for Android..."
        eas build --platform android --profile production
        
        read -p "Submit to Google Play? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📤 Submitting to Google Play..."
            eas submit --platform android
        fi
        ;;
    3)
        echo ""
        echo "🍎🤖 Building for both platforms..."
        eas build --platform all --profile production
        
        read -p "Submit to both stores? (y/n) " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Yy]$ ]]; then
            echo "📤 Submitting to TestFlight..."
            eas submit --platform ios
            echo "📤 Submitting to Google Play..."
            eas submit --platform android
        fi
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Done!"
