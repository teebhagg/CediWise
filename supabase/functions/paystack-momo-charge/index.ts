/**
 * Initiate Paystack Mobile Money charge (Ghana).
 * Auth: Bearer JWT — verified via supabase.auth.getUser (anon key).
 * Idempotency: client UUID in momo_charge_attempts.
 *
 * Does not set subscriptions.status = pending_payment (webhook is source of truth).
 * Trial users: still record pending_tier + MoMo contact for stacking.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  resolveCustomerDisplayName,
  splitDisplayName,
} from "../_shared/customerDisplayName.ts";
import { PLAN_KEY_TO_TIER, PLAN_MOMO_CHARGE } from "../_shared/plans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type MomoProvider = "mtn" | "vod" | "tgo";

const LOG = "[paystack-momo-charge]";

function maskPhone(digits: string): string {
  if (digits.length < 5) return "***";
  return `${digits.slice(0, 3)}…${digits.slice(-2)}`;
}

function safeJsonPreview(value: unknown, maxChars = 1800): string {
  try {
    const s = JSON.stringify(value);
    if (s.length <= maxChars) return s;
    return `${s.slice(0, maxChars)}…(truncated,len=${s.length})`;
  } catch {
    return String(value);
  }
}

function normalizeGhanaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!digits.length) return null;
  if (digits.startsWith("233")) {
    const rest = digits.slice(3).replace(/^0+/, "");
    if (rest.length < 9) return null;
    return `0${rest}`;
  }
  if (digits.startsWith("0") && digits.length >= 10) return digits.slice(0, 10);
  if (digits.length === 9) return `0${digits}`;
  return null;
}

function detectProvider(normalized: string): MomoProvider | null {
  if (normalized.length < 3) return null;
  const prefix3 = normalized.slice(0, 3);
  const prefix2 = normalized.slice(0, 2);
  if (["024", "054", "055", "059", "023", "053"].includes(prefix3)) return "mtn";
  if (["020", "050"].includes(prefix3)) return "vod";
  if (["027", "057", "026", "056"].includes(prefix3)) return "tgo";
  if (["24", "54", "55", "59", "23", "53"].includes(prefix2)) return "mtn";
  return null;
}

function resolveProvider(
  phone: string,
  override: string | undefined
): MomoProvider | null {
  const o = override?.toLowerCase().trim();
  if (o === "mtn" || o === "vod" || o === "tgo") return o;
  if (o === "atl" || o === "airteltigo") return "tgo";
  return detectProvider(phone);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    console.warn(`${LOG} reject method=${req.method}`);
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  console.log(`${LOG} POST begin`);

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    console.log(`${LOG} env`, {
      hasSupabaseUrl: !!supabaseUrl,
      hasAnonKey: !!anonKey,
      hasServiceRoleKey: !!serviceRoleKey,
      hasPaystackSecretKey: !!paystackSecretKey,
    });

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !paystackSecretKey) {
      console.error(`${LOG} FATAL missing env`);
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const authHeader = req.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      console.warn(`${LOG} 401 missing Bearer`);
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: authError } = await authClient.auth.getUser(
      token
    );
    if (authError || !userData?.user) {
      console.warn(`${LOG} 401 getUser`, {
        message: authError?.message ?? null,
        hasUser: !!userData?.user,
      });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log(`${LOG} auth ok userId=${userId}`);

    const body = await req.json().catch((e) => {
      console.warn(`${LOG} JSON parse failed`, e instanceof Error ? e.message : e);
      return {};
    });
    const planKey = body?.plan_key as string;
    const idempotencyKey = body?.idempotency_key as string;
    const phoneRaw = body?.phone as string;
    const providerOverride = body?.provider_override as string | undefined;

    console.log(`${LOG} body`, {
      planKey: planKey ?? null,
      planKeyValid: !!(planKey && PLAN_MOMO_CHARGE[planKey]),
      idempotencyKey: idempotencyKey
        ? `${String(idempotencyKey).slice(0, 8)}…`
        : null,
      phoneRawLen: phoneRaw?.length ?? 0,
      providerOverride: providerOverride ?? null,
    });

    if (
      !planKey ||
      !PLAN_MOMO_CHARGE[planKey] ||
      !idempotencyKey ||
      !phoneRaw
    ) {
      console.warn(`${LOG} 400 invalid body`, {
        hasPlanKey: !!planKey,
        inPlanMap: !!(planKey && PLAN_MOMO_CHARGE[planKey]),
        hasIdempotencyKey: !!idempotencyKey,
        hasPhone: !!phoneRaw,
      });
      return new Response(
        JSON.stringify({
          error:
            "Invalid body: require plan_key, phone, idempotency_key (UUID)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalized = normalizeGhanaPhone(phoneRaw);
    if (!normalized) {
      console.warn(`${LOG} 400 invalid phone`, {
        digitsLen: phoneRaw.replace(/\D/g, "").length,
      });
      return new Response(JSON.stringify({ error: "Invalid phone number" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`${LOG} phone normalized=${maskPhone(normalized)}`);

    const provider = resolveProvider(normalized, providerOverride);
    if (!provider) {
      console.warn(`${LOG} 400 unknown provider`, {
        prefix3: normalized.slice(0, 3),
        override: providerOverride ?? null,
      });
      return new Response(
        JSON.stringify({
          error:
            "Could not detect MoMo provider; pass provider_override (mtn, vod, tgo)",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`${LOG} provider=${provider}`);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: existing } = await admin
      .from("momo_charge_attempts")
      .select("status, paystack_reference, paystack_response, error_message")
      .eq("idempotency_key", idempotencyKey)
      .eq("user_id", userId)
      .maybeSingle();

    if (existing?.status === "pending" && existing.paystack_reference) {
      console.log(`${LOG} idempotency cache pending`, {
        reference: existing.paystack_reference,
      });
      return new Response(
        JSON.stringify({
          outcome: "pending",
          reference: existing.paystack_reference,
          cached: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existing?.status === "success") {
      console.log(`${LOG} idempotency cache success`, {
        reference: existing.paystack_reference,
      });
      return new Response(
        JSON.stringify({
          outcome: "success",
          reference: existing.paystack_reference,
          cached: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (existing?.status === "failed") {
      console.log(`${LOG} idempotency cache failed`, {
        reference: existing.paystack_reference,
        message: existing.error_message,
      });
      return new Response(
        JSON.stringify({
          outcome: "failed",
          reference: existing.paystack_reference,
          message: existing.error_message,
          cached: true,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planConfig = PLAN_MOMO_CHARGE[planKey];
    const billingCycle = planKey.includes("quarterly") ? "quarterly" : "monthly";

    const { data: profile } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    const email =
      profile?.email ||
      userData.user.email ||
      `${userId}@cediwise.phone`;

    const emailSource = profile?.email
      ? "profile"
      : userData.user.email
        ? "auth_user"
        : "synthetic";

    const displayName = await resolveCustomerDisplayName(admin, userId);

    console.log(`${LOG} charge context`, {
      planKey,
      billingCycle,
      amountPesewas: planConfig.amount_pesewas,
      emailSource,
      emailDomain: email.includes("@") ? email.split("@")[1] : "?",
      hasCustomerDisplayName: !!displayName,
    });

    if (!existing) {
      console.log(`${LOG} idempotency insert new row`);
      const { error: insErr } = await admin.from("momo_charge_attempts").insert({
        idempotency_key: idempotencyKey,
        user_id: userId,
        plan_key: planKey,
        status: "pending",
      });
      if (insErr) {
        console.error(`${LOG} idempotency insert failed`, insErr);
        return new Response(JSON.stringify({ error: "Could not start charge" }), {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
    } else {
      console.log(`${LOG} idempotency retry pending row (no reference yet)`);
    }

    const paystackPayload: Record<string, unknown> = {
      email,
      amount: planConfig.amount_pesewas,
      currency: "GHS",
      metadata: {
        userId,
        planKey,
        billingCycle,
        momo_phone: normalized,
        momo_provider: provider,
        ...(displayName
          ? {
              full_name: displayName,
              customer_name: displayName,
            }
          : {}),
      },
      mobile_money: {
        phone: normalized,
        provider,
      },
    };

    if (displayName) {
      const { first_name, last_name } = splitDisplayName(displayName);
      if (first_name) paystackPayload.first_name = first_name;
      if (last_name) paystackPayload.last_name = last_name;
    }

    console.log(`${LOG} Paystack POST /charge`, {
      amount: paystackPayload.amount,
      currency: paystackPayload.currency,
      provider: (paystackPayload.mobile_money as { provider: string }).provider,
      phone: maskPhone(normalized),
      metadataKeys: Object.keys(paystackPayload.metadata as object),
    });

    const paystackRes = await fetch("https://api.paystack.co/charge", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(paystackPayload),
    });

    console.log(`${LOG} Paystack HTTP status=${paystackRes.status}`);

    const paystackData = await paystackRes.json();
    const reference = paystackData.data?.reference as string | undefined;
    const payStatus = paystackData.data?.status as string | undefined;

    console.log(`${LOG} Paystack body summary`, {
      ok: !!paystackData.status,
      message: paystackData.message ?? null,
      reference: reference ?? null,
      dataStatus: payStatus ?? null,
      preview: safeJsonPreview(paystackData),
    });

    if (!paystackData.status) {
      const msg = paystackData.message || "Paystack error";
      console.warn(`${LOG} 400 Paystack declined`, {
        message: msg,
        httpStatus: paystackRes.status,
        preview: safeJsonPreview(paystackData),
      });
      await admin
        .from("momo_charge_attempts")
        .update({
          status: "failed",
          paystack_response: paystackData,
          error_message: msg,
          updated_at: new Date().toISOString(),
        })
        .eq("idempotency_key", idempotencyKey);

      return new Response(
        JSON.stringify({ outcome: "failed", message: msg }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`${LOG} Paystack accepted charge init`, {
      reference,
      paystackDataStatus: payStatus,
    });

    await admin
      .from("momo_charge_attempts")
      .update({
        paystack_reference: reference ?? null,
        paystack_response: paystackData,
        status: payStatus === "success" ? "success" : "pending",
        updated_at: new Date().toISOString(),
      })
      .eq("idempotency_key", idempotencyKey);

    const targetTier = PLAN_KEY_TO_TIER[planKey];
    const { data: subRow } = await admin
      .from("subscriptions")
      .select("trial_ends_at, status")
      .eq("user_id", userId)
      .maybeSingle();

    const trialEnds = subRow?.trial_ends_at
      ? new Date(subRow.trial_ends_at)
      : null;
    const trialActive =
      subRow?.status === "trial" &&
      trialEnds !== null &&
      !isNaN(trialEnds.getTime()) &&
      trialEnds > new Date();

    console.log(`${LOG} subscription update`, {
      trialActive,
      targetTier: targetTier ?? null,
    });

    if (trialActive && targetTier) {
      await admin
        .from("subscriptions")
        .update({
          momo_phone: normalized,
          momo_provider: provider,
          payment_preference: "momo",
          pending_tier: targetTier,
          pending_tier_start_date: subRow!.trial_ends_at,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      console.log(`${LOG} subscriptions updated (trial stack pending_tier)`);
    }

    const outcome =
      payStatus === "success" ? "success" : "pending";

    console.log(`${LOG} success response`, { outcome, reference });

    return new Response(
      JSON.stringify({
        outcome,
        reference,
        display_text: paystackData.data?.display_text,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error(`${LOG} unhandled exception`, err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
