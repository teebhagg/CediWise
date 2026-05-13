/**
 * ai-analyze-cycle — Background worker that analyzes a completed cycle
 * and appends a compressed insight to the user's ai_user_context.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "../_shared/ai/cors.ts";
import { estimateGroqCostUsd, insertCostRow } from "../_shared/ai/aiCostTracker.ts";

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

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const groqKey = Deno.env.get("GROQ_API_KEY") ?? "";
  const groqModel = "llama-3.1-8b-instant";
  const groqUrl = Deno.env.get("GROQ_API_URL") ?? "https://api.groq.com/openai/v1/chat/completions";
  const groqTimeoutParsed = Number(Deno.env.get("GROQ_FETCH_TIMEOUT_MS"));
  const groqFetchTimeoutMs =
    Number.isFinite(groqTimeoutParsed) && groqTimeoutParsed > 0 ? groqTimeoutParsed : 5000;

  if (!supabaseUrl || !serviceKey || !groqKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let bodyParsed: { cycle_id?: string; user_id?: string };
  try {
    bodyParsed = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { cycle_id, user_id } = bodyParsed;

  if (!cycle_id || !user_id) {
    return new Response(JSON.stringify({ error: "Missing cycle_id or user_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  // Use service role because this is an administrative background task
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  // Internal/service calls: x-internal-service-token must match service role key (never send that key as Bearer).
  // User calls: Authorization Bearer JWT must belong to body.user_id.
  const internalToken = (req.headers.get("x-internal-service-token") ?? "").trim();
  if (internalToken !== "") {
    if (internalToken !== serviceKey) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } else {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Missing authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const jwt = authHeader.slice("Bearer ".length).trim();
    const { data: userData, error: userErr } = await admin.auth.getUser(jwt);
    if (userErr || !userData.user || userData.user.id !== user_id) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    const started = Date.now();

    // 1. Fetch Cycle
    const { data: cycle, error: cycleErr } = await admin
      .from("budget_cycles")
      .select("start_date, end_date, needs_pct, wants_pct, savings_pct")
      .eq("id", cycle_id)
      .eq("user_id", user_id)
      .maybeSingle();

    if (cycleErr || !cycle) {
      return new Response(JSON.stringify({ error: "Cycle not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Fetch Categories
    const { data: categories } = await admin
      .from("budget_categories")
      .select("id, name, bucket, limit_amount")
      .eq("cycle_id", cycle_id);

    // 3. Fetch Transactions
    const { data: txns } = await admin
      .from("budget_transactions")
      .select("amount, bucket, category_id")
      .eq("cycle_id", cycle_id);

    if (!categories || !txns) {
      return new Response(JSON.stringify({ error: "Could not fetch cycle details" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 4. Assemble Data
    let needsSpent = 0, wantsSpent = 0, savingsSpent = 0;
    const spentByCat: Record<string, number> = {};
    for (const cat of categories) spentByCat[cat.id] = 0;

    for (const tx of txns) {
      const amt = Number(tx.amount) || 0;
      if (tx.bucket === "needs") needsSpent += amt;
      else if (tx.bucket === "wants") wantsSpent += amt;
      else savingsSpent += amt;

      if (tx.category_id && spentByCat[tx.category_id] !== undefined) {
        spentByCat[tx.category_id] += amt;
      }
    }

    const monthLabel = new Date(cycle.start_date).toLocaleString('default', { month: 'short', year: 'numeric' });
    let dataString = `Cycle: ${monthLabel}\n`;
    dataString += `Spent: Needs: ₵${needsSpent}, Wants: ₵${wantsSpent}, Savings: ₵${savingsSpent}\n`;
    dataString += `Category Breakdown:\n`;
    
    for (const cat of categories) {
      const spent = spentByCat[cat.id] || 0;
      const lim = Number(cat.limit_amount) || 0;
      dataString += `- ${cat.name} (${cat.bucket}): spent ₵${spent} / limit ₵${lim}\n`;
    }

    // 5. LLM Analysis
    const prompt = `You are a financial analysis agent.
Analyze the following completed budget cycle data.
Identify 1-2 behavioral trends, overspending areas, or successes.
Compress this into a SINGLE dense sentence of facts and insights.
Do NOT use markdown. Do NOT use newlines. Use the ₵ symbol for GHS.

Data:
${dataString}`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), groqFetchTimeoutMs);

    let res: Response;
    try {
      res = await fetch(groqUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${groqKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: groqModel,
          messages: [{ role: "user", content: prompt }],
          temperature: 0.3,
          max_tokens: 150,
        }),
        signal: controller.signal,
      });
    } catch (e) {
      const aborted =
        (e instanceof DOMException && e.name === "AbortError") ||
        (e instanceof Error && e.name === "AbortError");
      if (aborted) {
        return new Response(
          JSON.stringify({
            error: "groq_request_timeout",
            detail: `Groq request exceeded ${groqFetchTimeoutMs}ms`,
          }),
          {
            status: 504,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }
      throw e;
    } finally {
      clearTimeout(timeoutId);
    }

    if (!res.ok) {
      throw new Error(`Groq HTTP error: ${await res.text()}`);
    }

    const json = await res.json();
    let content = json.choices?.[0]?.message?.content || "";
    const rawInsight = content.trim();

    // Usage tracking
    const inputTokens = json.usage?.prompt_tokens || 0;
    const outputTokens = json.usage?.completion_tokens || 0;
    const elapsed = Date.now() - started;

    // 6. Upsert ai_user_context (insert row if missing)
    const insightStr = `[CYCLE INSIGHT - ${monthLabel}]: ${rawInsight}`;

    const { data: ctx, error: ctxFetchErr } = await admin
      .from("ai_user_context")
      .select("session_summaries, summary, preferences, key_facts")
      .eq("user_id", user_id)
      .eq("context_type", "general")
      .maybeSingle();

    if (ctxFetchErr) {
      console.error("[ai-analyze-cycle] ai_user_context select failed:", ctxFetchErr);
      throw new Error(`ai_user_context read failed: ${ctxFetchErr.message}`);
    }

    const existing = Array.isArray(ctx?.session_summaries) ? ctx.session_summaries : [];
    const isDuplicate = existing.some(
      (s) => typeof s === "string" && s.startsWith(`[CYCLE INSIGHT - ${monthLabel}]`),
    );

    if (!isDuplicate) {
      const merged = [insightStr, ...existing].slice(0, 20);

      const { error: upsertErr } = await admin.from("ai_user_context").upsert(
        {
          user_id,
          context_type: "general",
          summary:
            ctx?.summary ??
            "User is managing their finances with CediWise AI.",
          preferences: ctx?.preferences ?? {},
          key_facts: ctx?.key_facts ?? [],
          session_summaries: merged,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id,context_type" },
      );

      if (upsertErr) {
        console.error("[ai-analyze-cycle] ai_user_context upsert failed:", upsertErr);
        throw new Error(`ai_user_context upsert failed: ${upsertErr.message}`);
      }
    }

    // 7. Log Cost
    const costUsd = estimateGroqCostUsd(inputTokens, outputTokens);
    await insertCostRow(admin, {
      user_id: user_id,
      endpoint: "ai-analyze-cycle",
      model: groqModel,
      input_tokens: inputTokens,
      output_tokens: outputTokens,
      cost_usd: costUsd,
      response_time_ms: elapsed,
    });

    return new Response(JSON.stringify({ success: true, cycle_id, insight: rawInsight }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (e) {
    console.error("ai-analyze-cycle error:", e);
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
