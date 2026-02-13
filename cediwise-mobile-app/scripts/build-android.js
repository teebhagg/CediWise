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
  `eas build --profile production --platform android --local --non-interactive --output "${outputPath}"`,
  { stdio: "inherit" }
);

// Find and rename the APK (if needed)
const files = fs.readdirSync(outputDir);
const expectedName = `CediWise-${version}.apk`;
const expectedPath = path.join(outputDir, expectedName);

// EAS may output directly as CediWise-{version}.apk when --output is a file path
if (fs.existsSync(expectedPath)) {
  console.log(`\nBuild complete: ${expectedName}`);
  console.log(`Full path: ${expectedPath}`);
} else {
  // Otherwise look for build-*.apk and rename
  const apkFile = files.find(
    (f) => f.endsWith(".apk") && f.startsWith("build-")
  );
  if (apkFile) {
    const oldPath = path.join(outputDir, apkFile);
    fs.renameSync(oldPath, expectedPath);
    console.log(`\nRenamed to: ${expectedName}`);
    console.log(`Full path: ${expectedPath}`);
  } else {
    // Fallback: any .apk in output dir
    const anyApk = files.find((f) => f.endsWith(".apk"));
    if (anyApk) {
      const oldPath = path.join(outputDir, anyApk);
      if (anyApk !== expectedName) {
        fs.renameSync(oldPath, expectedPath);
        console.log(`\nRenamed to: ${expectedName}`);
      }
      console.log(`Full path: ${expectedPath}`);
    } else {
      console.warn(
        "\nNo APK found in output directory. Build may have failed."
      );
      process.exit(1);
    }
  }
}
