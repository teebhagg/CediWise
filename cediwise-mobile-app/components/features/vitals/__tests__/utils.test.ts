/**
 * Tests for components/features/vitals/utils.ts
 *
 * Covers Track 2 logic:
 *   - toMonthlySalary        — frequency conversion
 *   - toMoney                — string → number parsing
 *   - inferTemplateFromPercentages — template matching from stored pcts
 *   - vitalsToInitialDraft   — ProfileVitals → Draft hydration for edit mode
 */

import {
  toMonthlySalary,
  toMoney,
  inferTemplateFromPercentages,
  vitalsToInitialDraft,
} from "@/components/features/vitals/utils";
import type { ProfileVitals } from "@/utils/profileVitals";

// ─── Shared fixture ────────────────────────────────────────────────────────────

/** A fully-populated ProfileVitals record representing a real saved profile. */
const FULL_VITALS: ProfileVitals = {
  setup_completed: true,
  payday_day: 25,
  interests: ["Tech", "Food", "Travel"],
  stable_salary: 5000,
  auto_tax: true,
  side_income: 500,
  rent: 1000,
  tithe_remittance: 200,
  debt_obligations: 300,
  utilities_mode: "general",
  utilities_total: 150,
  utilities_ecg: 0,
  utilities_water: 0,
  primary_goal: "emergency_fund",
  strategy: "balanced",
  needs_pct: 0.5,
  wants_pct: 0.3,
  savings_pct: 0.2,
  life_stage: "young_professional",
  spending_style: "moderate",
  financial_priority: "savings_growth",
  income_frequency: "bi_weekly",
  dependents_count: 0,
  profile_version: 1,
};

/** A minimal ProfileVitals record with zeros and nulls — simulates old/bare profiles. */
const BARE_VITALS: ProfileVitals = {
  setup_completed: false,
  payday_day: null,
  interests: [],
  stable_salary: 0,
  auto_tax: false,
  side_income: 0,
  rent: 0,
  tithe_remittance: 0,
  debt_obligations: 0,
  utilities_mode: "general",
  utilities_total: 0,
  utilities_ecg: 0,
  utilities_water: 0,
  primary_goal: null,
  strategy: null,
  needs_pct: null,
  wants_pct: null,
  savings_pct: null,
  life_stage: null,
  spending_style: null,
  financial_priority: null,
  income_frequency: "monthly",
  dependents_count: 0,
  profile_version: 0,
};

// ─── toMonthlySalary ──────────────────────────────────────────────────────────

describe("toMonthlySalary", () => {
  it("returns the same value for monthly frequency", () => {
    expect(toMonthlySalary(3000, "monthly")).toBe(3000);
  });

  it("converts weekly to monthly (× 52/12)", () => {
    expect(toMonthlySalary(1200, "weekly")).toBeCloseTo(1200 * (52 / 12), 5);
  });

  it("converts bi_weekly to monthly (× 26/12)", () => {
    expect(toMonthlySalary(2400, "bi_weekly")).toBeCloseTo(2400 * (26 / 12), 5);
  });

  it("returns 0 for zero input regardless of frequency", () => {
    expect(toMonthlySalary(0, "monthly")).toBe(0);
    expect(toMonthlySalary(0, "weekly")).toBe(0);
    expect(toMonthlySalary(0, "bi_weekly")).toBe(0);
  });

  it("returns 0 for negative input", () => {
    expect(toMonthlySalary(-500, "monthly")).toBe(0);
    expect(toMonthlySalary(-100, "weekly")).toBe(0);
  });

  it("preserves fractional amounts", () => {
    const result = toMonthlySalary(1500.5, "monthly");
    expect(result).toBe(1500.5);
  });
});

// ─── toMoney ──────────────────────────────────────────────────────────────────

describe("toMoney", () => {
  it("parses a plain numeric string", () => {
    expect(toMoney("1200")).toBe(1200);
  });

  it("strips commas before parsing", () => {
    expect(toMoney("1,200.50")).toBeCloseTo(1200.5, 5);
    expect(toMoney("10,000")).toBe(10000);
  });

  it("returns 0 for an empty string", () => {
    expect(toMoney("")).toBe(0);
  });

  it("returns 0 for non-numeric strings", () => {
    expect(toMoney("abc")).toBe(0);
    expect(toMoney("GHS 500")).toBe(0);
  });

  it("returns 0 for zero string", () => {
    expect(toMoney("0")).toBe(0);
  });

  it("returns 0 for negative values (not positive)", () => {
    expect(toMoney("-100")).toBe(0);
  });

  it("parses decimal-only values", () => {
    expect(toMoney("0.99")).toBeCloseTo(0.99, 5);
  });
});

// ─── inferTemplateFromPercentages ─────────────────────────────────────────────

describe("inferTemplateFromPercentages", () => {
  describe("exact template matches", () => {
    it('matches "balanced" for 50/30/20', () => {
      expect(inferTemplateFromPercentages(0.5, 0.3, 0.2)).toBe("balanced");
    });

    it('matches "moderate" for 60/20/20', () => {
      expect(inferTemplateFromPercentages(0.6, 0.2, 0.2)).toBe("moderate");
    });

    it('matches "survival" for 70/20/10', () => {
      expect(inferTemplateFromPercentages(0.7, 0.2, 0.1)).toBe("survival");
    });

    it('matches "aggressive_savings" for 40/20/40', () => {
      expect(inferTemplateFromPercentages(0.4, 0.2, 0.4)).toBe("aggressive_savings");
    });
  });

  describe("tolerance matching (< 0.1%)", () => {
    it("matches within tolerance on needsPct", () => {
      expect(inferTemplateFromPercentages(0.5001, 0.3, 0.2)).toBe("balanced");
    });

    it("matches within tolerance on wantsPct", () => {
      expect(inferTemplateFromPercentages(0.5, 0.3001, 0.2)).toBe("balanced");
    });

    it("matches within tolerance on savingsPct", () => {
      expect(inferTemplateFromPercentages(0.5, 0.3, 0.2001)).toBe("balanced");
    });

    it("does NOT match when outside tolerance", () => {
      expect(inferTemplateFromPercentages(0.55, 0.3, 0.15)).toBe("smart");
    });
  });

  describe("no-match cases return 'smart'", () => {
    it("returns 'smart' for a custom split that matches no template", () => {
      expect(inferTemplateFromPercentages(0.45, 0.35, 0.2)).toBe("smart");
    });

    it("returns 'smart' when needsPct is null", () => {
      expect(inferTemplateFromPercentages(null, 0.3, 0.2)).toBe("smart");
    });

    it("returns 'smart' when wantsPct is null", () => {
      expect(inferTemplateFromPercentages(0.5, null, 0.2)).toBe("smart");
    });

    it("returns 'smart' when savingsPct is null", () => {
      expect(inferTemplateFromPercentages(0.5, 0.3, null)).toBe("smart");
    });

    it("returns 'smart' when all percentages are null", () => {
      expect(inferTemplateFromPercentages(null, null, null)).toBe("smart");
    });

    it("returns 'smart' for zeros (no saved template)", () => {
      expect(inferTemplateFromPercentages(0, 0, 0)).toBe("smart");
    });
  });

  describe("does not return 'smart' as a named template match", () => {
    it("never matches the 'smart' template entry itself (it has null percentages)", () => {
      // smart template has needsPct=null so it is always skipped in iteration
      const result = inferTemplateFromPercentages(0.5, 0.3, 0.2);
      expect(result).not.toBeNull();
      expect(result).toBe("balanced"); // 'smart' was skipped
    });
  });
});

// ─── vitalsToInitialDraft ─────────────────────────────────────────────────────

describe("vitalsToInitialDraft", () => {
  describe("step and non-recoverable fields", () => {
    it("always sets step to 0", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).step).toBe(0);
      expect(vitalsToInitialDraft(BARE_VITALS).step).toBe(0);
    });

    it("always returns empty recurringExpenses (not stored in profile)", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).recurringExpenses).toEqual([]);
    });

    it("always returns empty goalAmount string", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).goalAmount).toBe("");
    });

    it("always returns empty goalTimeline string", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).goalTimeline).toBe("");
    });
  });

  describe("stableSalary mapping", () => {
    it("stringifies a positive stable_salary directly", () => {
      const draft = vitalsToInitialDraft(FULL_VITALS);
      expect(draft.stableSalary).toBe("5000");
    });

    it("returns empty string when stable_salary is 0", () => {
      const draft = vitalsToInitialDraft(BARE_VITALS);
      expect(draft.stableSalary).toBe("");
    });

    it("returns empty string when stable_salary is negative", () => {
      const draft = vitalsToInitialDraft({ ...FULL_VITALS, stable_salary: -100 });
      expect(draft.stableSalary).toBe("");
    });

    it("preserves fractional salary values", () => {
      const draft = vitalsToInitialDraft({ ...FULL_VITALS, stable_salary: 4500.75 });
      expect(draft.stableSalary).toBe("4500.75");
    });
  });

  describe("direct field mappings", () => {
    it("maps auto_tax correctly", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).autoTax).toBe(true);
      expect(vitalsToInitialDraft({ ...FULL_VITALS, auto_tax: false }).autoTax).toBe(false);
    });

    it("maps payday_day, falling back to 1 when null", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).paydayDay).toBe(25);
      expect(vitalsToInitialDraft(BARE_VITALS).paydayDay).toBe(1);
    });

    it("maps income_frequency", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).incomeFrequency).toBe("bi_weekly");
      expect(vitalsToInitialDraft(BARE_VITALS).incomeFrequency).toBe("monthly");
    });

    it("maps life_stage, null → null", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).lifeStage).toBe("young_professional");
      expect(vitalsToInitialDraft(BARE_VITALS).lifeStage).toBeNull();
    });

    it("maps spending_style, null → null", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).spendingStyle).toBe("moderate");
      expect(vitalsToInitialDraft(BARE_VITALS).spendingStyle).toBeNull();
    });

    it("maps financial_priority, null → null", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).financialPriority).toBe("savings_growth");
      expect(vitalsToInitialDraft(BARE_VITALS).financialPriority).toBeNull();
    });

    it("maps primary_goal to goalType, null → null", () => {
      expect(vitalsToInitialDraft(FULL_VITALS).goalType).toBe("emergency_fund");
      expect(vitalsToInitialDraft(BARE_VITALS).goalType).toBeNull();
    });

    it("maps all GoalType values correctly", () => {
      expect(vitalsToInitialDraft({ ...FULL_VITALS, primary_goal: "project" }).goalType).toBe("project");
      expect(vitalsToInitialDraft({ ...FULL_VITALS, primary_goal: "investment" }).goalType).toBe("investment");
    });
  });

  describe("interests mapping", () => {
    it("maps a non-empty interests array directly", () => {
      const draft = vitalsToInitialDraft(FULL_VITALS);
      expect(draft.interests).toEqual(["Tech", "Food", "Travel"]);
    });

    it("maps an empty interests array to []", () => {
      const draft = vitalsToInitialDraft(BARE_VITALS);
      expect(draft.interests).toEqual([]);
    });

    it("maps null interests to []", () => {
      const draft = vitalsToInitialDraft({ ...BARE_VITALS, interests: null as any });
      expect(draft.interests).toEqual([]);
    });
  });

  describe("selectedTemplate inference", () => {
    it('infers "balanced" from 50/30/20 stored percentages', () => {
      const draft = vitalsToInitialDraft({ ...FULL_VITALS, needs_pct: 0.5, wants_pct: 0.3, savings_pct: 0.2 });
      expect(draft.selectedTemplate).toBe("balanced");
    });

    it('infers "moderate" from 60/20/20 stored percentages', () => {
      const draft = vitalsToInitialDraft({ ...FULL_VITALS, needs_pct: 0.6, wants_pct: 0.2, savings_pct: 0.2 });
      expect(draft.selectedTemplate).toBe("moderate");
    });

    it('infers "survival" from 70/20/10 stored percentages', () => {
      const draft = vitalsToInitialDraft({ ...FULL_VITALS, needs_pct: 0.7, wants_pct: 0.2, savings_pct: 0.1 });
      expect(draft.selectedTemplate).toBe("survival");
    });

    it('infers "aggressive_savings" from 40/20/40 stored percentages', () => {
      const draft = vitalsToInitialDraft({ ...FULL_VITALS, needs_pct: 0.4, wants_pct: 0.2, savings_pct: 0.4 });
      expect(draft.selectedTemplate).toBe("aggressive_savings");
    });

    it('falls back to "smart" when percentages are null (never set a template)', () => {
      const draft = vitalsToInitialDraft(BARE_VITALS);
      expect(draft.selectedTemplate).toBe("smart");
    });

    it('falls back to "smart" for a custom split that matches no named template', () => {
      const draft = vitalsToInitialDraft({ ...FULL_VITALS, needs_pct: 0.55, wants_pct: 0.25, savings_pct: 0.2 });
      expect(draft.selectedTemplate).toBe("smart");
    });
  });

  describe("full round-trip from a real profile", () => {
    it("produces a fully-typed Draft with no undefined fields", () => {
      const draft = vitalsToInitialDraft(FULL_VITALS);

      expect(draft.step).toBeDefined();
      expect(draft.stableSalary).toBeDefined();
      expect(draft.autoTax).toBeDefined();
      expect(draft.paydayDay).toBeDefined();
      expect(draft.incomeFrequency).toBeDefined();
      expect(draft.lifeStage).not.toBeUndefined();
      expect(draft.spendingStyle).not.toBeUndefined();
      expect(draft.financialPriority).not.toBeUndefined();
      expect(draft.interests).toBeDefined();
      expect(draft.selectedTemplate).toBeDefined();
      expect(draft.recurringExpenses).toBeDefined();
      expect(draft.goalType).not.toBeUndefined();
      expect(draft.goalAmount).toBeDefined();
      expect(draft.goalTimeline).toBeDefined();
    });

    it("FULL_VITALS produces the exact expected Draft", () => {
      const draft = vitalsToInitialDraft(FULL_VITALS);
      expect(draft).toMatchObject({
        step: 0,
        stableSalary: "5000",
        autoTax: true,
        paydayDay: 25,
        incomeFrequency: "bi_weekly",
        lifeStage: "young_professional",
        spendingStyle: "moderate",
        financialPriority: "savings_growth",
        interests: ["Tech", "Food", "Travel"],
        selectedTemplate: "balanced",
        recurringExpenses: [],
        goalType: "emergency_fund",
        goalAmount: "",
        goalTimeline: "",
      });
    });

    it("BARE_VITALS produces the expected Draft with all safe defaults", () => {
      const draft = vitalsToInitialDraft(BARE_VITALS);
      expect(draft).toMatchObject({
        step: 0,
        stableSalary: "",
        autoTax: false,
        paydayDay: 1,
        incomeFrequency: "monthly",
        lifeStage: null,
        spendingStyle: null,
        financialPriority: null,
        interests: [],
        selectedTemplate: "smart",
        recurringExpenses: [],
        goalType: null,
        goalAmount: "",
        goalTimeline: "",
      });
    });
  });
});
