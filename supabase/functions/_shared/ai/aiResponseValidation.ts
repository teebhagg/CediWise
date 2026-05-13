import { z } from "https://esm.sh/zod@3.23.8";


const flexibleNumber = z.preprocess((val) => {
  if (typeof val === "string") {
    // Remove currency symbols, commas, and whitespace
    const clean = val.replace(/[^\d.-]/g, "");
    const parsed = parseFloat(clean);
    return isNaN(parsed) ? 0 : parsed;
  }
  if (typeof val === "number") {
    return isNaN(val) ? 0 : val;
  }
  return 0;
}, z.number());

const insightSchema = z.object({
  t: z.string(),
  ti: z.string(),
  d: z.string(),
  g: flexibleNumber,
  c: z.string().optional(),
  cf: flexibleNumber.pipe(z.number().min(0).max(1)),
});

const forecastSchema = z.object({
  b: flexibleNumber,
  s: flexibleNumber,
  r: z.enum(["low", "medium", "high"]),
});

const recommendationSchema = z.object({
  a: z.string(),
  g: flexibleNumber,
  d: z.enum(["easy", "medium", "hard"]),
});

export const analysisResponseSchema = z.object({
  s: z.string(),
  i: z.array(insightSchema),
  f: forecastSchema,
  r: z.array(recommendationSchema),
  h: z.string(),
});

export const profileSuggestionSchema = z.object({
  reasoning_scratchpad: z.string().optional(),
  templateKey: z.enum(["smart", "balanced", "moderate", "survival", "aggressive_savings"]),
  templateReason: z.string().optional(),
  budgetSplit: z.object({
    needsPct: flexibleNumber.pipe(z.number().min(0).max(1)),
    wantsPct: flexibleNumber.pipe(z.number().min(0).max(1)),
    savingsPct: flexibleNumber.pipe(z.number().min(0).max(1)),
    reason: z.string().optional(),
  }).optional(),
  categories: z.array(z.object({
    id: z.string(),
    name: z.string(),
    bucket: z.enum(["needs", "wants", "savings"]),
    suggestedLimit: flexibleNumber,
    reason: z.string().optional(),
    confidence: flexibleNumber.pipe(z.number().min(0).max(1)).optional(),
  })).optional().default([]),
  recurringExpenses: z.array(z.object({
    id: z.string(),
    name: z.string(),
    amount: flexibleNumber,
    bucket: z.enum(["needs", "wants", "savings"]),
    reason: z.string().optional(),
    confidence: flexibleNumber.pipe(z.number().min(0).max(1)).optional(),
  })).optional().default([]),
  goals: z.array(z.object({
    type: z.enum(["emergency_fund", "project", "investment", "debt_payoff"]).catch("project"),
    name: z.string(),
    amount: flexibleNumber,
    timelineMonths: flexibleNumber,
    reason: z.string().optional(),
    confidence: flexibleNumber.pipe(z.number().min(0).max(1)).optional(),
  })).optional().default([]),
});

export const chatTextSchema = z.object({
  type: z.literal("text"),
  text: z.string(),
  chips: z.array(z.string()).optional(),
});

export const chatActionSchema = z.object({
  type: z.literal("action"),
  action: z.enum([
    "bulk_create_transactions",
    "update_category_limit",
    "create_category",
    "reallocate_budget",
    "record_debt_payment",
    "create_debt",
    "suggest_payoff_strategy",
  ]),
  text: z.string(),
  payload: z.record(z.string(), z.unknown()),
  chips: z.array(z.string()).optional(),
});

export const chatResponseSchema = z.union([chatTextSchema, chatActionSchema]);

export type AnalysisResponse = z.infer<typeof analysisResponseSchema>;
export type ChatResponseParsed = z.infer<typeof chatResponseSchema>;
export type ProfileSuggestionParsed = z.infer<typeof profileSuggestionSchema>;

export function stripJsonFence(raw: string): string {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  return s.trim();
}

