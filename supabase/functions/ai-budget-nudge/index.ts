import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assembleUserContext } from "../_shared/ai/aiContextAssembly.ts";
import { NUDGE_SYSTEM_PROMPT } from "../_shared/ai/aiPromptTemplates.ts";

/**
 * ai-budget-nudge — Proactive AI budget assistant
 * 
 * Purpose: Analyze users' budget data in the background and send helpful nudges
 *          via push notification when risks or opportunities are detected.
 */

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN") ?? "";
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY") ?? "";

const NOTIFICATION_KIND = "N-AI-NUDGE";
const COOLDOWN_HOURS = 72; // Don't nudge the same user more than once every 3 days
const GROQ_FETCH_TIMEOUT_MS = 10_000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY || !GROQ_API_KEY) {
    return new Response(JSON.stringify({ error: "Missing environment variables" }), { status: 500 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // 1. Fetch users with push tokens who haven't opted out of AI nudges
  // Note: For scalability, we limit this to 500 profiles for now to prevent OOM
  // A production robust approach would paginate this via a cursor or separate worker chunks.
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("id, notification_preferences")
    .not("notification_preferences->N-AI-NUDGE", "eq", false)
    .limit(500);

  if (pErr) {
    console.error("Failed to fetch profiles:", pErr);
    return new Response(JSON.stringify(pErr), { status: 500 });
  }

  let checkedCount = 0;
  let nudgeCount = 0;
  let pushCount = 0;

  for (const profile of profiles) {
    try {
      // 2. Cooldown check: has any nudge been sent in the last X hours?
      const cutoff = new Date(Date.now() - COOLDOWN_HOURS * 60 * 60 * 1000).toISOString();
      const { data: recent } = await supabase
        .from("announcement_deliveries")
        .select("id")
        .eq("user_id", profile.id)
        .eq("announcement_id", NOTIFICATION_KIND)
        .gte("delivered_at", cutoff)
        .limit(1);

      if (recent && recent.length > 0) continue;

      checkedCount++;

      // 3. Assemble budget context
      const { text: context, cycleId } = await assembleUserContext(supabase, profile.id);
      if (!cycleId) continue;

      // 4. Require active push devices before calling Groq (avoid LLM cost when nothing can be delivered)
      const { data: devices } = await supabase
        .from("push_devices")
        .select("expo_push_token")
        .eq("user_id", profile.id)
        .eq("is_active", true);

      if (!devices || devices.length === 0) continue;

      // 5. Call Groq to decide if a nudge is worthy
      const groqController = new AbortController();
      const groqFetchTimer = setTimeout(() => groqController.abort(), GROQ_FETCH_TIMEOUT_MS);
      let groqRes: Response;
      try {
        groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
          },
          body: JSON.stringify({
            model: "llama-3.1-8b-instant",
            messages: [
              { role: "system", content: NUDGE_SYSTEM_PROMPT },
              { role: "user", content: context },
            ],
            response_format: { type: "json_object" },
            temperature: 0.1,
            max_tokens: 500,
          }),
          signal: groqController.signal,
        });
      } catch (fetchErr) {
        const aborted =
          fetchErr instanceof DOMException
            ? fetchErr.name === "AbortError"
            : fetchErr instanceof Error && fetchErr.name === "AbortError";
        console.error(
          aborted ? `Groq fetch timeout for user ${profile.id}` : `Groq fetch failed for user ${profile.id}:`,
          fetchErr,
        );
        continue;
      } finally {
        clearTimeout(groqFetchTimer);
      }

      if (!groqRes.ok) {
        console.error(`Groq error for user ${profile.id}:`, await groqRes.text());
        continue;
      }

      let groqData: unknown;
      try {
        groqData = await groqRes.json();
      } catch (jsonErr) {
        console.error(`Groq response body JSON invalid for user ${profile.id}:`, jsonErr);
        continue;
      }

      const choices =
        groqData !== null &&
          typeof groqData === "object" &&
          "choices" in groqData &&
          Array.isArray((groqData as { choices: unknown }).choices)
          ? (groqData as { choices: unknown[] }).choices
          : null;

      const first = choices && choices.length > 0 ? choices[0] : null;
      const msgObj =
        first !== null &&
          typeof first === "object" &&
          first !== null &&
          "message" in first &&
          typeof (first as { message: unknown }).message === "object" &&
          (first as { message: unknown }).message !== null
          ? (first as { message: { content?: unknown } }).message
          : null;

      const rawContent =
        typeof msgObj?.content === "string" ? msgObj.content : null;

      if (rawContent === null) {
        console.error(
          `Groq missing assistant content for user ${profile.id}`,
          "payload:",
          typeof groqData === "object" ? JSON.stringify(groqData).slice(0, 800) : String(groqData),
        );
      }

      let nudge: Record<string, unknown> = {};
      if (rawContent !== null && rawContent.trim() !== "") {
        try {
          const parsed = JSON.parse(rawContent) as unknown;
          if (parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)) {
            nudge = parsed as Record<string, unknown>;
          } else {
            console.error(
              `Groq content JSON root not object for user ${profile.id}, raw:`,
              rawContent.slice(0, 800),
            );
          }
        } catch (parseErr) {
          console.error(
            `Groq content JSON.parse failed for user ${profile.id}:`,
            parseErr,
            "raw:",
            rawContent.slice(0, 800),
          );
        }
      }

      const initialMessage =
        typeof nudge.initial_message === "string" ? nudge.initial_message : "";

      if (
        nudge.should_nudge === true &&
        typeof nudge.title === "string" &&
        typeof nudge.body === "string" &&
        nudge.title.trim() !== "" &&
        nudge.body.trim() !== ""
      ) {
        // 6. Dispatch push notifications via Expo
        if (EXPO_ACCESS_TOKEN) {
          nudgeCount++;

          const messages = devices.map((d: any) => ({
            to: d.expo_push_token,
            title: nudge.title as string,
            body: nudge.body as string,
            data: {
              deep_link: `/budget/ai-chat?initialMessage=${encodeURIComponent(initialMessage)}`,
              notification_id: NOTIFICATION_KIND,
            },
            sound: "default",
          }));

          // Add timeout to prevent hanging requests
          const timeout = setTimeout(() => {
            console.error(`Timeout sending push notifications to user ${profile.id}`);
          }, 10000);

          try {
            const expoRes = await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
              },
              body: JSON.stringify(messages),
            });

            if (expoRes.ok) {
              pushCount += messages.length;

              // 7. Log delivery
              const { error: deliveryErr } = await supabase.from("announcement_deliveries").insert({
                user_id: profile.id,
                announcement_id: NOTIFICATION_KIND,
                delivered_at: new Date().toISOString(),
              });

              if (deliveryErr) {
                console.error(`Failed to log delivery for user ${profile.id}:`, deliveryErr);
              }
            } else {
              console.error(`Expo error for user ${profile.id}:`, await expoRes.text());
            }
          } finally {
            clearTimeout(timeout);
          }
        }
      }
    } catch (err) {
      console.error(`Error processing nudge for user ${profile.id}:`, err);
    }
  }

  return new Response(
    JSON.stringify({
      checked: checkedCount,
      nudges: nudgeCount,
      pushes: pushCount,
    }),
    { headers: { "Content-Type": "application/json" } }
  );
});
