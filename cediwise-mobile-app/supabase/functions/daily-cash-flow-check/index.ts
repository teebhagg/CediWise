/**
 * daily-cash-flow-check — Supabase Edge Function (Deno)
 *
 * Schedule: Cron at 06:00 daily (Africa/Accra time = UTC+0, so 06:00 UTC)
 * Purpose: Query users whose cash_flow_balance is set, compute days-to-runout
 *          server-side, and dispatch FCM push notifications for anyone ≤ 7 days.
 * Max 1 push per user per 48 hours for this notification type (N-02).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EXPO_ACCESS_TOKEN = Deno.env.get("EXPO_ACCESS_TOKEN") ?? "";

const DAYS_WARNING_THRESHOLD = 7;
const NOTIFICATION_COOLDOWN_HOURS = 48;
const NOTIFICATION_KIND = "N-02";

interface ProfileRow {
  id: string;
  cash_flow_balance: number | null;
  cash_flow_monthly_income: number | null;
  cash_flow_last_reset: string | null;
  timezone: string | null;
  notification_preferences: Record<string, unknown> | null;
}

interface PushDeviceRow {
  expo_push_token: string;
}

interface DeliveryLogRow {
  delivered_at: string;
}

Deno.serve(async (_req) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response(
      JSON.stringify({ error: "Missing Supabase env vars" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Fetch all users with cash flow set up (balance is not null)
  const { data: profiles, error: profileError } = await supabase
    .from("profiles")
    .select(
      "id,cash_flow_balance,cash_flow_monthly_income,cash_flow_last_reset,timezone,notification_preferences"
    )
    .not("cash_flow_balance", "is", null)
    .not("cash_flow_monthly_income", "is", null);

  if (profileError) {
    console.error("Failed to fetch profiles:", profileError.message);
    return new Response(
      JSON.stringify({ error: profileError.message }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }

  const notifications: Array<{ token: string; body: string }> = [];
  let checkedCount = 0;
  let notifyCount = 0;

  for (const profile of (profiles ?? []) as ProfileRow[]) {
    checkedCount++;

    const balance = Number(profile.cash_flow_balance ?? 0);
    const monthlyIncome = Number(profile.cash_flow_monthly_income ?? 0);

    if (balance <= 0 || monthlyIncome <= 0) continue;

    // Check if user has disabled N-02 notifications
    const prefs = profile.notification_preferences ?? {};
    if (prefs["N-02"] === false) continue;

    // Simple daily burn estimate: monthly_income / 30 (conservative estimate using income as proxy for spending)
    // For a more accurate figure the edge function would need transaction data; using income as burn proxy.
    const dailyBurnEstimate = monthlyIncome / 30;
    if (dailyBurnEstimate <= 0) continue;

    const daysRemaining = Math.floor(balance / dailyBurnEstimate);
    if (daysRemaining > DAYS_WARNING_THRESHOLD) continue;

    // Check cooldown: has a N-02 been sent in the last 48h?
    const cutoff = new Date(
      Date.now() - NOTIFICATION_COOLDOWN_HOURS * 60 * 60 * 1000
    ).toISOString();

    const { data: recentDeliveries } = await supabase
      .from("announcement_deliveries")
      .select("delivered_at")
      .eq("user_id", profile.id)
      .eq("announcement_id", NOTIFICATION_KIND)
      .gte("delivered_at", cutoff)
      .limit(1);

    if (recentDeliveries && recentDeliveries.length > 0) continue;

    // Fetch active push tokens for this user
    const { data: devices } = await supabase
      .from("push_devices")
      .select("expo_push_token")
      .eq("user_id", profile.id)
      .eq("is_active", true);

    if (!devices || devices.length === 0) continue;

    const body =
      daysRemaining === 0
        ? "⚠️ You may run out of money today. Review your spending now."
        : `⚠️ At current spending, you run out of money in ${daysRemaining} day${
            daysRemaining === 1 ? "" : "s"
          }.`;

    for (const device of devices as PushDeviceRow[]) {
      notifications.push({ token: device.expo_push_token, body });
    }

    // Log the delivery
    await supabase.from("announcement_deliveries").insert({
      user_id: profile.id,
      announcement_id: NOTIFICATION_KIND,
      delivered_at: new Date().toISOString(),
    });

    notifyCount++;
  }

  // Send push notifications via Expo Push API
  if (notifications.length > 0 && EXPO_ACCESS_TOKEN) {
    const messages = notifications.map(({ token, body }) => ({
      to: token,
      title: "CediWise",
      body,
      data: { deep_link: "/(tabs)/budget", notification_id: NOTIFICATION_KIND },
      sound: "default",
    }));

    try {
      await fetch("https://exp.host/--/api/v2/push/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${EXPO_ACCESS_TOKEN}`,
        },
        body: JSON.stringify(messages),
      });
    } catch (err) {
      console.error("Failed to send push notifications:", err);
    }
  }

  return new Response(
    JSON.stringify({
      checked: checkedCount,
      notified: notifyCount,
      pushes: notifications.length,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } }
  );
});
