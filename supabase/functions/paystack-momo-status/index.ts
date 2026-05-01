/**
 * Poll Paystack transaction status by reference (MoMo async approval).
 * Auth: Bearer JWT — must match momo_charge_attempts row for reference.
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const paystackSecretKey = Deno.env.get("PAYSTACK_SECRET_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey || !paystackSecretKey) {
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
    const { data: userData, error: authError } = await authClient.auth.getUser(
      token
    );
    if (authError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const reference = body?.reference as string;
    if (!reference?.length) {
      return new Response(JSON.stringify({ error: "reference required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const { data: attempt } = await admin
      .from("momo_charge_attempts")
      .select("user_id, paystack_reference")
      .eq("user_id", userId)
      .eq("paystack_reference", reference)
      .maybeSingle();

    if (!attempt) {
      return new Response(JSON.stringify({ error: "Reference not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verifyRes = await fetch(
      `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
      {
        headers: { Authorization: `Bearer ${paystackSecretKey}` },
      }
    );
    const verifyData = await verifyRes.json();
    const data = verifyData.data;
    const gatewayStatus = data?.status as string | undefined;

    let outcome: "pending" | "success" | "failed" = "pending";
    if (gatewayStatus === "success") outcome = "success";
    else if (gatewayStatus === "failed" || gatewayStatus === "abandoned") {
      outcome = "failed";
    }

    if (outcome === "success" || outcome === "failed") {
      await admin
        .from("momo_charge_attempts")
        .update({
          status: outcome,
          paystack_response: verifyData,
          updated_at: new Date().toISOString(),
          error_message: outcome === "failed"
            ? (data?.gateway_response as string) || "failed"
            : null,
        })
        .eq("paystack_reference", reference)
        .eq("user_id", userId);
    }

    return new Response(
      JSON.stringify({
        outcome,
        reference,
        paystack_status: gatewayStatus,
        paid_at: data?.paid_at,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("[paystack-momo-status]", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : "Internal error",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
