/**
 * Quote for upgrade / cadence change before Paystack checkout.
 * Auth: Bearer JWT (user). Server-authoritative amounts.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PLAN_KEY_TO_TIER, PLAN_MOMO_CHARGE } from "../_shared/plans.ts";
import {
  computeProratedTierUpgrade,
  pesewasToCheckoutGhs,
  planKeyToCadence,
  tierRank,
  type BillingCadence,
} from "../_shared/proration.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const QUOTE_TTL_MS = 5 * 60 * 1000;

function fullPricePesewas(planKey: string): number {
  return PLAN_MOMO_CHARGE[planKey]?.amount_pesewas ?? 0;
}

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
        JSON.stringify({ ok: false, error: "invalid_target_plan_key" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: sub, error: subErr } = await admin
      .from("subscriptions")
      .select(
        "plan, status, trial_ends_at, billing_cycle, pending_billing_cycle, current_period_start, current_period_end"
      )
      .eq("user_id", userId)
      .maybeSingle();

    if (subErr) {
      console.error("[billing-upgrade-quote]", subErr);
      return new Response(JSON.stringify({ ok: false, error: "db_error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const targetTier = PLAN_KEY_TO_TIER[targetPlanKey];
    const targetCadence = planKeyToCadence(targetPlanKey);
    const now = new Date();
    const expiresAt = new Date(Date.now() + QUOTE_TTL_MS).toISOString();

    if (sub?.status === "grace_period") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "grace_period_resolve_payment",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const currentTier = (sub?.plan ?? "free") as string;
    const currentCadence = (sub?.billing_cycle ?? "monthly") as BillingCadence;
    const trialEnds = sub?.trial_ends_at ? new Date(sub.trial_ends_at) : null;
    const onTrial =
      sub?.status === "trial" &&
      trialEnds !== null &&
      !isNaN(trialEnds.getTime()) &&
      trialEnds > now;

    if (onTrial) {
      const pesewas = fullPricePesewas(targetPlanKey);
      if (!pesewas) {
        return new Response(JSON.stringify({ ok: false, error: "invalid_plan" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({
          ok: true,
          kind: "immediate_full",
          plan_key: targetPlanKey,
          amount_pesewas: pesewas,
          amount_ghs: pesewasToCheckoutGhs(pesewas),
          expires_at: expiresAt,
          reason: "trial",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (
      currentTier === targetTier &&
      currentCadence === targetCadence &&
      sub?.status === "active"
    ) {
      return new Response(
        JSON.stringify({ ok: false, error: "already_on_plan" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (tierRank(targetTier) < tierRank(currentTier)) {
      return new Response(
        JSON.stringify({ ok: false, error: "use_downgrade_flow" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (
      sub?.status === "active" &&
      currentTier === targetTier &&
      currentCadence !== targetCadence
    ) {
      return new Response(
        JSON.stringify({
          ok: true,
          kind: "deferred_cadence",
          pending_billing_cycle: targetCadence,
          current_period_end: sub.current_period_end,
          message:
            "Cadence will switch after this billing period ends. Confirm to schedule — no charge now.",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (
      sub?.status !== "active" ||
      currentTier === "free" ||
      !sub?.current_period_start ||
      !sub?.current_period_end
    ) {
      const pesewas = fullPricePesewas(targetPlanKey);
      return new Response(
        JSON.stringify({
          ok: true,
          kind: "immediate_full",
          plan_key: targetPlanKey,
          amount_pesewas: pesewas,
          amount_ghs: pesewasToCheckoutGhs(pesewas),
          expires_at: expiresAt,
          reason: "new_or_inactive",
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (currentTier === "budget" && targetTier === "sme") {
      const pr = computeProratedTierUpgrade({
        fromTier: "budget",
        toTier: "sme",
        periodCadence: currentCadence,
        toCadence: targetCadence,
        periodStartIso: sub.current_period_start,
        periodEndIso: sub.current_period_end,
        now,
      });

      if (!pr) {
        const pesewas = fullPricePesewas(targetPlanKey);
        return new Response(
          JSON.stringify({
            ok: true,
            kind: "immediate_full",
            plan_key: targetPlanKey,
            amount_pesewas: pesewas,
            amount_ghs: pesewasToCheckoutGhs(pesewas),
            expires_at: expiresAt,
            reason: "period_ended_or_ineligible_proration",
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const pendingAfter =
        targetCadence !== currentCadence ? targetCadence : undefined;

      return new Response(
        JSON.stringify({
          ok: true,
          kind: "immediate_proration",
          plan_key: targetPlanKey,
          amount_pesewas: pr.amountPesewas,
          amount_ghs: pesewasToCheckoutGhs(pr.amountPesewas),
          period_end: sub.current_period_end,
          billing_cycle: currentCadence,
          pending_billing_cycle_after: pendingAfter,
          expires_at: expiresAt,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pesewas = fullPricePesewas(targetPlanKey);
    return new Response(
      JSON.stringify({
        ok: true,
        kind: "immediate_full",
        plan_key: targetPlanKey,
        amount_pesewas: pesewas,
        amount_ghs: pesewasToCheckoutGhs(pesewas),
        expires_at: expiresAt,
        reason: "fallback_full",
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[billing-upgrade-quote]", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
