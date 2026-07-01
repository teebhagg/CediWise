/**
 * ai-rebalance-plan — JWT-authenticated Groq JSON trim suggestions for over-budget plans.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/ai/cors.ts";
import { groqChatCompletion } from "../_shared/ai/groqClient.ts";
import { insertCostRow, estimateGroqCostUsd } from "../_shared/ai/aiCostTracker.ts";
import { stripJsonFence } from "../_shared/ai/aiResponseValidation.ts";

const SYSTEM_PROMPT = `You are a Ghana-focused budget assistant. Reallocate category limits so the plan fits within take-home pay.

Rules:
- Categories with locked=true or listed in lockedCategoryIds must keep their limit exactly — never change them.
- Never set ECG, Ghana Water, or Utilities to 0 when they have locked recurring amounts.
- Total proposed limits across ALL categories must be <= takeHome.
- Each bucket's category limits should stay within bucketEnvelopes when possible.
- Trim underspent discretionary (wants) before needs; respect financialPriority:
  - savings_growth: protect savings, trim wants first
  - lifestyle: protect wants, trim savings first
  - conservative spendingStyle: trim wants before needs
- Life stage (enforce strictly unless category is locked or has spent > 0):
  - young_professional, family, retiree: proposed_limit=0 for School Fees (students only)
  - student: prioritize School Fees and Transport; zero Childcare and Family Outings
  - family: prioritize Groceries and Healthcare (not School Fees)
  - retiree: zero Childcare, Skills & Courses
- Categories in irrelevantCategoryIds must stay at 0
- Never split one expense across alias duplicates (e.g. put all data/airtime/internet into Data Bundles only, not Data + Data Bundles; Groceries not Groceries + Food)
- duplicateMerges lists loser lines already merged — keep losers at 0
- Only adjust categories where locked=false
- Return JSON only: {"adjustments":[{"category_id":"uuid","proposed_limit":number}],"rationale":"one short sentence"}`;

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
  const groqFallback = Deno.env.get("GROQ_FALLBACK_MODEL") ?? "mixtral-8x7b-32768";
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
    return new Response(JSON.stringify({ error: "Invalid session" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const userPrompt = JSON.stringify(body);
  const started = Date.now();

  let content = "";
  let modelUsed = groqModel;
  let inputTokens = 0;
  let outputTokens = 0;

  try {
    const res = await groqChatCompletion({
      apiKey: groqKey,
      url: groqUrl,
      model: groqModel,
      fallbackModel: groqFallback,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.2,
      maxTokens: 1200,
      responseFormat: { type: "json_object" },
    });
    content = res.content;
    modelUsed = res.modelUsed;
    inputTokens = res.inputTokens;
    outputTokens = res.outputTokens;
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: "ai_failed", detail: msg }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let parsed: { adjustments?: unknown[]; rationale?: string };
  try {
    parsed = JSON.parse(stripJsonFence(content));
  } catch {
    return new Response(JSON.stringify({ error: "invalid_ai_json" }), {
      status: 502,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  await insertCostRow(admin, {
    userId: userData.user.id,
    endpoint: "ai-rebalance-plan",
    model: modelUsed,
    inputTokens,
    outputTokens,
    costUsd: estimateGroqCostUsd(modelUsed, inputTokens, outputTokens),
    latencyMs: Date.now() - started,
  });

  return new Response(
    JSON.stringify({
      adjustments: parsed.adjustments ?? [],
      rationale: parsed.rationale ?? null,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } },
  );
});
