/**
 * ai-analyze-budget — JWT-authenticated Groq JSON analysis with 6h server cache.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { assembleUserContext } from "../_shared/ai/aiContextAssembly.ts";
import { insertCostRow, estimateGroqCostUsd } from "../_shared/ai/aiCostTracker.ts";
import { ANALYSIS_SYSTEM_PROMPT } from "../_shared/ai/aiPromptTemplates.ts";
import {
  analysisResponseSchema,
  stripJsonFence,
} from "../_shared/ai/aiResponseValidation.ts";
import { corsHeaders } from "../_shared/ai/cors.ts";
import { sha256Hex } from "../_shared/ai/hash.ts";
import { groqChatCompletion } from "../_shared/ai/groqClient.ts";

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

  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Missing authorization" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const groqKey = Deno.env.get("GROQ_API_KEY") ?? "";
  const groqModel = Deno.env.get("GROQ_MODEL") ?? "llama-3.3-70b-versatile";
  const groqFallback = Deno.env.get("GROQ_FALLBACK_MODEL") ??
    "mixtral-8x7b-32768";
  const groqUrl = Deno.env.get("GROQ_API_URL") ??
    "https://api.groq.com/openai/v1/chat/completions";

  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!groqKey) {
    return new Response(JSON.stringify({ error: "AI provider unavailable" }), {
      status: 503,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const jwt = authHeader.replace("Bearer ", "");
  const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
  if (userErr || !userData.user) {
    return new Response(
      JSON.stringify({ error: "Invalid or expired session" }),
      { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const userId = userData.user.id;
  let contextText = "";
  let cycleId: string | null = null;
  try {
    const assembled = await assembleUserContext(admin, userId);
    contextText = assembled.text;
    cycleId = assembled.cycleId;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(
      JSON.stringify({ error: "context_failed", detail: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const inputHash = await sha256Hex(contextText);
  const { data: cacheHit } = await admin
    .from("ai_analysis_cache")
    .select("result, model_used, expires_at")
    .eq("user_id", userId)
    .eq("analysis_type", "budget_summary")
    .eq("input_hash", inputHash)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (cacheHit?.result) {
    return new Response(
      JSON.stringify({
        cached: true,
        result: cacheHit.result,
        modelUsed: cacheHit.model_used,
        inputHash,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const started = Date.now();
  try {
    const groqResult = await groqChatCompletion({
      apiKey: groqKey,
      apiUrl: groqUrl,
      model: groqModel,
      fallbackModel: groqFallback,
      stream: false,
      jsonMode: true,
      maxTokens: 1200,
      messages: [
        { role: "system", content: ANALYSIS_SYSTEM_PROMPT },
        { role: "user", content: contextText },
      ],
    });

    const parsed = JSON.parse(stripJsonFence(groqResult.content));
    const validated = analysisResponseSchema.parse(parsed);
    const elapsed = Date.now() - started;

    await admin.from("ai_analysis_cache").insert({
      user_id: userId,
      cycle_id: cycleId,
      analysis_type: "budget_summary",
      input_hash: inputHash,
      model_used: groqResult.model,
      result: validated,
    });

    const costUsd = estimateGroqCostUsd(
      groqResult.inputTokens,
      groqResult.outputTokens,
    );
    await insertCostRow(admin, {
      user_id: userId,
      endpoint: "ai-analyze-budget",
      model: groqResult.model,
      input_tokens: groqResult.inputTokens,
      output_tokens: groqResult.outputTokens,
      cost_usd: costUsd,
      response_time_ms: elapsed,
    });

    return new Response(
      JSON.stringify({
        cached: false,
        result: validated,
        modelUsed: groqResult.model,
        inputHash,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const elapsed = Date.now() - started;
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[ai-analyze-budget]", msg);
    await insertCostRow(admin, {
      user_id: userId,
      endpoint: "ai-analyze-budget",
      model: groqModel,
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
      response_time_ms: elapsed,
      status: "error",
    });
    return new Response(JSON.stringify({ error: "analyze_failed", detail: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
