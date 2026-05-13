import type { BudgetGiftedMessage } from "@/components/templates/chat-v1/budget-chat-v1";
import { supabase } from "@/utils/supabase";
import EventSource from "react-native-sse";
import {
  AI_CHAT_ASSISTANT_ID,
  AI_CHAT_USER_ID,
  type AIChatStructuredMessage,
} from "@/types/ai";
import {
  AIChatStructuredMessageParser,
} from "./aiChatStream";
import { BudgetCategory } from "@/types/budget";

export interface SendAiChatArgs {
  supabaseUrl: string;
  anonKey: string;
  accessToken: string;
  sessionId: string;
  message: string;
  context_type?: "budget" | "debt";
  ianaTimezone: string;
  signal: AbortSignal;
  onToken: (t: string) => void;
  onDone: (
    structured: AIChatStructuredMessage | null,
    usage:
      | { remaining: number; limit: number; tier: string | undefined }
      | null,
  ) => void;
  onLimitError?: (payload: {
    limit: number;
    used: number;
    tier?: string;
  }) => void;
  onHttpError?: (status: number, body: string) => void;
}

export async function sendAiChatTurn(args: SendAiChatArgs): Promise<void> {
  const url = `${args.supabaseUrl.replace(/\/$/, "")}/functions/v1/ai-chat`;

  return new Promise((resolve) => {
    let resolved = false;

    let tokenQueue: string[] = [];
    let isFlushing = false;
    let isDone = false;
    let donePayload: { structured: AIChatStructuredMessage | null; usage: any } | null = null;

    const es = new EventSource(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${args.accessToken}`,
        apikey: args.anonKey,
        "Content-Type": "application/json",
        "X-User-Timezone": args.ianaTimezone,
      },
      body: JSON.stringify({
        session_id: args.sessionId,
        message: args.message,
        context_type: args.context_type ?? "budget",
      }),
    });

    const cleanup = () => {
      args.signal.removeEventListener("abort", handleAbort);
      es.removeAllEventListeners();
      es.close();
      if (!resolved) {
        resolved = true;
        resolve();
      }
    };

    const handleAbort = () => {
      args.onHttpError?.(0, "[network_or_abort] aborted by user");
      cleanup();
    };

    args.signal.addEventListener("abort", handleAbort);

    const startFlushing = () => {
      if (isFlushing) return;
      isFlushing = true;
      
      const intervalId = setInterval(() => {
        if (tokenQueue.length > 0) {
          // Dynamic burst size: smoothly drain the queue if it gets too large
          const burstSize = Math.max(1, Math.ceil(tokenQueue.length / 8));
          const chunk = tokenQueue.splice(0, burstSize).join("");
          args.onToken(chunk);
        } else if (isDone) {
          clearInterval(intervalId);
          args.onDone(donePayload?.structured ?? null, donePayload?.usage ?? null);
          cleanup();
        }
      }, 35);
    };

    es.addEventListener("message", (event) => {
      if (!event || !event.data || event.data === "[DONE]") return;
      try {
        const payload = JSON.parse(event.data);
        if (payload.type === "token" && typeof payload.text === "string") {
          tokenQueue.push(payload.text);
          startFlushing();
        }
        if (payload.type === "done") {
          const structured = AIChatStructuredMessageParser.parseMaybe(payload.message);
          const u = payload.usage as Record<string, unknown> | undefined;
          const usage =
            u && typeof u.remaining === "number" && typeof u.limit === "number"
              ? {
                  remaining: u.remaining as number,
                  limit: u.limit as number,
                  tier: typeof u.tier === "string" ? u.tier : undefined,
                }
              : null;
              
          donePayload = { structured, usage };
          isDone = true;
          startFlushing();
        }
      } catch {
        // ignore
      }
    });

    es.addEventListener("error", (event) => {
      const e = event as any;
      if (resolved) return;

      if (e.xhrStatus === 429) {
        try {
          const json = JSON.parse(e.message || "");
          if (json?.error === "limit_reached" && typeof json.limit === "number") {
            args.onLimitError?.({
              limit: json.limit,
              used: Number(json.used ?? json.limit),
              tier: typeof json.tier === "string" ? json.tier : undefined,
            });
            cleanup();
            return;
          }
        } catch {
          // fallback
        }
      }

      if (e.xhrStatus && e.xhrStatus >= 400) {
        args.onHttpError?.(e.xhrStatus, e.message || "");
      } else {
        const hint = e.message || "Unknown stream error";
        args.onHttpError?.(0, `[network_or_abort] ${hint}`.slice(0, 500));
      }
      
      cleanup();
    });
  });
}

export function resolveCategoryByAiName(
  name: string,
  categories: BudgetCategory[],
): BudgetCategory | null {
  const q = name.trim().toLowerCase();
  if (!q) return null;
  const exact = categories.find((c) => c.name.trim().toLowerCase() === q);
  if (exact) return exact;
  const includes = categories.find((c) => q.includes(c.name.trim().toLowerCase()));
  if (includes) return includes;
  return (
    categories.find((c) => c.name.trim().toLowerCase().includes(q)) ?? null
  );
}

export async function fetchChatHistory(
  userId: string,
  sessionId: string,
): Promise<BudgetGiftedMessage[]> {
  const { data, error } = await supabase
    .from("ai_chat_history")
    .select("*")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .order("created_at", { ascending: true });

  if (error || !data) return [];

  return data.map((row) => {
    let structured: AIChatStructuredMessage | null = null;
    let text = row.content;

    if (row.role === "assistant") {
      try {
        // Attempt to parse structured JSON if it starts with {
        if (row.content.trim().startsWith("{")) {
          const parsed = JSON.parse(row.content);
          structured = AIChatStructuredMessageParser.parseMaybe(parsed);
          if (structured?.text) {
            text = structured.text;
          }
        }
      } catch {
        /* fallback to content as text */
      }
    }

    return {
      _id: row.id,
      text: text,
      createdAt: new Date(row.created_at),
      user: {
        _id: row.role === "user" ? AI_CHAT_USER_ID : AI_CHAT_ASSISTANT_ID,
        name: row.role === "user" ? "Me" : "AI",
      },
      structured,
    } as BudgetGiftedMessage;
  });
}

export interface AIChatSession {
  id: string;
  startedAt: Date;
  lastMessageAt: Date;
  title: string;
  messageCount: number;
}

export async function fetchChatSessions(
  userId: string,
): Promise<AIChatSession[]> {
  // Fetch recent history rows to group into sessions.
  // In a production app with huge history, we'd use a dedicated RPC or view.
  const { data, error } = await supabase
    .from("ai_chat_history")
    .select("session_id, created_at, content, role")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(300); // Should cover enough recent sessions

  if (error || !data) return [];

  const sessionsMap: Record<string, AIChatSession> = {};

  for (const row of data) {
    const sid = row.session_id;
    const createdAt = new Date(row.created_at);

    if (!sessionsMap[sid]) {
      sessionsMap[sid] = {
        id: sid,
        startedAt: createdAt,
        lastMessageAt: createdAt,
        title: "New Chat",
        messageCount: 0,
      };
    }

    const s = sessionsMap[sid];
    s.messageCount++;

    if (createdAt > s.lastMessageAt) {
      s.lastMessageAt = createdAt;
    }
    if (createdAt < s.startedAt) {
      s.startedAt = createdAt;
      // If this was the first user message, use it as the title
      if (row.role === "user") {
        s.title = row.content.slice(0, 60).trim() || "New Chat";
      }
    } else if (row.role === "user" && s.title === "New Chat") {
      // Use the earliest user message we find
      s.title = row.content.slice(0, 60).trim() || "New Chat";
    }
  }

  return Object.values(sessionsMap).sort(
    (a, b) => b.startedAt.getTime() - a.startedAt.getTime(),
  );
}

export async function fetchChatUsage(
  userId: string,
): Promise<{ remaining: number; limit: number; tier: string } | null> {
  try {
    // 1. Get current date in ISO format (YYYY-MM-DD) for usage tracking
    // We try to match the server's day logic
    const usageDate = new Date().toISOString().split("T")[0];

    const [{ data: sub }, { data: usage }] = await Promise.all([
      supabase
        .from("subscriptions")
        .select("plan, trial_ends_at")
        .eq("user_id", userId)
        .maybeSingle(),
      supabase
        .from("ai_chat_usage_daily")
        .select("message_count")
        .eq("user_id", userId)
        .eq("usage_date", usageDate)
        .maybeSingle(),
    ]);

    const plan = (sub?.plan || "free") as "free" | "budget" | "sme";
    const trialEndsAt = sub?.trial_ends_at;
    let tier = plan;

    if (
      trialEndsAt &&
      !Number.isNaN(new Date(trialEndsAt).getTime()) &&
      new Date(trialEndsAt) > new Date()
    ) {
      tier = "sme";
    }

    let limit = 5;
    if (tier === "budget") limit = 20;
    else if (tier === "sme") limit = 50;

    const used = Number(usage?.message_count ?? 0) || 0;

    return {
      remaining: Math.max(0, limit - used),
      limit,
      tier,
    };
  } catch (e) {
    console.error("fetchChatUsage failed:", e);
    return null;
  }
}
