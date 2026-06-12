/**
 * generate-reminders — Supabase Edge Function (Deno)
 *
 * Schedule: Cron Sunday 00:00 UTC (weekly)
 * Purpose: Generate 1 AI-personalized weekly reminder per user using Groq,
 *          stored in scheduled_reminders (scheduled_day = monday).
 *          Mobile app schedules a single weekly local notification.
 *
 * Auth: x-internal-service-token must match CRON_SECRET (preferred) or
 *       SUPABASE_SERVICE_ROLE_KEY during rollout.
 */

import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assembleUserContext } from "../_shared/ai/aiContextAssembly.ts";
import { getISOWeekLabel } from "../_shared/isoWeekLabel.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const CRON_SECRET = (Deno.env.get("CRON_SECRET") ?? "").trim();
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";

const GROQ_FETCH_TIMEOUT_MS = 15_000;
const USER_CONCURRENCY = 8;
const PROFILE_PAGE_SIZE = 500;

const REMINDER_SYSTEM_PROMPT = `You are CediWise AI, a proactive financial assistant for Ghanaians.

Your task: Generate 1 short, friendly weekly push notification message for the user — a start-of-week expense check-in.

The message should:
- Be 3-5 words for the title, 1 friendly sentence for the body (max 20 words)
- Use emojis naturally (💰📊🎯🔥👀✅💪📈⏰🎉)
- Feel like a helpful reminder from a friend, not a robot
- Reference the user's actual budget context when possible
- Be encouraging, warm, and culturally aware (Ghanaian users)

RULES:
- Use ₵ symbol for amounts
- Never invent numbers not in context
- Keep it light and encouraging, not alarming

Return ONLY valid JSON matching this schema:
{
  "weekly": { "title": "3-5 word title", "body": "1-sentence body" }
}`;

type ReminderRow = {
  user_id: string;
  title: string;
  body: string;
  deep_link: string;
  scheduled_day: string;
  week_label: string;
};

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: "Unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json" },
  });
}

function assertInternalAuth(req: Request): boolean {
  const internalToken = (req.headers.get("x-internal-service-token") ?? "").trim();
  if (internalToken === "") return false;
  if (CRON_SECRET !== "") return internalToken === CRON_SECRET;
  return internalToken === SUPABASE_SERVICE_ROLE_KEY;
}

function parseGroqReminders(rawContent: string, userId: string, weekLabel: string): ReminderRow[] {
  let reminders: Record<string, unknown> = {};
  try {
    const parsed = JSON.parse(rawContent);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      reminders = parsed as Record<string, unknown>;
    }
  } catch {
    console.error(`Groq JSON.parse failed for user ${userId}`);
    return [];
  }

  const weekly = reminders.weekly as Record<string, unknown> | undefined;
  if (
    weekly &&
    typeof weekly.title === "string" &&
    typeof weekly.body === "string" &&
    weekly.title.trim() &&
    weekly.body.trim()
  ) {
    return [{
      user_id: userId,
      title: weekly.title.trim(),
      body: weekly.body.trim(),
      deep_link: "/expenses",
      scheduled_day: "monday",
      week_label: weekLabel,
    }];
  }

  return [];
}

async function callGroq(context: string, userId: string, weekLabel: string): Promise<ReminderRow[] | null> {
  const groqController = new AbortController();
  const groqFetchTimer = setTimeout(() => groqController.abort(), GROQ_FETCH_TIMEOUT_MS);

  try {
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          { role: "system", content: REMINDER_SYSTEM_PROMPT },
          { role: "user", content: context },
        ],
        response_format: { type: "json_object" },
        temperature: 0.7,
        max_tokens: 300,
      }),
      signal: groqController.signal,
    });

    if (!groqRes.ok) {
      console.error(`Groq error for user ${userId}:`, await groqRes.text());
      return null;
    }

    const groqData = await groqRes.json();
    const choices = Array.isArray(groqData?.choices) ? groqData.choices : null;
    const rawContent = typeof choices?.[0]?.message?.content === "string" ? choices[0].message.content : null;

    if (!rawContent) {
      console.error(`Groq missing content for user ${userId}`);
      return null;
    }

    return parseGroqReminders(rawContent, userId, weekLabel);
  } catch (fetchErr) {
    const aborted =
      fetchErr instanceof DOMException
        ? fetchErr.name === "AbortError"
        : fetchErr instanceof Error && fetchErr.name === "AbortError";
    console.error(
      aborted ? `Groq timeout for user ${userId}` : `Groq failed for user ${userId}:`,
      fetchErr,
    );
    return null;
  } finally {
    clearTimeout(groqFetchTimer);
  }
}

async function processUser(
  supabase: SupabaseClient,
  userId: string,
  weekLabel: string,
): Promise<number> {
  const { text: context } = await assembleUserContext(supabase, userId);
  const rows = await callGroq(context, userId, weekLabel);
  if (!rows || rows.length === 0) return 0;

  const { error: insertErr } = await supabase
    .from("scheduled_reminders")
    .upsert(rows, { onConflict: "user_id,week_label,scheduled_day", ignoreDuplicates: true });

  if (insertErr) {
    console.error(`Failed to upsert reminders for user ${userId}:`, insertErr);
    return 0;
  }

  return rows.length;
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = [];
  let index = 0;

  async function runNext(): Promise<void> {
    const current = index++;
    if (current >= items.length) return;
    results[current] = await worker(items[current]);
    await runNext();
  }

  const runners = Array.from({ length: Math.min(concurrency, items.length) }, () => runNext());
  await Promise.all(runners);
  return results;
}

async function fetchAllProfileIds(
  supabase: SupabaseClient,
): Promise<{ ids: string[]; error: unknown | null }> {
  const ids: string[] = [];
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id, notification_preferences")
      .not("notification_preferences->N-REMINDER", "eq", false)
      .range(offset, offset + PROFILE_PAGE_SIZE - 1);

    if (error) return { ids, error };
    const page = (data ?? []) as { id: string }[];
    ids.push(...page.map((p) => p.id));
    if (page.length < PROFILE_PAGE_SIZE) break;
    offset += PROFILE_PAGE_SIZE;
  }

  return { ids, error: null };
}

async function fetchActiveDeviceUserIds(supabase: SupabaseClient): Promise<Set<string>> {
  const userIds = new Set<string>();
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("push_devices")
      .select("user_id")
      .eq("is_active", true)
      .range(offset, offset + PROFILE_PAGE_SIZE - 1);

    if (error) {
      console.error("Failed to fetch push devices:", error);
      break;
    }

    const page = (data ?? []) as { user_id: string }[];
    for (const row of page) userIds.add(row.user_id);
    if (page.length < PROFILE_PAGE_SIZE) break;
    offset += PROFILE_PAGE_SIZE;
  }

  return userIds;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing environment variables" }), { status: 500 });
  }

  if (!assertInternalAuth(req)) {
    return unauthorized();
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const weekLabel = getISOWeekLabel(new Date());

  const { ids: profileIds, error: pErr } = await fetchAllProfileIds(supabase);
  if (pErr) {
    console.error("Failed to fetch profiles:", pErr);
    return new Response(JSON.stringify(pErr), { status: 500 });
  }

  const usersWithDevices = await fetchActiveDeviceUserIds(supabase);

  const { data: existingReminders, error: eErr } = await supabase
    .from("scheduled_reminders")
    .select("user_id")
    .eq("week_label", weekLabel);

  if (eErr) {
    console.error("Failed to fetch existing reminders:", eErr);
    return new Response(JSON.stringify(eErr), { status: 500 });
  }

  const usersWithReminders = new Set((existingReminders ?? []).map((r: { user_id: string }) => r.user_id));

  const eligibleUserIds = profileIds.filter(
    (id) => usersWithDevices.has(id) && !usersWithReminders.has(id),
  );

  const generatedCounts = await runWithConcurrency(
    eligibleUserIds,
    USER_CONCURRENCY,
    (userId) => processUser(supabase, userId, weekLabel),
  );

  const generatedCount = generatedCounts.reduce((sum, n) => sum + n, 0);

  return new Response(
    JSON.stringify({
      checked: eligibleUserIds.length,
      generated: generatedCount,
      week: weekLabel,
    }),
    { headers: { "Content-Type": "application/json" } },
  );
});
