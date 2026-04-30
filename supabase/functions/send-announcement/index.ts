/**
 * send-announcement — Supabase Edge Function (Deno)
 *
 * Triggered by the admin dashboard after inserting a queued row in announcement_campaigns.
 * Body: { "campaign_id": "<uuid>" }
 *
 * Sends Expo push to all active devices (audience all) or devices for target_user_id (single_user).
 * Requires EXPO_ACCESS_TOKEN for Expo Push API.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN") ?? "";

type CampaignRow = {
  id: string;
  title: string;
  body: string;
  deep_link: string | null;
  audience_type: string;
  target_user_id: string | null;
  status: string;
};

type PushDevice = { expo_push_token: string };

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase configuration" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  let campaignId: string;
  try {
    const json = await req.json();
    campaignId = typeof json?.campaign_id === "string" ? json.campaign_id : "";
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  if (!campaignId) {
    return new Response(JSON.stringify({ error: "campaign_id required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  const { data: campaign, error: loadError } = await supabase
    .from("announcement_campaigns")
    .select(
      "id, title, body, deep_link, audience_type, target_user_id, status"
    )
    .eq("id", campaignId)
    .maybeSingle();

  if (loadError || !campaign) {
    return new Response(
      JSON.stringify({ error: loadError?.message ?? "Campaign not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const row = campaign as CampaignRow;

  await supabase
    .from("announcement_campaigns")
    .update({ status: "sending" })
    .eq("id", row.id);

  let deviceQuery = supabase
    .from("push_devices")
    .select("expo_push_token")
    .eq("is_active", true);

  if (row.audience_type === "single_user" && row.target_user_id) {
    deviceQuery = deviceQuery.eq("user_id", row.target_user_id);
  }

  const { data: devices, error: devError } = await deviceQuery;

  if (devError) {
    await supabase
      .from("announcement_campaigns")
      .update({
        status: "failed",
        error_message: devError.message,
      })
      .eq("id", row.id);

    return new Response(JSON.stringify({ error: devError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const tokens = (devices ?? []) as PushDevice[];
  const uniqueTokens = [...new Set(tokens.map((d) => d.expo_push_token))];

  if (uniqueTokens.length === 0 || !EXPO_ACCESS_TOKEN) {
    await supabase
      .from("announcement_campaigns")
      .update({
        status: uniqueTokens.length === 0 ? "sent" : "failed",
        sent_at: new Date().toISOString(),
        attempted_count: 0,
        success_count: 0,
        failure_count: 0,
        error_message:
          uniqueTokens.length === 0
            ? null
            : "EXPO_ACCESS_TOKEN is not configured",
      })
      .eq("id", row.id);

    return new Response(
      JSON.stringify({
        status: uniqueTokens.length === 0 ? "sent" : "failed",
        attempted: 0,
        success: 0,
        failure: 0,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  }

  const deepLink =
    row.deep_link && row.deep_link.startsWith("/") ? row.deep_link : "/";

  const messages = uniqueTokens.map((to) => ({
    to,
    title: row.title,
    body: row.body,
    data: { deep_link: deepLink, type: "admin_announcement" },
    sound: "default" as const,
  }));

  let success = 0;
  let failure = 0;

  const chunkSize = 100;
  for (let i = 0; i < messages.length; i += chunkSize) {
    const chunk = messages.slice(i, i + chunkSize);
    try {
      const res = await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(chunk),
      });

      const payload = await res.json().catch(() => ({}));
      const tickets = (payload as { data?: unknown }).data;
      if (Array.isArray(tickets)) {
        for (const t of tickets) {
          const st = (t as { status?: string })?.status;
          if (st === "ok") success += 1;
          else failure += 1;
        }
      } else {
        failure += chunk.length;
      }
    } catch {
      failure += chunk.length;
    }
  }

  const attempted = uniqueTokens.length;

  await supabase
    .from("announcement_campaigns")
    .update({
      status: "sent",
      sent_at: new Date().toISOString(),
      attempted_count: attempted,
      success_count: success,
      failure_count: failure,
      error_message: failure > 0 && success === 0 ? "All push deliveries failed" : null,
    })
    .eq("id", row.id);

  return new Response(
    JSON.stringify({
      status: "sent",
      attempted,
      success,
      failure,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
