/**
 * ai-suggest-profile — JWT-authenticated Groq JSON profile suggestions.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { insertCostRow, estimateGroqCostUsd } from "../_shared/ai/aiCostTracker.ts";
import {
  SUGGEST_PROFILE_SYSTEM_PROMPT,
  convertToMonthlyIncome,
  formatSuggestProfileUserPrompt,
  type SuggestProfileInput,
} from "../_shared/ai/aiSuggestPrompt.ts";
import { normalizeProfileSuggestion } from "../_shared/ai/normalizeProfileSuggestion.ts";
import { stripJsonFence, profileSuggestionSchema } from "../_shared/ai/aiResponseValidation.ts";
import { corsHeaders } from "../_shared/ai/cors.ts";
import { groqChatCompletion } from "../_shared/ai/groqClient.ts";

function bodyToSuggestProfileInput(body: Record<string, unknown>): Partial<SuggestProfileInput> {
  const out: Partial<SuggestProfileInput> = {};
  if (typeof body.salary === "number" && Number.isFinite(body.salary)) out.salary = body.salary;
  if (typeof body.autoTax === "boolean") out.autoTax = body.autoTax;
  if (body.incomeFrequency === null || typeof body.incomeFrequency === "string") {
    out.incomeFrequency = body.incomeFrequency;
  }
  if (body.lifeStage === null || typeof body.lifeStage === "string") out.lifeStage = body.lifeStage;
  if (body.spendingStyle === null || typeof body.spendingStyle === "string") {
    out.spendingStyle = body.spendingStyle;
  }
  if (body.financialPriority === null || typeof body.financialPriority === "string") {
    out.financialPriority = body.financialPriority;
  }
  if (Array.isArray(body.interests)) {
    out.interests = body.interests.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(body.priorityExpenses)) {
    out.priorityExpenses = body.priorityExpenses.filter((x): x is string => typeof x === "string");
  }
  if (Array.isArray(body.existingRecurring)) {
    out.existingRecurring = body.existingRecurring.filter((x): x is string => typeof x === "string");
  }
  if (typeof body.country === "string") out.country = body.country;
  if (
    typeof body.monthlyBudgetIncome === "number" &&
    Number.isFinite(body.monthlyBudgetIncome) &&
    body.monthlyBudgetIncome > 0
  ) {
    out.monthlyBudgetIncome = body.monthlyBudgetIncome;
  }
  return out;
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
  const groqUrl = Deno.env.get("GROQ_API_URL") ?? "https://api.groq.com/openai/v1/chat/completions";

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

  const started = Date.now();
  let userId = userData.user.id;

  let profileBody: Record<string, unknown>;
  try {
    const parsed: unknown = await req.json();
    if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
      return new Response(
        JSON.stringify({
          error: "invalid_body",
          detail: "Request body must be a JSON object",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    profileBody = parsed as Record<string, unknown>;
  } catch (e) {
    const detail = e instanceof Error ? e.message : "Malformed JSON";
    return new Response(JSON.stringify({ error: "invalid_json", detail }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const promptInput = bodyToSuggestProfileInput(profileBody);
    const userPrompt = formatSuggestProfileUserPrompt(promptInput);

    const groqResult = await groqChatCompletion({
      apiKey: groqKey,
      apiUrl: groqUrl,
      model: groqModel,
      fallbackModel: groqFallback,
      stream: false,
      jsonMode: true,
      maxTokens: 1500,
      messages: [
        { role: "system", content: SUGGEST_PROFILE_SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
    });

    const rawContent = stripJsonFence(groqResult.content);
    if (Deno.env.get("DEBUG_AI") === "true") {
      console.log("[ai-suggest-profile] Raw AI content:", rawContent);
    }
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (e) {
      if (Deno.env.get("DEBUG_AI") === "true") {
        console.error("[ai-suggest-profile] JSON Parse Error. Raw content:", rawContent);
      } else {
        console.error(
          "[ai-suggest-profile] JSON Parse Error. Content length:",
          rawContent.length,
        );
      }
      throw new Error(`Failed to parse AI response as JSON: ${e instanceof Error ? e.message : String(e)}`);
    }

    const validated = profileSuggestionSchema.parse(parsed);
    const monthlyIncome =
      typeof promptInput.monthlyBudgetIncome === "number" &&
      Number.isFinite(promptInput.monthlyBudgetIncome) &&
      promptInput.monthlyBudgetIncome > 0
        ? promptInput.monthlyBudgetIncome
        : convertToMonthlyIncome(
            promptInput.salary ?? 0,
            promptInput.incomeFrequency,
          );
    const normalized = normalizeProfileSuggestion(
      validated,
      monthlyIncome,
      promptInput.lifeStage,
    );
    const elapsed = Date.now() - started;

    // Track costs
    const costUsd = estimateGroqCostUsd(groqResult.inputTokens, groqResult.outputTokens);
    await insertCostRow(admin, {
      user_id: userId,
      endpoint: "ai-suggest-profile",
      model: groqResult.model,
      input_tokens: groqResult.inputTokens,
      output_tokens: groqResult.outputTokens,
      cost_usd: costUsd,
      response_time_ms: elapsed,
    }).catch(e => console.error("[ai-suggest-profile] Cost log failed:", e));

    return new Response(
      JSON.stringify({
        suggestions: normalized,
        economicContext: {
          inflationRate: 0,
          snapshotDate: new Date().toISOString(),
          currencySymbol: "₵",
        },
        modelUsed: groqResult.model,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    const elapsed = Date.now() - started;
    const msg = e instanceof Error ? e.message : String(e);
    
    // Check if it's a ZodError for better logging
    if (e && typeof e === 'object' && 'issues' in e) {
      const issues = JSON.stringify(e.issues, null, 2);
      console.error("[ai-suggest-profile] Validation Error:", issues);
      return new Response(JSON.stringify({ error: "validation_failed", detail: issues }), {
        status: 422,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } else {
      const stack = e instanceof Error ? e.stack : undefined;
      console.error("[ai-suggest-profile] Internal error (sanitized for client):", msg, stack ?? "");
    }

    await insertCostRow(admin, {
      user_id: userId,
      endpoint: "ai-suggest-profile",
      model: groqModel,
      input_tokens: null,
      output_tokens: null,
      cost_usd: null,
      response_time_ms: elapsed,
      status: "error",
    }).catch(err => console.error("[ai-suggest-profile] Cost log failed in catch:", err));

    return new Response(
      JSON.stringify({
        error: "suggestion_failed",
        detail: "An internal error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
