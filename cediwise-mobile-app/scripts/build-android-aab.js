#!/usr/bin/env node
/**
 * Builds Android App Bundle (AAB) via EAS for Play Store uploads.
 * Uses the production profile (android.buildType: "aab" in eas.json).
 * Usage: node scripts/build-android-aab.js [output-directory]
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

const expectedName = `CediWise-${version}.aab`;
const outputPath = path.join(outputDir, expectedName);

console.log(`Building CediWise AAB v${version} (Play Store)...`);
console.log(`Output: ${expectedName}`);
console.log(`Output directory: ${outputDir}\n`);

// Run EAS build with production profile (produces AAB)
execSync(
  `eas build --profile production --platform android --local --non-interactive --output "${outputPath}"`,
  { stdio: "inherit" }
);

// Find and rename the AAB (if needed)
const files = fs.readdirSync(outputDir);
const expectedPath = path.join(outputDir, expectedName);

if (fs.existsSync(expectedPath)) {
  console.log(`\nBuild complete: ${expectedName}`);
  console.log(`Full path: ${expectedPath}`);
} else {
  const aabFile = files.find(
    (f) => f.endsWith(".aab") && (f.startsWith("build-") || f.includes(version))
  );
  if (aabFile) {
    const oldPath = path.join(outputDir, aabFile);
    fs.renameSync(oldPath, expectedPath);
    console.log(`\nRenamed to: ${expectedName}`);
    console.log(`Full path: ${expectedPath}`);
  } else {
    const anyAab = files.find((f) => f.endsWith(".aab"));
    if (anyAab) {
      const oldPath = path.join(outputDir, anyAab);
      if (anyAab !== expectedName) {
        fs.renameSync(oldPath, expectedPath);
        console.log(`\nRenamed to: ${expectedName}`);
      }
      console.log(`Full path: ${expectedPath}`);
    } else {
      console.warn(
        "\nNo AAB found in output directory. Build may have failed."
      );
      process.exit(1);
    }
  }
}
