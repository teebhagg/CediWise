import type { SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";

export function estimateGroqCostUsd(
  inputTokens: number,
  outputTokens: number,
): number {
  const inRate = 0.59 / 1_000_000;
  const outRate = 0.79 / 1_000_000;
  return inputTokens * inRate + outputTokens * outRate;
}

export async function insertCostRow(
  supabase: SupabaseClient,
  row: {
    user_id: string | null;
    endpoint: string;
    model: string;
    provider?: string;
    input_tokens?: number | null;
    output_tokens?: number | null;
    cost_usd?: number | null;
    response_time_ms?: number | null;
    status?: string;
  },
): Promise<void> {
  await supabase.from("ai_cost_log").insert({
    user_id: row.user_id,
    endpoint: row.endpoint,
    model: row.model,
    provider: row.provider ?? "groq",
    input_tokens: row.input_tokens ?? null,
    output_tokens: row.output_tokens ?? null,
    cost_usd: row.cost_usd ?? null,
    response_time_ms: row.response_time_ms ?? null,
    status: row.status ?? "success",
  });
}
