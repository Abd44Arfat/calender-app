const { getDefaultConfig } = require('expo/metro-config');

// Use default config without modifications to avoid Metro cache issues
module.exports = getDefaultConfig(__dirname);
