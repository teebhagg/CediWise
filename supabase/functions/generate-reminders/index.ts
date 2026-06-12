/**
 * generate-reminders — Supabase Edge Function (Deno)
 *
 * Schedule: Cron Sunday 00:00 UTC (weekly)
 * Purpose: Generate 2 AI-personalized reminders per user (Monday + Thursday) using Groq,
 *          stored in scheduled_reminders. Mobile app schedules fixed local notifications.
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

Your task: Generate 2 short, friendly push notification messages for the user — Monday (start-of-week check-in) and Thursday (mid-week check-in).

Each message should:
- Be 3-5 words for the title, 1 friendly sentence for the body (max 20 words)
- Use emojis naturally (💰📊🎯🔥👀✅💪📈⏰🎉)
- Feel like a helpful reminder from a friend, not a robot
- Reference the user's actual budget context when possible
- Be encouraging, warm, and culturally aware (Ghanaian users)
- Monday and Thursday copy must feel distinct (week start vs mid-week pulse)

RULES:
- Use ₵ symbol for amounts
- Never invent numbers not in context
- Keep it light and encouraging, not alarming

Return ONLY valid JSON matching this schema:
{
  "monday": { "title": "3-5 word title", "body": "1-sentence body" },
  "thursday": { "title": "3-5 word title", "body": "1-sentence body" }
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

  const rows: ReminderRow[] = [];
  for (const day of ["monday", "thursday"] as const) {
    const slot = reminders[day] as Record<string, unknown> | undefined;
    if (
      slot &&
      typeof slot.title === "string" &&
      typeof slot.body === "string" &&
      slot.title.trim() &&
      slot.body.trim()
    ) {
      rows.push({
        user_id: userId,
        title: slot.title.trim(),
        body: slot.body.trim(),
        deep_link: "/expenses",
        scheduled_day: day,
        week_label: weekLabel,
      });
    }
  }

  return rows;
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
        max_tokens: 500,
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

  const { data: existingReminders, error: eErr } = await supabase
    .from("scheduled_reminders")
    .select("user_id, scheduled_day")
    .eq("week_label", weekLabel);

  if (eErr) {
    console.error("Failed to fetch existing reminders:", eErr);
    return new Response(JSON.stringify(eErr), { status: 500 });
  }

  const daysByUser = new Map<string, Set<string>>();
  for (const row of existingReminders ?? []) {
    const r = row as { user_id: string; scheduled_day: string };
    if (!daysByUser.has(r.user_id)) daysByUser.set(r.user_id, new Set());
    daysByUser.get(r.user_id)!.add(r.scheduled_day);
  }

  const hasBothSlots = (userId: string) => {
    const days = daysByUser.get(userId);
    return days?.has("monday") && days?.has("thursday");
  };

  const eligibleUserIds = profileIds.filter((id) => !hasBothSlots(id));

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
