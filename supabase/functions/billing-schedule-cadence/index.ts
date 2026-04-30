/**
 * Schedule billing cadence change (same tier) for after current period. No charge.
 * Auth: Bearer JWT.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLAN_KEY_TO_TIER } from "../_shared/plans.ts";
import { planKeyToCadence, tierRank } from "../_shared/proration.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: userData, error: userErr } = await authClient.auth.getUser(
      token
    );
    if (userErr || !userData?.user?.id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const targetPlanKey = String(body?.target_plan_key ?? "").trim();
    if (!targetPlanKey || !PLAN_KEY_TO_TIER[targetPlanKey]) {
      return new Response(
        JSON.stringify({ error: "invalid_target_plan_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const targetTier = PLAN_KEY_TO_TIER[targetPlanKey];
    const targetCadence = planKeyToCadence(targetPlanKey);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select("plan, status, billing_cycle, pending_billing_cycle")
      .eq("user_id", userId)
      .maybeSingle();

    if (subErr || !sub) {
      return new Response(JSON.stringify({ error: "subscription_not_found" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (sub.status !== "active") {
      return new Response(JSON.stringify({ error: "not_active" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const currentTier = sub.plan as string;
    const currentCadence = (sub.billing_cycle ?? "monthly") as string;

    if (currentTier !== targetTier) {
      return new Response(
        JSON.stringify({ error: "tier_mismatch_use_upgrade" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tierRank(targetTier) === 0) {
      return new Response(JSON.stringify({ error: "invalid_tier" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (currentCadence === targetCadence) {
      return new Response(JSON.stringify({ error: "already_on_cadence" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { error: upErr } = await admin
      .from("subscriptions")
      .update({
        pending_billing_cycle: targetCadence,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId);

    if (upErr) {
      console.error("[billing-schedule-cadence]", upErr);
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        ok: true,
        pending_billing_cycle: targetCadence,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[billing-schedule-cadence]", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
