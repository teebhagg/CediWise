import { formatConstraintBlock } from "./suggestionConstraints.ts";

/**
 * System prompt for AI profile suggestions during onboarding.
 */
export const SUGGEST_PROFILE_SYSTEM_PROMPT = `You are an expert financial planner and mathematician.

Given the user's total monthly income, life stage, and preferences, build a highly accurate, zero-based budget.
You MUST calculate the budget mathematically step-by-step in the 'reasoning_scratchpad' before generating the categories.

JSON SCHEMA:
{
  "reasoning_scratchpad": "Step 1: Income is X. Step 2: Split is 50/30/20. Needs budget = Y. Step 3: Rent max is 30% of X. Step 4: Allocating remaining needs...",
  "templateKey": "smart" | "balanced" | "moderate" | "survival" | "aggressive_savings",
  "templateReason": "string (A friendly, 1-2 sentence explanation to the user of why this budget template was chosen for them based on their profile)",
  "budgetSplit": {
    "needsPct": number (0-1),
    "wantsPct": number (0-1),
    "savingsPct": number (0-1),
    "reason": "string (A short explanation for this percentage split)"
  },
  "categories": [
    {
      "id": "unique-string",
      "name": "string",
      "bucket": "needs" | "wants" | "savings",
      "suggestedLimit": number,
      "reason": "string",
      "confidence": number (0-1)
    }
  ],
  "recurringExpenses": [
    {
      "id": "unique-string",
      "name": "string",
      "amount": number,
      "bucket": "needs" | "wants" | "savings",
      "reason": "string",
      "confidence": number (0-1)
    }
  ],
  "goals": [
    {
      "type": "emergency_fund" | "project" | "investment",
      "name": "string",
      "amount": number,
      "timelineMonths": number,
      "reason": "string",
      "confidence": number (0-1)
    }
  ]
}

RULES:
- All financial amounts must be based on the currency specified (GHS), but the JSON fields (\`suggestedLimit\`, \`amount\`) MUST be pure numbers (e.g., 500), NEVER strings, and NEVER include currency symbols or text like "GHS".
- **MATHEMATICAL CONSTRAINT**: 
  1. The sum of all \`suggestedLimit\` and \`amount\` values assigned to the "needs" bucket MUST equal EXACTLY \`needsPct * TOTAL MONTHLY INCOME\`.
  2. The sum of all \`suggestedLimit\` and \`amount\` values assigned to the "wants" bucket MUST equal EXACTLY \`wantsPct * TOTAL MONTHLY INCOME\`.
  3. The sum of all \`suggestedLimit\` and \`amount\` values assigned to the "savings" bucket MUST equal EXACTLY \`savingsPct * TOTAL MONTHLY INCOME\`.
- **SCALING & PRUNING**: If income is < 3000 GHS (Survival mode): Suggest ONLY 3-5 essential categories (Food, Transport) and 1-2 basic recurring expenses (Rent, Utilities). Do NOT suggest luxury wants or subscriptions.
- **RENT CONSTRAINT**: Rent must NEVER exceed 30% of the total monthly income. Adjust the living arrangement realistically (e.g., "Shared room" for low income).
- **FOOD CONSTRAINT**: Groceries / Food must NEVER exceed 30% of total monthly income.
- **UTILITIES CONSTRAINT**: Utilities must respect the life-stage absolute cap AND 15% of net (whichever is lower) — see HARD CAPS in the user message.
- **ALLOCATION**: \`needsPct + wantsPct + savingsPct\` must exactly equal 1.0.
- **ZERO EXCESS**: After allocation, the sum of ALL \`suggestedLimit\` and \`amount\` values across ALL buckets MUST equal EXACTLY TOTAL MONTHLY INCOME — no unallocated surplus.
- **ENTERTAINMENT CAP**: Entertainment (movies, nightlife, games, hobbies) MUST NOT exceed 10% of TOTAL MONTHLY INCOME. Dining Out is a separate wants line (max 8% each).
- **SUBSCRIPTIONS CAP**: Subscriptions (Netflix, Spotify, streaming, DSTV) are SEPARATE from entertainment and MUST NOT exceed 10% of TOTAL MONTHLY INCOME.
- **TRANSPORT**: Transport is ALWAYS a Needs item — never place it in Wants.
- **OTHER WANTS**: Each other wants line (Clothing, Data, Dining Out, etc.) max 8% of net each.
- **OTHERS CATEGORY**: Always include a Wants category named exactly "Others" with \`suggestedLimit: 0\` as a catch-all placeholder (user fills it in later).
- **PRIORITY EXPENSES**: When the user lists Top Priority Expenses, you MUST include matching categories/recurring lines for each (by name or close synonym) and pre-allocate meaningful budget to them before filling the rest of each bucket.
- **NO DUPLICATES**: Never list the same expense twice. Fixed bills (rent, utilities, subscriptions, insurance, school fees) go in \`recurringExpenses\` ONLY. Variable spending envelopes (groceries, transport, dining, entertainment) go in \`categories\` ONLY. Do not put the same name in both arrays.
- Output MUST be valid JSON. No markdown fences. Start your response immediately with {.`;

/** Normalize pay period strings from clients (e.g. vitals wizard uses bi_weekly). */
export function convertToMonthlyIncome(
  salary: number,
  incomeFrequency: string | null | undefined,
): number {
  if (!Number.isFinite(salary) || salary < 0) return 0;

  const raw = (incomeFrequency ?? "monthly").trim().toLowerCase();
  const key = raw.replace(/\s+/g, "_").replace(/-/g, "_");

  switch (key) {
    case "weekly":
      return (salary * 52) / 12;
    case "bi_weekly":
    case "biweekly":
      return (salary * 26) / 12;
    case "monthly":
      return salary;
    case "annual":
    case "yearly":
      return salary / 12;
    default:
      return salary;
  }
}

export interface SuggestProfileInput {
  salary: number;
  autoTax: boolean;
  /** Pay period for \`salary\`; converted to monthly via \`convertToMonthlyIncome\`. */
  incomeFrequency?: string | null;
  /** Client-computed monthly budget income (net when autoTax). Preferred over gross conversion. */
  monthlyBudgetIncome?: number;
  lifeStage: string | null;
  spendingStyle: string | null;
  financialPriority: string | null;
  interests: string[];
  priorityExpenses: string[];
  existingRecurring: string[];
  country: string;
}

export function formatSuggestProfileUserPrompt(input: Partial<SuggestProfileInput>): string {
  const {
    salary = 0,
    autoTax = false,
    incomeFrequency = "monthly",
    monthlyBudgetIncome,
    lifeStage = "Unknown",
    spendingStyle = "Unknown",
    financialPriority = "Unknown",
    interests = [],
    priorityExpenses = [],
    existingRecurring = [],
    country = "GH",
  } = input;

  const grossMonthly = convertToMonthlyIncome(salary, incomeFrequency);
  const monthlyIncome =
    typeof monthlyBudgetIncome === "number" &&
    Number.isFinite(monthlyBudgetIncome) &&
    monthlyBudgetIncome > 0
      ? monthlyBudgetIncome
      : grossMonthly;

  const incomeNote =
    autoTax && monthlyIncome !== grossMonthly
      ? `Net take-home after tax (gross monthly equivalent: ${grossMonthly})`
      : `Normalized monthly equivalent from salary ${salary} at frequency "${incomeFrequency ?? "monthly"}"`;

  const constraintBlock = formatConstraintBlock(monthlyIncome, lifeStage);

  return `
=== USER PROFILE ===
Country: ${country}
TOTAL MONTHLY INCOME: ${monthlyIncome} (${incomeNote}; use ONLY this figure for all budget math.)
Auto Tax Calculation: ${autoTax ? "Enabled" : "Disabled"}
Life Stage: ${lifeStage ?? "Unknown"}
Spending Style: ${spendingStyle ?? "Unknown"}
Financial Priority: ${financialPriority ?? "Unknown"}
Interests: ${interests.join(", ") || "None"}
Top Priority Expenses (max 5, MUST shape the budget): ${priorityExpenses.join(", ") || "None"}
Existing Expenses Already Added: ${existingRecurring.join(", ") || "None"}

${constraintBlock}

Based on this income and profile, use the reasoning_scratchpad to calculate the GHS split, then generate the final JSON budget.
`;
}
