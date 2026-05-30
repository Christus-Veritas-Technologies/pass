// Patch Node's fs with graceful-fs before Metro opens any file handles.
// This queues concurrent open() calls instead of failing with EMFILE on Windows.
const fs = require("fs");
require("graceful-fs").gracefulify(fs);

const path = require("path");
const { getDefaultConfig } = require("expo/metro-config");
const { withUniwindConfig } = require("uniwind/metro");
const { wrapWithReanimatedMetroConfig } = require("react-native-reanimated/metro-config");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// ── Windows EMFILE ("too many open files") mitigations ───────────────────────
//
// Root cause: Metro opens thousands of file handles simultaneously for its
// file-watcher index and transform cache. Windows defaults to ~512 handles
// per Node.js process; the OS Temp folder adds extra I/O contention.
//
// Fixes applied:
//  1. maxWorkers = 1  — each extra worker spawns an independent file-handle pool
//  2. fileMapCacheDirectory — move the file-map cache out of %TEMP% into the
//     project directory. %TEMP% is on the same volume as system files and gets
//     hammered by other processes; a local project path is consistently faster
//     and avoids handle starvation.

config.maxWorkers = 1;

// Move the metro-file-map cache from %TEMP% to a project-local directory.
// Metro will auto-create this directory on first run.
config.fileMapCacheDirectory = path.join(__dirname, ".metro-file-map-cache");

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});

module.exports = uniwindConfig;
