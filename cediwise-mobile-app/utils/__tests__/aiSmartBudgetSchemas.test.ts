import {
  AIChatStructuredMessageParser,
  streamAiChatSse,
} from "@/hooks/aiChatStream";
import { expandAnalysis } from "@/types/ai";

describe("expandAnalysis", () => {
  it("maps compact keys into UI shape", () => {
    const out = expandAnalysis(
      {
        s: "On track.",
        i: [
          {
            t: "overspending",
            ti: "Dining high",
            d: "Restaurant spend up.",
            g: 120,
            c: "Dining",
            cf: 0.8,
          },
        ],
        f: { b: 1000, s: 200, r: "low" },
        r: [{ a: "Cut dining", g: 50, d: "easy" }],
        h: "Overall healthy.",
      },
      { cached: true, modelUsed: "test-model" },
    );
    expect(out.summary).toBe("On track.");
    expect(out.insights).toHaveLength(1);
    expect(out.insights[0].title).toBe("Dining high");
    expect(out.forecast.projectedEndBalance).toBe(1000);
    expect(out.recommendations[0].action).toBe("Cut dining");
    expect(out.healthNarrative).toBe("Overall healthy.");
    expect(out.cached).toBe(true);
    expect(out.modelUsed).toBe("test-model");
  });
});

describe("AIChatStructuredMessageParser", () => {
  it("parses text messages", () => {
    expect(
      AIChatStructuredMessageParser.parseMaybe({ type: "text", text: "Hi" }),
    ).toEqual({ type: "text", text: "Hi" });
  });

  it("parses known action types with payload", () => {
    const m = AIChatStructuredMessageParser.parseMaybe({
      type: "action",
      action: "bulk_create_transactions",
      text: "Add rows",
      payload: { transactions: [{ cat: "Food", qty: 1, amt: 10 }] },
    });
    expect(m?.type).toBe("action");
    if (m?.type === "action") {
      expect(m.action).toBe("bulk_create_transactions");
      expect(Array.isArray(m.payload.transactions)).toBe(true);
    }
  });

  it("returns null for unknown action", () => {
    expect(
      AIChatStructuredMessageParser.parseMaybe({
        type: "action",
        action: "unknown_action",
        text: "",
        payload: {},
      }),
    ).toBeNull();
  });
});

describe("streamAiChatSse", () => {
  it("accumulates streamed SSE data lines into payloads", async () => {
    const payloads: Record<string, unknown>[] = [];
    const enc = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(enc.encode('data: {"type":"token","text":"He"}\n\n'));
        controller.enqueue(enc.encode('data: {"type":"done"}\n'));
        controller.close();
      },
    });
    await streamAiChatSse(stream.getReader(), (p) => {
      payloads.push(p);
    });
    expect(payloads).toContainEqual({ type: "token", text: "He" });
    expect(payloads.some((p) => p.type === "done")).toBe(true);
  });
});
