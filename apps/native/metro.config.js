// Patch Node's fs with graceful-fs before Metro opens any file handles.
// This queues concurrent open() calls instead of failing with EMFILE on Windows.
const fs = require("fs");
require("graceful-fs").gracefulify(fs);

const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Keep worker count low to reduce simultaneous file handles on Windows.
config.maxWorkers = 2;

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});

module.exports = uniwindConfig;
