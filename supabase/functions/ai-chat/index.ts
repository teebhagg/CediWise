/**
 * ai-chat — tier-limited conversational AI with SSE output (Groq streaming in, chunked JSON out).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  assembleUserContext,
} from "../_shared/ai/aiContextAssembly.ts";
import {
  chatResponseSchema,
  stripJsonFence,
} from "../_shared/ai/aiResponseValidation.ts";
import {
  chatUnifiedSystemPrompt,
  formatExtractionMessage,
  formatMemoryBlock,
  MEMORY_EXTRACTION_PROMPT,
} from "../_shared/ai/aiPromptTemplates.ts";
import { corsHeaders } from "../_shared/ai/cors.ts";
import {
  calendarDateInTimeZone,
} from "../_shared/ai/aiTimezone.ts";
import {
  chatLimitForTier,
  effectiveTierFromSubscription,
} from "../_shared/ai/aiTierLimits.ts";
import { insertCostRow, estimateGroqCostUsd } from "../_shared/ai/aiCostTracker.ts";

type GroqStreamDelta = {
  choices?: Array<{ delta?: { content?: string }; finish_reason?: string | null }>;
};

// Global in-memory map for burst protection (R7)
// Since Deno isolates stay warm for some time, this offers simple but effective
// burst rate-limiting across sequential requests hitting the same instance.
const burstTracker = new Map<string, number[]>();

function checkBurstLimit(userId: string): boolean {
  const now = Date.now();
  const windowMs = 60000; // 1 minute
  const maxRequests = 5; // allow 5 requests per minute

  let timestamps = burstTracker.get(userId) || [];
  timestamps = timestamps.filter(t => now - t < windowMs);
  
  if (timestamps.length >= maxRequests) {
    burstTracker.set(userId, timestamps);
    return false; // Rate limited
  }
  
  timestamps.push(now);
  burstTracker.set(userId, timestamps);
  
  // Cleanup to prevent unbounded memory growth if many users hit the same isolate
  if (burstTracker.size > 10000) {
    for (const [k, v] of burstTracker.entries()) {
      if (!v.length || v[v.length - 1] < now - windowMs) {
        burstTracker.delete(k);
      }
    }
  }
  
  return true;
}

function sseLine(obj: Record<string, unknown>): string {
  return `data: ${JSON.stringify(obj)}\n\n`;
}

async function readGroqStreamToText(
  body: ReadableStream<Uint8Array> | null,
  onToken?: (token: string) => void,
): Promise<{ text: string; inputTokens: number; outputTokens: number }> {
  let full = "";
  let inputTokens = 0;
  let outputTokens = 0;
  if (!body) return { text: full, inputTokens, outputTokens };
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buf = "";

  // Better state machine for streaming JSON content
  let isStreamingText = false;

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() ?? "";
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith("data: ")) continue;
        const data = trimmed.slice(6).trim();
        if (data === "[DONE]") continue;
        try {
          const json = JSON.parse(data) as GroqStreamDelta & {
            usage?: { prompt_tokens?: number; completion_tokens?: number };
          };
          if (json.usage) {
            inputTokens = Number(json.usage.prompt_tokens ?? inputTokens) || inputTokens;
            outputTokens = Number(json.usage.completion_tokens ?? outputTokens) ||
              outputTokens;
          }
          const piece = json.choices?.[0]?.delta?.content;
          if (piece) {
            full += piece;

            if (onToken) {
              if (!isStreamingText) {
                // If we see "text":" start streaming
                const match = full.match(/"text"\s*:\s*"/);
                if (match) {
                  isStreamingText = true;
                  const startIdx = match.index! + match[0].length;
                  const initialPiece = full.slice(startIdx);
                  
                  let unescapedQuoteIdx = -1;
                  for (let i = 0; i < initialPiece.length; i++) {
                    if (initialPiece[i] === '"' && (i === 0 || initialPiece[i-1] !== '\\')) {
                      unescapedQuoteIdx = i;
                      break;
                    }
                  }

                  if (unescapedQuoteIdx !== -1) {
                    onToken(initialPiece.slice(0, unescapedQuoteIdx));
                    isStreamingText = false;
                  } else if (initialPiece) {
                    onToken(initialPiece);
                  }
                }
              } else {
                let unescapedQuoteIdx = -1;
                for (let i = 0; i < piece.length; i++) {
                  if (piece[i] === '"' && (i === 0 || piece[i-1] !== '\\')) {
                    unescapedQuoteIdx = i;
                    break;
                  }
                }

                if (unescapedQuoteIdx !== -1) {
                   onToken(piece.slice(0, unescapedQuoteIdx));
                   isStreamingText = false;
                } else {
                   onToken(piece);
                }
              }
            }
          }
        } catch {
          // ignore malformed stream lines
        }
      }
    }
  } finally {
    reader.releaseLock();
  }
  return { text: full, inputTokens, outputTokens };
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

  const tz = req.headers.get("X-User-Timezone") ?? "Africa/Accra";

  let bodyParsed: {
    session_id?: string;
    message?: string;
    context_type?: "budget" | "debt";
  };
  try {
    bodyParsed = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const sessionId = typeof bodyParsed.session_id === "string"
    ? bodyParsed.session_id
    : "";
  const userMessage = typeof bodyParsed.message === "string"
    ? bodyParsed.message.trim()
    : "";
  const sessionUuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

  if (!sessionId || !sessionUuidRegex.test(sessionId)) {
    return new Response(JSON.stringify({ error: "invalid_session_id" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  if (!userMessage || userMessage.length > 2000) {
    return new Response(JSON.stringify({ error: "invalid_message" }), {
      status: 400,
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

  if (!supabaseUrl || !serviceKey || !groqKey) {
    return new Response(JSON.stringify({ error: "Server misconfigured" }), {
      status: 500,
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

  if (!checkBurstLimit(userId)) {
    return new Response(
      JSON.stringify({ error: "rate_limit_burst", detail: "Please wait a moment before sending another message." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const usageDate = calendarDateInTimeZone(new Date(), tz);

  const [
    subRes,
    usageRes,
    historyRes,
    assembledCtx,
  ] = await Promise.all([
    admin.from("subscriptions").select("plan, trial_ends_at").eq("user_id", userId).maybeSingle(),
    admin.from("ai_chat_usage_daily").select("message_count").eq("user_id", userId).eq("usage_date", usageDate).maybeSingle(),
    admin.from("ai_chat_history").select("role, content").eq("user_id", userId).eq("session_id", sessionId).order("created_at", { ascending: true }).limit(24),
    assembleUserContext(admin, userId).catch(e => ({ error: e })),
  ]);

  if ('error' in assembledCtx && assembledCtx.error) {
    const msg = assembledCtx.error instanceof Error ? assembledCtx.error.message : String(assembledCtx.error);
    return new Response(
      JSON.stringify({ error: "context_failed", detail: msg }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const contextText = assembledCtx.text || "";

  const sub = subRes.data;
  const usageRow = usageRes.data;
  const historyRows = historyRes.data;
  const memoryRow = ('memoryRow' in assembledCtx) ? assembledCtx.memoryRow : null;

  const effective = effectiveTierFromSubscription(
    sub?.plan ?? "free",
    sub?.trial_ends_at ?? null,
  );
  const limit = chatLimitForTier(effective);
  const used = Number(usageRow?.message_count ?? 0) || 0;

  if (used >= limit) {
    return new Response(
      JSON.stringify({
        error: "limit_reached",
        limit,
        used,
        tier: effective,
      }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const contextType = bodyParsed.context_type === "debt" ? "debt" : "budget";
  const memoryBlock = formatMemoryBlock(memoryRow);

  const historyMessages =
    historyRows?.map((r: { role: string; content: string }) => {
      if (r.role === "assistant") {
        try {
          const j = JSON.parse(r.content) as { text?: string };
          const t = typeof j.text === "string" ? j.text : r.content;
          return {
            role: "assistant" as const,
            content: t.slice(0, 8000),
          };
        } catch {
          return {
            role: "assistant" as const,
            content: String(r.content).slice(0, 8000),
          };
        }
      }
      if (r.role === "user") {
        return {
          role: "user" as const,
          content: String(r.content).slice(0, 8000),
        };
      }
      return null;
    }).filter(Boolean) as { role: "user" | "assistant"; content: string }[]
    ?? [];

  const systemPrompt = chatUnifiedSystemPrompt(contextText, contextType);

  const msgs = [
    { role: "system" as const, content: systemPrompt },
    ...historyMessages.slice(-20).map((m: { role: "user" | "assistant"; content: string }) =>
      ({
        role: m.role,
        content: m.content.slice(0, 8000),
      })
    ),
    { role: "user" as const, content: userMessage },
  ];

  const started = Date.now();
  let modelUsed = groqModel;

  const dynamicMaxTokens = userMessage.length > 150 || historyMessages.length > 6 ? 2048 : 1024;

  async function streamGroq(model: string) {
    const res = await fetch(groqUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${groqKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages: msgs,
        stream: true,
        max_tokens: dynamicMaxTokens,
        temperature: 0.45,
        response_format: { type: "json_object" },
      }),
    });
    return res;
  }

  let groqRes = await streamGroq(groqModel);
  modelUsed = groqModel;
  if (!groqRes.ok) {
    groqRes = await streamGroq(groqFallback);
    modelUsed = groqFallback;
  }
  if (!groqRes.ok) {
    const errText = await groqRes.text();
    return new Response(
      JSON.stringify({ error: "groq_http", detail: errText.slice(0, 500) }),
      { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }

  const stream = new ReadableStream({
    async start(controller) {
      const enc = new TextEncoder();

      const { text: rawCompletion, inputTokens, outputTokens } =
        await readGroqStreamToText(groqRes.body, (token) => {
          controller.enqueue(enc.encode(sseLine({ type: "token", text: token })));
        });

      const elapsed = Date.now() - started;

      let parsed: unknown;
      try {
        parsed = JSON.parse(stripJsonFence(rawCompletion));
      } catch {
        parsed = {
          type: "text",
          text: "I had a little trouble with that one. Could you try rephrasing your question? I'm here to help.",
        };
      }

      const validated = chatResponseSchema.safeParse(parsed);
      const message = validated.success
        ? validated.data
        : {
          type: "text" as const,
          text: "That didn't come through clearly on my end. Please try asking in a different way — I want to give you the best answer.",
        };

      const backgroundPersistence = async () => {
        try {
          await admin.from("ai_chat_history").insert({
            user_id: userId,
            session_id: sessionId,
            role: "user",
            content: userMessage,
            metadata: { tz },
          });

          await admin.from("ai_chat_history").insert({
            user_id: userId,
            session_id: sessionId,
            role: "assistant",
            content: JSON.stringify(message),
            metadata: { model: modelUsed },
          });

          const nextCount = used + 1;
          await admin.from("ai_chat_usage_daily").upsert(
            {
              user_id: userId,
              usage_date: usageDate,
              message_count: nextCount,
              timezone: tz,
              updated_at: new Date().toISOString(),
            },
            { onConflict: "user_id,usage_date" },
          );

          // R13: Conditional memory extraction
          if (userMessage.length > 25 || rawCompletion.length > 250) {
            const extRes = await fetch(groqUrl, {
              method: "POST",
              headers: {
                Authorization: `Bearer ${groqKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                model: "llama-3.1-8b-instant",
                messages: [
                  { role: "system", content: MEMORY_EXTRACTION_PROMPT },
                  {
                    role: "user",
                    content: formatExtractionMessage(
                      historyMessages,
                      userMessage,
                      rawCompletion,
                    ),
                  },
                ],
                response_format: { type: "json_object" },
              }),
            });

          if (extRes.ok) {
            const extJson = await extRes.json();
            const ext = JSON.parse(extJson.choices?.[0]?.message?.content || "{}");

            const existingPrefs = Array.isArray(memoryRow?.preferences)
              ? memoryRow.preferences
              : [];
            const existingFacts = Array.isArray(memoryRow?.key_facts)
              ? memoryRow.key_facts
              : [];
            const existingSummaries = Array.isArray(memoryRow?.session_summaries)
              ? memoryRow.session_summaries
              : [];

            const newPrefs = Array.from(
              new Set([...existingPrefs, ...(ext.preferences ?? [])]),
            );
            const newFacts = Array.from(
              new Set([...existingFacts, ...(ext.key_facts ?? [])]),
            );
            if (ext.session_summary) {
              existingSummaries.unshift(ext.session_summary);
            }
            const cappedSummaries = existingSummaries.slice(0, 10);

            await admin.from("ai_user_context").upsert({
              user_id: userId,
              context_type: "general",
              preferences: newPrefs,
              key_facts: newFacts,
              session_summaries: cappedSummaries,
              summary: memoryRow?.summary ||
                "User is managing their finances with CediWise AI.",
              updated_at: new Date().toISOString(),
            }, { onConflict: "user_id,context_type" });
          }
          }

          const costUsd = estimateGroqCostUsd(inputTokens, outputTokens);
          await insertCostRow(admin, {
            user_id: userId,
            endpoint: "ai-chat",
            model: modelUsed,
            input_tokens: inputTokens,
            output_tokens: outputTokens,
            cost_usd: costUsd,
            response_time_ms: elapsed,
          });
        } catch (e) {
          console.error("Async persistence/memory failed:", e);
        }
      };

      // Fire and forget
      backgroundPersistence().catch(console.error);

      controller.enqueue(
        enc.encode(
          sseLine({
            type: "done",
            message,
            usage: {
              remaining: Math.max(0, limit - (used + 1)),
              limit,
              tier: effective,
            },
          }),
        ),
      );
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      ...corsHeaders,
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});
