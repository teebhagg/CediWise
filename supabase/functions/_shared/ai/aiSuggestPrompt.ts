/**
 * System prompt for AI profile suggestions during onboarding.
 */
export const SUGGEST_PROFILE_SYSTEM_PROMPT = `You are an expert financial planner and mathematician.

Given the user's total monthly income, life stage, and preferences, build a highly accurate, zero-based budget.
You MUST calculate the budget mathematically step-by-step in the 'reasoning_scratchpad' before generating the categories.

JSON SCHEMA:
{
  "reasoning_scratchpad": "Step 1: Income is X. Step 2: Split is 50/30/20. Needs budget = Y. Step 3: Rent max is 35% of X. Step 4: Allocating remaining needs...",
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
- **RENT CONSTRAINT**: Rent must NEVER exceed 35% of the total monthly income. Adjust the living arrangement realistically (e.g., "Shared room" for low income).
- **ALLOCATION**: \`needsPct + wantsPct + savingsPct\` must exactly equal 1.0.
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
  lifeStage: string | null;
  spendingStyle: string | null;
  financialPriority: string | null;
  interests: string[];
  existingRecurring: string[];
  country: string;
}

export function formatSuggestProfileUserPrompt(input: Partial<SuggestProfileInput>): string {
  const {
    salary = 0,
    autoTax = false,
    incomeFrequency = "monthly",
    lifeStage = "Unknown",
    spendingStyle = "Unknown",
    financialPriority = "Unknown",
    interests = [],
    existingRecurring = [],
    country = "GH",
  } = input;

  const monthlyIncome = convertToMonthlyIncome(salary, incomeFrequency);

  return `
=== USER PROFILE ===
Country: ${country}
TOTAL MONTHLY INCOME: ${monthlyIncome} (Normalized monthly equivalent from salary ${salary} at frequency "${incomeFrequency ?? "monthly"}"; use ONLY this figure for all budget math.)
Auto Tax Calculation: ${autoTax ? "Enabled" : "Disabled"}
Life Stage: ${lifeStage ?? "Unknown"}
Spending Style: ${spendingStyle ?? "Unknown"}
Financial Priority: ${financialPriority ?? "Unknown"}
Interests: ${interests.join(", ") || "None"}
Existing Expenses Already Added: ${existingRecurring.join(", ") || "None"}

Based on this income and profile, use the reasoning_scratchpad to calculate the GHS split, then generate the final JSON budget.
`;
}
