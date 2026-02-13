#!/usr/bin/env node
/**
 * Builds Android APK via EAS and renames output to CediWise-{version}.apk
 * Usage: node scripts/build-android.js [output-directory]
 * Default output: ./dist
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const outputDir = path.resolve(process.cwd(), process.argv[2] || "dist");
const appConfigPath = path.join(process.cwd(), "app.json");

// Read version from app.json
const appConfig = JSON.parse(fs.readFileSync(appConfigPath, "utf8"));
const version = appConfig?.expo?.version ?? "0.0.1";

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

console.log(`Building CediWise v${version}...`);
console.log(`Output directory: ${outputDir}\n`);

const outputPath = path.join(outputDir, `CediWise-${version}.apk`);

// Run EAS build
execSync(
  `eas build --profile production --platform android --local --output "${outputPath}"`,
  { stdio: "inherit" }
);

// Find and rename the APK
const files = fs.readdirSync(outputDir);
const apkFile = files.find((f) => f.endsWith(".apk") && f.startsWith("build-"));

if (apkFile) {
  const oldPath = path.join(outputDir, apkFile);
  const newName = `CediWise-${version}.apk`;
  const newPath = path.join(outputDir, newName);

  fs.renameSync(oldPath, newPath);
  console.log(`\nRenamed to: ${newName}`);
  console.log(`Full path: ${newPath}`);
} else {
  console.warn(
    "\nNo build-*.apk found in output directory. Build may have failed."
  );
  process.exit(1);
}
