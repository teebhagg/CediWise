import type {
  PersonalizationStrategy,
} from "@/utils/profileVitals";

export type LifeStage = "student" | "young_professional" | "family" | "retiree";
export type IncomeFrequency = "weekly" | "bi_weekly" | "monthly";
export type SpendingStyle = "conservative" | "moderate" | "liberal";
export type FinancialPriority =
  | "debt_payoff"
  | "savings_growth"
  | "lifestyle"
  | "balanced";

export type Draft = {
  step: number;
  stableSalary: string;
  autoTax: boolean;
  paydayDay: number;
  lifeStage: LifeStage | null;
  incomeFrequency: IncomeFrequency;
  spendingStyle: SpendingStyle | null;
  financialPriority: FinancialPriority | null;
  interests: string[];
  // Setup budget preference
  strategyChoice: PersonalizationStrategy;
};

export type UpdateDraft = (patch: Partial<Draft>) => void;

export type StepErrors = Record<string, string>;
