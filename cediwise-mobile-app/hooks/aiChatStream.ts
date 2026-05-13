import type { AIChatStructuredMessage } from "@/types/ai";

/**
 * Parses full SSE-ish body (`data:` JSON lines).
 * Prefer this on React Native: `fetch` often omits `response.body.getReader()`
 * while `response.text()` still returns bytes.
 */
export function parseAiChatSseText(
  fullText: string,
  onPayload: (p: Record<string, unknown>) => void,
): void {
  const lines = fullText.split(/\r?\n/);
  for (const lineRaw of lines) {
    const line = lineRaw.trim();
    if (!line.startsWith("data:")) continue;
    const data = line.slice(5).trim();
    if (!data) continue;
    try {
      onPayload(JSON.parse(data) as Record<string, unknown>);
    } catch {
      /* ignore */
    }
  }
}

/** Parse SSE `data:` JSON lines from ai-chat Edge function. */
export async function streamAiChatSse(
  reader: ReadableStreamDefaultReader<Uint8Array>,
  onPayload: (p: Record<string, unknown>) => void,
): Promise<void> {
  const decoder = new TextDecoder();
  let carry = "";

  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      carry += decoder.decode(value, { stream: true });
      const chunks = carry.split(/\r?\n/);
      carry = chunks.pop() ?? "";
      for (const lineRaw of chunks) {
        const line = lineRaw.trim();
        if (!line.startsWith("data:")) continue;
        const data = line.slice(5).trim();
        if (!data) continue;
        try {
          const json = JSON.parse(data) as Record<string, unknown>;
          onPayload(json);
        } catch {
          /* ignore */
        }
      }
    }

    const tail = carry.trim();
    if (tail.startsWith("data:")) {
      try {
        onPayload(JSON.parse(tail.slice(5).trim()) as Record<string, unknown>);
      } catch {
        /* noop */
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export const AIChatStructuredMessageParser = {
  parseMaybe(raw: unknown): AIChatStructuredMessage | null {
    if (!raw || typeof raw !== "object") return null;
    const o = raw as Record<string, unknown>;
    if (o.type === "text" && typeof o.text === "string") {
      return { type: "text", text: o.text };
    }
    if (o.type === "action") {
      const action = o.action as string | undefined;
      const text = o.text as string | undefined;
      const payload =
        typeof o.payload === "object" && o.payload !== null && !Array.isArray(o.payload)
          ? (o.payload as Record<string, unknown>)
          : {};
      if (
        action === "bulk_create_transactions" ||
        action === "update_category_limit" ||
        action === "create_category" ||
        action === "reallocate_budget" ||
        action === "record_debt_payment" ||
        action === "create_debt" ||
        action === "suggest_payoff_strategy"
      ) {
        return {
          type: "action",
          action,
          text: text ?? "",
          payload,
        };
      }
    }
    return null;
  },
};
