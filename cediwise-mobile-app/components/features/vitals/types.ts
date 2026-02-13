import type {
  PersonalizationStrategy,
  PrimaryGoal,
  UtilitiesMode,
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
  sideIncome: string;
  paydayDay: string;
  // Life stage (step 1)
  lifeStage: LifeStage | null;
  dependentsCount: string;
  incomeFrequency: IncomeFrequency;
  spendingStyle: SpendingStyle | null;
  financialPriority: FinancialPriority | null;
  // Fixed expenses
  rent: string;
  titheRemittance: string;
  utilitiesMode: UtilitiesMode;
  utilitiesTotal: string;
  utilitiesECG: string;
  utilitiesWater: string;
  interests: string[];
  primaryGoal: PrimaryGoal | null;
  strategyChoice: PersonalizationStrategy;
};

export type UpdateDraft = (patch: Partial<Draft>) => void;

export type StepErrors = Record<string, string>;
