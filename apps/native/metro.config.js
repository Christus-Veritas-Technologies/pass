const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// Limit concurrent transform workers to avoid EMFILE (too many open files) on Windows.
// Without this cap every worker calls readFileSync on uniwind-types.d.ts simultaneously,
// exhausting the process file-handle pool during large bundling runs.
config.maxWorkers = 4;

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});

module.exports = uniwindConfig;
