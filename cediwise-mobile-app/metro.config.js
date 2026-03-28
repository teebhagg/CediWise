const { withUniwindConfig } = require("uniwind/metro");
const {
  getSentryExpoConfig
} = require("@sentry/react-native/metro");

const config = getSentryExpoConfig(__dirname);

module.exports = withUniwindConfig(config, {
  cssEntryFile: "./app/globals.css",
  dtsFile: "./uniwind-types.d.ts",
  polyfills: { rem: 16 },
});