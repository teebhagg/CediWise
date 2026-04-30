/**
 * Initialize a Paystack hosted checkout for card subscription upgrade.
 * Auth: supabase.auth.getUser(JWT) via anon key (verified signature).
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  resolveCustomerDisplayName,
  splitDisplayName,
} from "../_shared/customerDisplayName.ts";
import { PLAN_CARD_INIT } from "../_shared/plans.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  // ── CORS preflight ─────────────────────────────────────────────────────────
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
    // ── [LOG 1] Request received ──────────────────────────────────────────────
    console.log("[paystack-initiate] Request received");

    // ── Environment variables ─────────────────────────────────────────────────
    const supabaseUrl     = Deno.env.get("SUPABASE_URL");
    const anonKey         = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey  = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    // ── [LOG 2] Env check ─────────────────────────────────────────────────────
    console.log("[paystack-initiate] Env check:", {
      hasSupabaseUrl:    !!supabaseUrl,
      hasAnonKey:        !!anonKey,
      hasServiceRoleKey: !!serviceRoleKey,
      hasPaystackKey:    !!paystackSecretKey,
    });

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !paystackSecretKey) {
      console.error("[paystack-initiate] FATAL: Missing environment variables");
      return new Response(JSON.stringify({ error: "Server misconfigured" }), {
        status: 503,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ── [LOG 3] Auth header extraction ────────────────────────────────────────
    const authHeader = req.headers.get("authorization");
    console.log("[paystack-initiate] Auth header present:", !!authHeader);

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      console.error("[paystack-initiate] Missing or malformed Authorization header");
      return new Response(JSON.stringify({ error: "Unauthorized — missing Bearer token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const authClient = createClient(supabaseUrl, anonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const { data: userData, error: authErr } = await authClient.auth.getUser(token);

    if (authErr || !userData?.user) {
      console.error("[paystack-initiate] getUser failed:", authErr?.message);
      return new Response(JSON.stringify({ error: "Unauthorized — invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    console.log(`[paystack-initiate] Auth OK — userId: ${userId}`);

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // ── [LOG 6] Parse request body ────────────────────────────────────────────
    const body = await req.json().catch(() => ({}));
    const planKey = body?.plan as string;
    console.log("[paystack-initiate] Request body:", { planKey, callbackUrl: body?.callback_url });

    if (!planKey || !PLAN_CARD_INIT[planKey]) {
      console.error("[paystack-initiate] Invalid plan key:", planKey);
      return new Response(
        JSON.stringify({ error: "Invalid plan. Must be one of: budget_monthly, budget_quarterly, sme_monthly, sme_quarterly" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── [LOG 7] Plan config lookup ────────────────────────────────────────────
    const planConfig = PLAN_CARD_INIT[planKey];
    const paystackPlanCode = Deno.env.get(planConfig.plan_code_env);
    console.log("[paystack-initiate] Plan config:", {
      label:          planConfig.label,
      amount_pesewas: planConfig.amount_pesewas,
      planCodeEnvKey: planConfig.plan_code_env,
      paystackPlanCode: paystackPlanCode ?? "NOT SET",
    });

    if (!paystackPlanCode) {
      console.error(`[paystack-initiate] Paystack plan code not set for env key: ${planConfig.plan_code_env}`);
      return new Response(
        JSON.stringify({ error: `Plan not configured: ${planKey}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── [LOG 8] Fetch user email from profiles ────────────────────────────────
    const { data: profile, error: profileError } = await admin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .single();

    console.log("[paystack-initiate] Profile fetch:", {
      found:  !!profile,
      email:  profile?.email ?? null,
      error:  profileError?.message ?? null,
    });

    // Fallback email strategy: profile → auth user email → synthetic
    const email: string =
      profile?.email ||
      userData.user.email ||
      `${userId}@cediwise.phone`;

    console.log("[paystack-initiate] Using email:", email);

    const displayName = await resolveCustomerDisplayName(admin, userId);
    console.log("[paystack-initiate] customer display name:", {
      resolved: !!displayName,
    });

    const initBody: Record<string, unknown> = {
      email,
      amount: planConfig.amount_pesewas,
      plan: paystackPlanCode,
      callback_url: body?.callback_url || "cediwise://payment-callback",
      metadata: {
        userId,
        planKey,
        user_id: userId,
        plan_key: planKey,
        ...(displayName
          ? {
              full_name: displayName,
              customer_name: displayName,
            }
          : {}),
      },
    };

    if (displayName) {
      const { first_name, last_name } = splitDisplayName(displayName);
      if (first_name) initBody.first_name = first_name;
      if (last_name) initBody.last_name = last_name;
    }

    // ── [LOG 9] Paystack API call ─────────────────────────────────────────────
    const callbackUrl = initBody.callback_url as string;
    console.log("[paystack-initiate] Calling Paystack initialize with:", {
      email,
      amount: planConfig.amount_pesewas,
      plan: paystackPlanCode,
      callbackUrl,
      metadataKeys: Object.keys(initBody.metadata as object),
    });

    const paystackRes = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(initBody),
    });

    const paystackData = await paystackRes.json();

    // ── [LOG 10] Paystack response ────────────────────────────────────────────
    console.log("[paystack-initiate] Paystack response:", {
      status:      paystackData.status,
      message:     paystackData.message,
      hasAuthUrl:  !!paystackData.data?.authorization_url,
    });

    if (!paystackData.status) {
      console.error("[paystack-initiate] Paystack init FAILED:", paystackData);
      return new Response(
        JSON.stringify({
          error: "Payment initialization failed",
          details: paystackData.message,
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── [LOG 11] Success ──────────────────────────────────────────────────────
    console.log(`[paystack-initiate] SUCCESS for user ${userId}, plan: ${planKey}`);

    return new Response(
      JSON.stringify({
        authorization_url: paystackData.data.authorization_url,
        reference:         paystackData.data.reference,
        access_code:       paystackData.data.access_code,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    // ── [LOG 12] Unhandled exception ──────────────────────────────────────────
    console.error("[paystack-initiate] Unhandled exception:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
