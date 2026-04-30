/**
 * Expire subscriptions after grace_period_end; move overdue MoMo renewals into grace.
 * ENABLE_AUTO_DOWNGRADE=true required (default off for rollout week 1).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
};

function graceEndIso(graceDays: number): string {
  const d = new Date();
  d.setTime(d.getTime() + graceDays * 86400000);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const enabled = Deno.env.get("ENABLE_AUTO_DOWNGRADE") === "true";
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  if (!enabled) {
    return new Response(
      JSON.stringify({
        ok: true,
        skipped: true,
        reason: "ENABLE_AUTO_DOWNGRADE is not true",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const now = new Date().toISOString();

    const { data: momoOverdue, error: momoErr } = await admin
      .from("subscriptions")
      .select("user_id, plan, grace_period_days")
      .eq("status", "active")
      .eq("payment_preference", "momo")
      .neq("plan", "free")
      .not("next_billing_date", "is", null)
      .lt("next_billing_date", now);

    if (momoErr) throw new Error(momoErr.message);

    let cadenceApplied = 0;
    let cadenceCandidates = 0;
    const { data: cadenceDue, error: cadErr } = await admin
      .from("subscriptions")
      .select("user_id, pending_billing_cycle")
      .eq("status", "active")
      .neq("plan", "free")
      .not("pending_billing_cycle", "is", null)
      .not("current_period_end", "is", null)
      .lt("current_period_end", now);

    if (cadErr) {
      console.warn("[subscription-janitor] cadence query", cadErr.message);
    } else {
      cadenceCandidates = cadenceDue?.length ?? 0;
      for (const row of cadenceDue ?? []) {
        const nextCycle = row.pending_billing_cycle;
        if (!nextCycle) continue;
        const { error: cUp } = await admin
          .from("subscriptions")
          .update({
            billing_cycle: nextCycle,
            pending_billing_cycle: null,
            updated_at: now,
          })
          .eq("user_id", row.user_id)
          .eq("status", "active");

        if (!cUp) cadenceApplied++;
      }
    }

    let momoGraceStarted = 0;
    for (const row of momoOverdue ?? []) {
      const graceDays = row.grace_period_days ?? 5;
      const { error: upErr } = await admin
        .from("subscriptions")
        .update({
          status: "grace_period",
          last_payment_failed_at: now,
          grace_period_end: graceEndIso(graceDays),
          updated_at: now,
        })
        .eq("user_id", row.user_id)
        .eq("status", "active");

      if (!upErr) momoGraceStarted++;
    }

    const { data: due, error: selErr } = await admin
      .from("subscriptions")
      .select("user_id, plan, grace_period_end")
      .eq("status", "grace_period")
      .not("grace_period_end", "is", null)
      .lt("grace_period_end", now);

    if (selErr) throw new Error(selErr.message);

    let downgraded = 0;
    for (const row of due ?? []) {
      const { error: upErr } = await admin
        .from("subscriptions")
        .update({
          plan: "free",
          status: "expired",
          grace_period_end: null,
          last_payment_failed_at: null,
          next_billing_date: null,
          cancel_at_period_end: false,
          pending_tier: null,
          pending_tier_start_date: null,
          cancelled_at: null,
          updated_at: now,
        })
        .eq("user_id", row.user_id)
        .eq("status", "grace_period");

      if (!upErr) downgraded++;
    }

    return new Response(
      JSON.stringify({
        ok: true,
        cadence_period_end_candidates: cadenceCandidates,
        cadence_applied: cadenceApplied,
        momo_grace_candidates: momoOverdue?.length ?? 0,
        momo_grace_started: momoGraceStarted,
        grace_expire_candidates: due?.length ?? 0,
        downgraded,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[subscription-janitor]", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
