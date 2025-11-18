#!/bin/bash

echo "🔄 Retrying EAS Build for iOS"
echo "=============================="
echo ""
echo "The CocoaPods CDN error is usually transient."
echo "Retrying with a fresh build server..."
echo ""

# Retry the build
eas build --platform ios --profile production

echo ""
echo "If it fails again, try:"
echo "  eas build --platform ios --profile production --clear-cache"
