const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// expo-sqlite en mode web : SQLite compilé en wasm. Les en-têtes COOP/COEP que la doc ajoute ne
// servent qu'aux API synchrones (SharedArrayBuffer), que Jardo n'utilise pas.
config.resolver.assetExts.push('wasm');

module.exports = config;
