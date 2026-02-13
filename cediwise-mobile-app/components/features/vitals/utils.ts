import {
  computeGhanaTax2026Monthly,
  type GhanaTaxBreakdown,
} from "@/utils/ghanaTax";
import type { PersonalizationStrategy } from "@/utils/profileVitals";

export function toMoney(value: string): number {
  const n = parseFloat(String(value ?? "").replace(/,/g, ""));
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function clampDay(value: string): number | null {
  const n = parseInt(value, 10);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(31, n));
}

export function computeStrategy(params: {
  stableSalary: number;
  autoTax: boolean;
  sideIncome: number;
  rent: number;
  titheRemittance: number;
  utilitiesTotal: number;
}): {
  strategy: PersonalizationStrategy;
  needsPct: number;
  wantsPct: number;
  savingsPct: number;
  netIncome: number;
  fixedCosts: number;
} {
  const salaryNet = params.autoTax
    ? computeGhanaTax2026Monthly(params.stableSalary).netTakeHome
    : params.stableSalary;
  const netIncome = Math.max(0, salaryNet + params.sideIncome);
  const fixedCosts = Math.max(
    0,
    params.rent + params.titheRemittance + params.utilitiesTotal
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
