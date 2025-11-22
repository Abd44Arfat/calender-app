#!/bin/bash

echo "🚀 Building Quack Plan for iOS (Free Tier)"
echo "==========================================="
echo ""
echo "✅ Optimized for FREE tier (medium worker)"
echo "✅ Icon: 1024x1024 ✓"
echo "✅ Build number: 11"
echo "✅ Memory optimized: 3GB Node.js"
echo "✅ Caching enabled"
echo ""

# Ask build type
echo "Select build type:"
echo "1) Cloud build (EAS servers - free tier)"
echo "2) Local build (your Mac - requires Xcode)"
read -p "Enter choice (1-2): " choice

case $choice in
    1)
        echo ""
        echo "🌐 Building on EAS cloud..."
        echo ""
        eas build --platform ios --profile production
        ;;
    2)
        echo ""
        echo "💻 Building locally on your Mac..."
        echo ""
        # Check if Xcode is installed
        if ! command -v xcodebuild &> /dev/null; then
            echo "❌ Xcode not found!"
            echo "Please install Xcode from the App Store"
            exit 1
        fi
        eas build --platform ios --profile production --local
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "Build complete!"
echo ""
echo "Next step: Submit to TestFlight"
echo "  eas submit --platform ios"
