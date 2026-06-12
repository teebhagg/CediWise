/** AI Smart Budget types (API uses compact JSON keys; we expand for UI). */
export const AI_CHAT_USER_ID = 1;
export const AI_CHAT_ASSISTANT_ID = 2;


export type InsightType =
  | "overspending"
  | "underspending"
  | "trend"
  | "anomaly"
  | "opportunity"
  | "risk"
  | string;

export interface AIBudgetAnalysis {
  summary: string;
  insights: AIInsight[];
  forecast: AIForecast;
  recommendations: AIRecommendation[];
  healthNarrative: string;
  modelUsed?: string;
  generatedAt?: string;
  cached?: boolean;
}

export interface AIInsight {
  id: string;
  type: InsightType;
  title: string;
  description: string;
  /** Impact in GHS (absolute or typical magnitude). */
  impactGhs: number;
  category?: string;
  confidence: number;
}

export interface AIForecast {
  projectedEndBalance: number;
  projectedSavings: number;
  riskLevel: "low" | "medium" | "high";
}

export interface AIRecommendation {
  id: string;
  action: string;
  expectedSavingsGhs: number;
  difficulty: "easy" | "medium" | "hard";
}

export interface AIInsightCompact {
  t: string;
  ti: string;
  d: string;
  g: number;
  c?: string;
  cf: number;
}

export interface AIForecastCompact {
  b: number;
  s: number;
  r: "low" | "medium" | "high";
}

export interface AIRecommendationCompact {
  a: string;
  g: number;
  d: "easy" | "medium" | "hard";
}

export interface AIAnalysisCompact {
  s: string;
  i: AIInsightCompact[];
  f: AIForecastCompact;
  r: AIRecommendationCompact[];
  h: string;
}

export interface AIAnalyzeBudgetResponse {
  cached?: boolean;
  result?: AIAnalysisCompact;
  modelUsed?: string;
  inputHash?: string;
  error?: string;
  detail?: string;
}

let _insightId = 0;
function insightId(): string {
  _insightId += 1;
  return `ins-${Date.now()}-${_insightId}`;
}

/** Map Groq compact analysis JSON to expanded UI shape. */
export function expandAnalysis(
  raw: AIAnalysisCompact,
  meta?: Partial<AIBudgetAnalysis>,
): AIBudgetAnalysis {
  return {
    summary: raw.s,
    insights: raw.i.map((x) => ({
      id: insightId(),
      type: x.t,
      title: x.ti,
      description: x.d,
      impactGhs: x.g,
      category: x.c,
      confidence: x.cf,
    })),
    forecast: {
      projectedEndBalance: raw.f.b,
      projectedSavings: raw.f.s,
      riskLevel: raw.f.r,
    },
    recommendations: raw.r.map((x) => ({
      id: insightId(),
      action: x.a,
      expectedSavingsGhs: x.g,
      difficulty: x.d,
    })),
    healthNarrative: raw.h,
    ...meta,
  };
}

export type AIChatStructuredMessage =
    | {
      type: "text";
      text: string;
      chips?: string[];
    }
  | {
      type: "action";
      action:
        | "bulk_create_transactions"
        | "update_category_limit"
        | "create_category"
        | "reallocate_budget"
        | "record_debt_payment"
        | "create_debt"
        | "suggest_payoff_strategy";
      text: string;
      payload: Record<string, unknown>;
      chips?: string[];
      status?: "applied" | "skipped";
    };

export interface AIUsageState {
  used: number;
  limit: number;
  remaining: number;
}

/** Profile suggestion types for onboarding wizard. */

export interface AISuggestionCategory {
  id: string;
  name: string;
  bucket: "needs" | "wants" | "savings";
  suggestedLimit: number;
  reason: string;
  confidence: number;
  accepted: boolean;
}

export interface AISuggestionRecurring {
  id: string;
  name: string;
  amount: number;
  bucket: "needs" | "wants" | "savings";
  reason: string;
  confidence: number;
  accepted: boolean;
}

export interface AISuggestionGoal {
  id: string;
  type: "emergency_fund" | "project" | "investment";
  amount: number;
  timelineMonths: number;
  reason: string;
  confidence?: number;
  accepted: boolean;
}

export interface AIProfileSuggestions {
  templateKey: string;
  templateReason: string;
  budgetSplit: {
    needsPct: number;
    wantsPct: number;
    savingsPct: number;
    reason: string;
  };
  categories: AISuggestionCategory[];
  recurringExpenses: AISuggestionRecurring[];
  goals: AISuggestionGoal[];
  economicContext: {
    inflationRate: number;
    snapshotDate: string;
    currencySymbol: string;
  };
}
