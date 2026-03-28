/**
 * Backfills lesson content from bundledLessons.json into Supabase.
 * Run after applying 2026-02-22_lessons_content.sql.
 *
 * Run from cediwise-mobile-app:
 *   npx tsx scripts/backfill-lesson-content.ts
 *
 * Env: EXPO_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";

function loadEnv(envPath: string): Record<string, string> {
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf-8");
  const env: Record<string, string> = {};
  for (const line of raw.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx === -1) continue;
    const key = trimmed.slice(0, eqIdx).trim();
    const value = trimmed
      .slice(eqIdx + 1)
      .trim()
      .replace(/^["']|["']$/g, "");
    env[key] = value;
  }
  return env;
}

const appRoot = path.resolve(__dirname, "..");
const envPaths = [
  path.join(__dirname, ".env"),
  path.join(appRoot, ".env"),
  path.join(appRoot, ".env.local"),
];
const envVars = envPaths.reduce(
  (acc, p) => ({ ...acc, ...loadEnv(p) }),
  {} as Record<string, string>
);

const SUPABASE_URL =
  envVars.SUPABASE_URL ??
  envVars.EXPO_PUBLIC_SUPABASE_URL ??
  process.env.SUPABASE_URL ??
  process.env.EXPO_PUBLIC_SUPABASE_URL ??
  "";
const SUPABASE_SERVICE_ROLE_KEY =
  envVars.SUPABASE_SERVICE_ROLE_KEY ??
  process.env.SUPABASE_SERVICE_ROLE_KEY ??
  "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "\n❌  Missing EXPO_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.\n" +
      "    Add to cediwise-mobile-app/.env.local\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const bundledPath = path.join(appRoot, "content", "bundledLessons.json");

async function backfill(): Promise<void> {
  if (!fs.existsSync(bundledPath)) {
    console.error(`\n❌  bundledLessons.json not found at ${bundledPath}\n`);
    process.exit(1);
  }

  const bundled = JSON.parse(fs.readFileSync(bundledPath, "utf-8")) as Record<
    string,
    unknown
  >;

  const lessonIds = Object.keys(bundled);
  console.log(`\n📦  Backfilling content for ${lessonIds.length} lessons\n`);

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const lessonId of lessonIds) {
    const content = bundled[lessonId];
    if (!content || typeof content !== "object") {
      console.warn(`  ⚠  ${lessonId} — invalid content, skipping`);
      skipCount++;
      continue;
    }

    const { error } = await supabase
      .from("lessons")
      .update({ content: content as Record<string, unknown> })
      .eq("id", lessonId);

    if (error) {
      // Lesson may not exist yet
      if (error.code === "PGRST116" || error.message?.includes("0 rows")) {
        console.warn(
          `  ⚠  ${lessonId} — lesson not in DB, run seed:lessons first`
        );
        skipCount++;
      } else {
        console.error(`  ✗  ${lessonId} — ${error.message}`);
        errorCount++;
      }
    } else {
      console.log(`  ✓  ${lessonId}`);
      successCount++;
    }
  }

  console.log(`\n─────────────────────────────────────────────`);
  console.log(`  ✅  ${successCount} lessons updated with content`);
  if (skipCount > 0)
    console.log(`  ⚠  ${skipCount} skipped (not in DB or invalid)`);
  if (errorCount > 0) console.log(`  ❌  ${errorCount} errors`);
  console.log(`─────────────────────────────────────────────\n`);

  if (errorCount > 0) process.exit(1);
}

backfill().catch((err) => {
  console.error("\n❌  Unexpected error:", err);
  process.exit(1);
});
