#!/bin/bash

echo "🍎 Quack Plan - Local Build & TestFlight Upload"
echo "==============================================="
echo ""

# Check if Xcode is installed
if ! command -v xcodebuild &> /dev/null; then
    echo "❌ Xcode not found!"
    echo ""
    echo "Please install Xcode:"
    echo "1. Open App Store"
    echo "2. Search for 'Xcode'"
    echo "3. Install (it's free but large ~15GB)"
    echo ""
    echo "Or install command line tools only:"
    echo "  xcode-select --install"
    exit 1
fi

echo "✅ Xcode found: $(xcodebuild -version | head -1)"
echo ""

# Check if EAS CLI is installed
if ! command -v eas &> /dev/null; then
    echo "❌ EAS CLI not found!"
    echo ""
    echo "Installing EAS CLI..."
    npm install -g eas-cli
    echo ""
fi

echo "✅ EAS CLI ready"
echo ""

# Show configuration
echo "📋 Build Configuration:"
echo "  • App: Quack Plan v1"
echo "  • Build: #11"
echo "  • Icon: 1024x1024 ✓"
echo "  • Platform: iOS"
echo "  • Type: Local build"
echo ""

# Confirm
read -p "Start local build? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Build cancelled"
    exit 0
fi

echo ""
echo "🔨 Building locally..."
echo "This will take 10-20 minutes..."
echo ""

# Build locally
eas build --platform ios --profile production --local

# Check if build succeeded
if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Build completed successfully!"
    echo ""
    
    # Ask about TestFlight
    read -p "Submit to TestFlight now? (y/n) " -n 1 -r
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        echo ""
        echo "📤 Submitting to TestFlight..."
        echo ""
        echo "You'll need:"
        echo "  • Your Apple ID (developer account email)"
        echo "  • App-specific password (if using 2FA)"
        echo ""
        echo "Generate app-specific password at:"
        echo "  https://appleid.apple.com/account/manage"
        echo ""
        
        # Submit
        eas submit --platform ios
        
        if [ $? -eq 0 ]; then
            echo ""
            echo "🎉 Success! Your app is uploaded to TestFlight!"
            echo ""
            echo "Next steps:"
            echo "1. Go to https://appstoreconnect.apple.com"
            echo "2. Wait 5-30 minutes for Apple to process"
            echo "3. Add testers in TestFlight tab"
            echo "4. Distribute to testers"
            echo ""
        else
            echo ""
            echo "❌ TestFlight submission failed"
            echo ""
            echo "You can try again manually:"
            echo "  eas submit --platform ios"
            echo ""
        fi
    else
        echo ""
        echo "Build complete! Submit later with:"
        echo "  eas submit --platform ios"
        echo ""
    fi
else
    echo ""
    echo "❌ Build failed"
    echo ""
    echo "Common issues:"
    echo "1. Xcode not properly installed"
    echo "2. Apple Developer account not configured"
    echo "3. Signing certificates issue"
    echo ""
    echo "Try:"
    echo "  • Open Xcode and accept license"
    echo "  • Sign in with Apple ID in Xcode Settings"
    echo "  • Run: eas build --platform ios --profile production --local"
    echo ""
fi
