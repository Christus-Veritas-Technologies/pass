module.exports = function (api) {
  api.cache(true);

  const isProd = process.env.NODE_ENV === "production" || process.env.EXPO_PUBLIC_APP_ENV === "production";

  return {
    presets: ["babel-preset-expo"],
    plugins: [
      // Required for react-native-reanimated — must be last
      "react-native-reanimated/plugin",
      // Strip all console.* calls from production bundles
      ...(isProd ? [["transform-remove-console", { exclude: ["error", "warn"] }]] : []),
    ],
  };
};
