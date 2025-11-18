#!/bin/bash

echo "🎨 Quack Plan Icon Preparation Script"
echo "======================================"
echo ""

# Check if icon exists
if [ ! -f "assets/images/quackplanicon.png" ]; then
    echo "❌ Error: quackplanicon.png not found in assets/images/"
    exit 1
fi

# Get icon dimensions
dimensions=$(file assets/images/quackplanicon.png | grep -o '[0-9]* x [0-9]*' | head -1)
echo "📏 Current icon dimensions: $dimensions"

# Check if ImageMagick is installed
if command -v convert &> /dev/null; then
    echo ""
    echo "✅ ImageMagick is installed"
    echo ""
    read -p "Do you want to automatically resize the icon to 1024x1024? (y/n) " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        # Backup original
        cp assets/images/quackplanicon.png assets/images/quackplanicon-backup.png
        echo "💾 Backup created: quackplanicon-backup.png"
        
        # Resize to 1024x1024 with white background
        convert assets/images/quackplanicon-backup.png \
            -resize 1024x1024 \
            -background white \
            -gravity center \
            -extent 1024x1024 \
            assets/images/quackplanicon.png
        
        echo "✅ Icon resized to 1024x1024!"
        echo "📏 New dimensions: $(file assets/images/quackplanicon.png | grep -o '[0-9]* x [0-9]*' | head -1)"
    fi
else
    echo ""
    echo "⚠️  ImageMagick not installed"
    echo "Please manually resize your icon to 1024x1024 pixels"
    echo ""
    echo "Options:"
    echo "1. Install ImageMagick: brew install imagemagick"
    echo "2. Use online tool: https://www.iloveimg.com/resize-image"
    echo "3. Use image editor (Photoshop, Figma, Canva)"
fi

echo ""
echo "📋 Next Steps:"
echo "1. Verify icon is 1024x1024 and square"
echo "2. Clear cache: rm -rf .expo ios android"
echo "3. Build: eas build --platform ios --profile production"
echo "4. Submit: eas submit --platform ios"
echo ""
