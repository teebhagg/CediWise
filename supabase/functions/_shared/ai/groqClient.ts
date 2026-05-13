export type GroqMessage =
  | { role: "system" | "user" | "assistant"; content: string };

export type GroqCompletionResult = {
  content: string;
  inputTokens: number;
  outputTokens: number;
  model: string;
};

export async function groqChatCompletion(opts: {
  apiKey: string;
  apiUrl: string;
  model: string;
  messages: GroqMessage[];
  stream: boolean;
  jsonMode?: boolean;
  fallbackModel?: string;
  maxTokens?: number;
}): Promise<GroqCompletionResult> {
  const bodyBase = {
    messages: opts.messages,
    stream: opts.stream,
    max_tokens: opts.maxTokens ?? 1024,
    temperature: opts.jsonMode ? 0.35 : 0.5,
    ...(opts.jsonMode ? { response_format: { type: "json_object" as const } } : {}),
  };

  async function attempt(model: string): Promise<GroqCompletionResult> {
    const res = await fetch(opts.apiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${opts.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...bodyBase, model }),
    });
    const json = await res.json().catch(() => null);
    if (!res.ok) {
      const msg =
        typeof json?.error?.message === "string"
          ? json.error.message
          : JSON.stringify(json);
      throw new Error(`Groq ${res.status}: ${msg}`);
    }
    const choice = json?.choices?.[0];
    const content = choice?.message?.content ?? "";
    const usage = json?.usage ?? {};
    const inputTokens = Number(usage.prompt_tokens ?? 0) || 0;
    const outputTokens = Number(usage.completion_tokens ?? 0) || 0;
    return {
      content: String(content ?? ""),
      inputTokens,
      outputTokens,
      model,
    };
  }

  try {
    return await attempt(opts.model);
  } catch (e) {
    if (opts.fallbackModel && opts.fallbackModel !== opts.model) {
      return await attempt(opts.fallbackModel);
    }
    throw e;
  }
}
