// ── EMFILE guard — must run before any other require ────────────────────────
// graceful-fs patches the callback-based fs API.
// Metro's newer code and the uniwind transformer use fs.promises, which
// graceful-fs does NOT cover. We manually rate-limit readFile on the promises
// API so Windows never opens more handles than it can hold at once.
const fs = require("fs");
require("graceful-fs").gracefulify(fs);

(function patchFsPromises() {
  const fsp = fs.promises;
  const _readFile = fsp.readFile.bind(fsp);
  const LIMIT = 64; // concurrent reads allowed at once
  let active = 0;
  const queue = [];

  function next() {
    if (queue.length === 0 || active >= LIMIT) return;
    active++;
    const { args, resolve, reject } = queue.shift();
    _readFile(...args).then(
      (v) => { active--; resolve(v); next(); },
      (e) => { active--; reject(e); next(); },
    );
  }

  fsp.readFile = (...args) =>
    new Promise((resolve, reject) => {
      queue.push({ args, resolve, reject });
      next();
    });
})();

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

// ── Production bundle optimisations ──────────────────────────────────────────
// inlineRequires defers module evaluation until first use — measurably reduces
// JS parse time and startup latency on real devices.
config.transformer = {
  ...config.transformer,
  getTransformOptions: async () => ({
    transform: {
      experimentalImportSupport: false,
      inlineRequires: true,
    },
  }),
};

// Exclude test/story files from the production bundle.
config.resolver = {
  ...config.resolver,
  blockList: [
    /\.test\.[jt]sx?$/,
    /\.spec\.[jt]sx?$/,
    /\/__tests__\//,
    /\/\.storybook\//,
  ],
};

const uniwindConfig = withUniwindConfig(wrapWithReanimatedMetroConfig(config), {
  cssEntryFile: "./global.css",
  dtsFile: "./uniwind-types.d.ts",
});

module.exports = uniwindConfig;
