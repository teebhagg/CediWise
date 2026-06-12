/**
 * Idempotent seed script — upserts all 34 FLM lessons to Supabase.
 * Uses LESSON_DEFS from constants/lessons.ts as the source of truth.
 *
 * Run from cediwise-mobile-app:
 *   npm run seed:lessons
 *
 * Env: checks .env and .env.local. Needs EXPO_PUBLIC_SUPABASE_URL and
 *      SUPABASE_SERVICE_ROLE_KEY (from Supabase dashboard → Settings → API).
 */

import { createClient } from "@supabase/supabase-js";
import * as fs from "fs";
import * as path from "path";
import { LESSON_DEFS } from "../constants/lessons";

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
    "\n❌  Missing SUPABASE_URL (or EXPO_PUBLIC_SUPABASE_URL) or SUPABASE_SERVICE_ROLE_KEY.\n" +
    "    Add to cediwise-mobile-app/.env.local:\n" +
    "      SUPABASE_URL=... (or EXPO_PUBLIC_SUPABASE_URL)\n" +
    "      SUPABASE_SERVICE_ROLE_KEY=... (Supabase → Settings → API)\n"
  );
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function seedLessons(): Promise<void> {
  console.log(`\n🌱  Seeding ${LESSON_DEFS.length} lessons to Supabase\n`);

  let successCount = 0;
  let errorCount = 0;

  for (const lesson of LESSON_DEFS) {
    const row = {
      id: lesson.id,
      title: lesson.title,
      module: lesson.module,
      difficulty: lesson.difficulty,
      duration_minutes: lesson.duration_minutes,
      languages: lesson.languages,
      tags: lesson.tags,
      content_url: lesson.content_url,
      calculator_id: lesson.calculator_id,
      sources: lesson.sources,
      verified_by: lesson.verified_by,
      version: lesson.version,
      last_updated: new Date(lesson.last_updated).toISOString(),
    };

    const { error } = await supabase
      .from("lessons")
      .upsert(row, { onConflict: "id" });

    if (error) {
      console.error(`  ✗  ${lesson.id} — ${error.message}`);
      errorCount++;
    } else {
      console.log(`  ✓  ${lesson.id}  (${lesson.module} · ${lesson.title})`);
      successCount++;
    }
  }

  console.log(`\n─────────────────────────────────────────────`);
  console.log(`  ✅  ${successCount} lessons upserted successfully`);
  if (errorCount > 0) {
    console.log(`  ❌  ${errorCount} lessons failed`);
  }
  console.log(`─────────────────────────────────────────────\n`);

  if (errorCount > 0) process.exit(1);
}

seedLessons().catch((err) => {
  console.error("\n❌  Unexpected error:", err);
  process.exit(1);
});
