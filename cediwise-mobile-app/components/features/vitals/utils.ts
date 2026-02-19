import { computeIntelligentAllocation } from "@/calculators/budget-intelligence";
import {
  computeGhanaTax2026Monthly,
  type GhanaTaxBreakdown,
} from "@/utils/ghanaTax";
import type { PersonalizationStrategy } from "@/utils/profileVitals";

export const DEFAULT_MIN_LIVING_BUFFER = 600;

export function toMoney(value: string): number {
  const n = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function clampDay(value: string): number | null {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(31, n));
}

/**
 * Legacy 3-tier strategy (used when no extended profile data).
 * Kept for backward compatibility.
 */
export function computeStrategy(params: {
  stableSalary: number;
  autoTax: boolean;
  sideIncome: number;
  rent: number;
  titheRemittance: number;
  debtObligations: number;
  utilitiesTotal: number;
  livingBuffer?: number;
}): {
  strategy: PersonalizationStrategy;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  netIncome: number;
  fixedCosts: number;
} {
  const livingBuffer =
    typeof params.livingBuffer === "number" && params.livingBuffer >= 0
      ? params.livingBuffer
      : DEFAULT_MIN_LIVING_BUFFER;
  const salaryNet = params.autoTax
    ? computeGhanaTax2026Monthly(params.stableSalary).netTakeHome
    : params.stableSalary;
  const netIncome = Math.max(0, salaryNet + params.sideIncome);
  const fixedCosts = Math.max(
    0,
    params.rent +
      params.titheRemittance +
      params.debtObligations +
      params.utilitiesTotal +
      livingBuffer
  );
  const ratio = netIncome > 0 ? fixedCosts / netIncome : 1;

  if (ratio > 0.75) {
    return {
      strategy: "survival",
      needsPct: 0.9,
      wantsPct: 0.1,
      savingsPct: 0.0,
      netIncome,
      fixedCosts,
    };
  }
  if (ratio < 0.35) {
    return {
      strategy: "aggressive",
      needsPct: 0.4,
      wantsPct: 0.2,
      savingsPct: 0.4,
      netIncome,
      fixedCosts,
    };
  }
  return {
    strategy: "balanced",
    needsPct: 0.5,
    wantsPct: 0.3,
    savingsPct: 0.2,
    netIncome,
    fixedCosts,
  };
}

/**
 * Intelligent multi-factor allocation using life stage, financial priority,
 * spending style, dependents, and debt pressure. Use when extended profile exists.
 */
export function computeIntelligentStrategy(profile: {
  stableSalary: number;
  autoTax: boolean;
  sideIncome: number;
  rent: number;
  titheRemittance: number;
  debtObligations: number;
  utilitiesTotal: number;
  livingBuffer?: number;
  lifeStage?: "student" | "young_professional" | "family" | "retiree" | null;
  dependentsCount?: number;
  incomeFrequency?: "weekly" | "bi_weekly" | "monthly";
  spendingStyle?: "conservative" | "moderate" | "liberal" | null;
  financialPriority?:
    | "debt_payoff"
    | "savings_growth"
    | "lifestyle"
    | "balanced"
    | null;
}): {
  strategy: PersonalizationStrategy;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  netIncome: number;
  fixedCosts: number;
  reasoning: string[];
} {
  const hasExtendedProfile =
    profile.lifeStage != null ||
    profile.financialPriority != null ||
    profile.spendingStyle != null ||
    (profile.dependentsCount ?? 0) > 0;

  if (!hasExtendedProfile) {
    const legacy = computeStrategy(profile);
    return {
      ...legacy,
      strategy: legacy.strategy,
      reasoning: ["Standard allocation based on fixed cost ratio."],
    };
  }

  const result = computeIntelligentAllocation({
    stableSalary: profile.stableSalary,
    applyTax: profile.autoTax,
    sideIncome: profile.sideIncome,
    rent: profile.rent,
    titheRemittance: profile.titheRemittance,
    debtObligations: profile.debtObligations,
    utilitiesTotal: profile.utilitiesTotal,
    livingBuffer: profile.livingBuffer,
    lifeStage: profile.lifeStage ?? undefined,
    dependentsCount: profile.dependentsCount ?? 0,
    incomeFrequency: profile.incomeFrequency,
    spendingStyle: profile.spendingStyle ?? undefined,
    financialPriority: profile.financialPriority ?? undefined,
  });

  return {
    strategy: result.strategy === "custom" ? "balanced" : result.strategy,
    needsPct: result.allocation.needsPct,
    wantsPct: result.allocation.wantsPct,
    savingsPct: result.allocation.savingsPct,
    netIncome: result.netIncome,
    fixedCosts: result.fixedCosts,
    reasoning: result.reasoning,
  };
}

export function strategyToPercents(strategy: PersonalizationStrategy): {
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
} {
  if (strategy === "survival")
    return { needsPct: 0.9, wantsPct: 0.1, savingsPct: 0.0 };
  if (strategy === "aggressive")
    return { needsPct: 0.4, wantsPct: 0.2, savingsPct: 0.4 };
  return { needsPct: 0.5, wantsPct: 0.3, savingsPct: 0.2 };
}

export function getNetPreview(stableSalary: string): GhanaTaxBreakdown | null {
  const gross = toMoney(stableSalary);
  if (gross <= 0) return null;
  return computeGhanaTax2026Monthly(gross);
}
