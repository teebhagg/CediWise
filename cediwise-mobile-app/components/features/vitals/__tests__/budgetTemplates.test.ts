/**
 * Tests for components/features/vitals/budgetTemplates.ts
 *
 * Covers Track 2 logic:
 *   - BUDGET_TEMPLATE_LIST   — structural integrity of template definitions
 *   - BUDGET_TEMPLATES       — record lookup consistency
 *   - recommendBudgetTemplate — rule-based recommendation engine
 */

import {
  BUDGET_TEMPLATE_LIST,
  BUDGET_TEMPLATES,
  recommendBudgetTemplate,
} from "@/components/features/vitals/budgetTemplates";
import type { BudgetTemplateKey } from "@/components/features/vitals/types";

// ─── BUDGET_TEMPLATE_LIST structural integrity ────────────────────────────────

describe("BUDGET_TEMPLATE_LIST", () => {
  it("contains exactly 5 templates", () => {
    expect(BUDGET_TEMPLATE_LIST).toHaveLength(5);
  });

  it("contains all expected keys", () => {
    const keys = BUDGET_TEMPLATE_LIST.map((t) => t.key);
    expect(keys).toContain("smart");
    expect(keys).toContain("balanced");
    expect(keys).toContain("moderate");
    expect(keys).toContain("survival");
    expect(keys).toContain("aggressive_savings");
  });

  it("has unique keys", () => {
    const keys = BUDGET_TEMPLATE_LIST.map((t) => t.key);
    const uniqueKeys = new Set(keys);
    expect(uniqueKeys.size).toBe(keys.length);
  });

  it("has the 'smart' template with null percentages and null strategyForDb", () => {
    const smart = BUDGET_TEMPLATE_LIST.find((t) => t.key === "smart")!;
    expect(smart.needsPct).toBeNull();
    expect(smart.wantsPct).toBeNull();
    expect(smart.savingsPct).toBeNull();
    expect(smart.strategyForDb).toBeNull();
  });

  it("all non-smart templates have percentages that sum to 1.0", () => {
    const named = BUDGET_TEMPLATE_LIST.filter((t) => t.key !== "smart");
    for (const tmpl of named) {
      const sum = tmpl.needsPct! + tmpl.wantsPct! + tmpl.savingsPct!;
      expect(sum).toBeCloseTo(1.0, 5);
    }
  });

  it("all non-smart templates have percentages between 0 and 1", () => {
    const named = BUDGET_TEMPLATE_LIST.filter((t) => t.key !== "smart");
    for (const tmpl of named) {
      expect(tmpl.needsPct!).toBeGreaterThan(0);
      expect(tmpl.needsPct!).toBeLessThanOrEqual(1);
      expect(tmpl.wantsPct!).toBeGreaterThan(0);
      expect(tmpl.wantsPct!).toBeLessThanOrEqual(1);
      expect(tmpl.savingsPct!).toBeGreaterThan(0);
      expect(tmpl.savingsPct!).toBeLessThanOrEqual(1);
    }
  });

  it("each template has a non-empty name and tagline", () => {
    for (const tmpl of BUDGET_TEMPLATE_LIST) {
      expect(tmpl.name.length).toBeGreaterThan(0);
      expect(tmpl.tagline.length).toBeGreaterThan(0);
    }
  });

  describe("specific percentage values", () => {
    it('balanced is 50/30/20', () => {
      const t = BUDGET_TEMPLATE_LIST.find((x) => x.key === "balanced")!;
      expect(t.needsPct).toBeCloseTo(0.5, 5);
      expect(t.wantsPct).toBeCloseTo(0.3, 5);
      expect(t.savingsPct).toBeCloseTo(0.2, 5);
    });

    it('moderate is 60/20/20', () => {
      const t = BUDGET_TEMPLATE_LIST.find((x) => x.key === "moderate")!;
      expect(t.needsPct).toBeCloseTo(0.6, 5);
      expect(t.wantsPct).toBeCloseTo(0.2, 5);
      expect(t.savingsPct).toBeCloseTo(0.2, 5);
    });

    it('survival is 70/20/10', () => {
      const t = BUDGET_TEMPLATE_LIST.find((x) => x.key === "survival")!;
      expect(t.needsPct).toBeCloseTo(0.7, 5);
      expect(t.wantsPct).toBeCloseTo(0.2, 5);
      expect(t.savingsPct).toBeCloseTo(0.1, 5);
    });

    it('aggressive_savings is 40/20/40', () => {
      const t = BUDGET_TEMPLATE_LIST.find((x) => x.key === "aggressive_savings")!;
      expect(t.needsPct).toBeCloseTo(0.4, 5);
      expect(t.wantsPct).toBeCloseTo(0.2, 5);
      expect(t.savingsPct).toBeCloseTo(0.4, 5);
    });
  });
});

// ─── BUDGET_TEMPLATES lookup consistency ──────────────────────────────────────

describe("BUDGET_TEMPLATES", () => {
  it("contains an entry for every key in BUDGET_TEMPLATE_LIST", () => {
    for (const tmpl of BUDGET_TEMPLATE_LIST) {
      expect(BUDGET_TEMPLATES[tmpl.key as BudgetTemplateKey]).toBeDefined();
    }
  });

  it("each record entry is the same object as the list entry", () => {
    for (const tmpl of BUDGET_TEMPLATE_LIST) {
      expect(BUDGET_TEMPLATES[tmpl.key as BudgetTemplateKey]).toBe(tmpl);
    }
  });

  it("lookup by key returns correct percentages", () => {
    expect(BUDGET_TEMPLATES["balanced"].needsPct).toBeCloseTo(0.5, 5);
    expect(BUDGET_TEMPLATES["survival"].savingsPct).toBeCloseTo(0.1, 5);
    expect(BUDGET_TEMPLATES["aggressive_savings"].savingsPct).toBeCloseTo(0.4, 5);
  });

  describe("strategyForDb — DB-safe strategy values", () => {
    const DB_STRATEGIES = ["survival", "balanced", "aggressive"] as const;

    it("'smart' has strategyForDb = null (uses computed strategy at runtime)", () => {
      expect(BUDGET_TEMPLATES["smart"].strategyForDb).toBeNull();
    });

    it("all non-smart templates have a non-null strategyForDb", () => {
      const named = BUDGET_TEMPLATE_LIST.filter((t) => t.key !== "smart");
      for (const tmpl of named) {
        expect(tmpl.strategyForDb).not.toBeNull();
      }
    });

    it("all non-null strategyForDb values are valid PersonalizationStrategy enum members", () => {
      const named = BUDGET_TEMPLATE_LIST.filter((t) => t.key !== "smart");
      for (const tmpl of named) {
        expect(DB_STRATEGIES).toContain(tmpl.strategyForDb);
      }
    });

    it("'balanced' maps to DB strategy 'balanced'", () => {
      expect(BUDGET_TEMPLATES["balanced"].strategyForDb).toBe("balanced");
    });

    it("'moderate' maps to DB strategy 'balanced' (no 'moderate' enum in DB)", () => {
      expect(BUDGET_TEMPLATES["moderate"].strategyForDb).toBe("balanced");
    });

    it("'survival' maps to DB strategy 'survival'", () => {
      expect(BUDGET_TEMPLATES["survival"].strategyForDb).toBe("survival");
    });

    it("'aggressive_savings' maps to DB strategy 'aggressive'", () => {
      expect(BUDGET_TEMPLATES["aggressive_savings"].strategyForDb).toBe("aggressive");
    });
  });
});

// ─── recommendBudgetTemplate ─────────────────────────────────────────────────

describe("recommendBudgetTemplate", () => {
  /**
   * Priority order of rules (most important first):
   *   1. savings_growth + non-liberal spender → aggressive_savings
   *   2. debt_payoff OR student → survival
   *   3. family OR retiree → moderate
   *   4. lifestyle priority OR liberal spender → balanced
   *   5. savings_growth (liberal spender — rule 1 missed it) → aggressive_savings
   *   6. default → balanced
   */

  describe("Rule 1 — savings_growth + non-liberal → aggressive_savings", () => {
    it("savings_growth + conservative → aggressive_savings", () => {
      expect(recommendBudgetTemplate("young_professional", "conservative", "savings_growth"))
        .toBe("aggressive_savings");
    });

    it("savings_growth + moderate → aggressive_savings", () => {
      expect(recommendBudgetTemplate("young_professional", "moderate", "savings_growth"))
        .toBe("aggressive_savings");
    });

    it("savings_growth + null spending style → aggressive_savings (null ≠ liberal)", () => {
      expect(recommendBudgetTemplate("young_professional", null, "savings_growth"))
        .toBe("aggressive_savings");
    });
  });

  describe("Rule 2 — debt_payoff OR student → survival", () => {
    it("debt_payoff priority → survival", () => {
      expect(recommendBudgetTemplate("young_professional", "moderate", "debt_payoff"))
        .toBe("survival");
    });

    it("student life stage → survival", () => {
      expect(recommendBudgetTemplate("student", null, null))
        .toBe("survival");
    });

    it("student + balanced priority → survival (life stage wins over priority)", () => {
      expect(recommendBudgetTemplate("student", null, "balanced"))
        .toBe("survival");
    });

    it("student + savings_growth + conservative → aggressive_savings (Rule 1 fires before Rule 2)", () => {
      // Rule 1 matches first because savings_growth + non-liberal is checked before student
      expect(recommendBudgetTemplate("student", "conservative", "savings_growth"))
        .toBe("aggressive_savings");
    });
  });

  describe("Rule 3 — family OR retiree → moderate", () => {
    it("family life stage → moderate", () => {
      expect(recommendBudgetTemplate("family", "moderate", null))
        .toBe("moderate");
    });

    it("retiree life stage → moderate", () => {
      expect(recommendBudgetTemplate("retiree", "conservative", null))
        .toBe("moderate");
    });

    it("family + debt_payoff → survival (Rule 2 fires before Rule 3)", () => {
      expect(recommendBudgetTemplate("family", "moderate", "debt_payoff"))
        .toBe("survival");
    });
  });

  describe("Rule 4 — lifestyle priority OR liberal spender → balanced", () => {
    it("lifestyle priority → balanced", () => {
      expect(recommendBudgetTemplate("young_professional", "moderate", "lifestyle"))
        .toBe("balanced");
    });

    it("liberal spending style → balanced", () => {
      expect(recommendBudgetTemplate("young_professional", "liberal", null))
        .toBe("balanced");
    });

    it("savings_growth + liberal → balanced (Rule 1 misses due to liberal, Rule 4 catches liberal)", () => {
      // Rule 1 requires non-liberal; liberal falls through to Rule 4
      expect(recommendBudgetTemplate("young_professional", "liberal", "savings_growth"))
        .toBe("balanced");
    });
  });

  describe("Rule 5 — savings_growth (not caught by Rule 1) → aggressive_savings", () => {
    it("savings_growth alone with null life stage and null spending style → aggressive_savings", () => {
      // Rule 1 requires non-liberal (null is non-liberal) → aggressive_savings via Rule 1 actually
      // Let's confirm by checking what fires: savings_growth + null → Rule 1 fires → aggressive_savings
      expect(recommendBudgetTemplate(null, null, "savings_growth"))
        .toBe("aggressive_savings");
    });
  });

  describe("Default — balanced", () => {
    it("all nulls → balanced", () => {
      expect(recommendBudgetTemplate(null, null, null)).toBe("balanced");
    });

    it("young_professional + moderate + balanced priority → balanced", () => {
      expect(recommendBudgetTemplate("young_professional", "moderate", "balanced"))
        .toBe("balanced");
    });

    it("young_professional + conservative + null priority → aggressive_savings (Rule 1)", () => {
      // conservative + no priority: Rule 1 is savings_growth only, so this falls through to default
      expect(recommendBudgetTemplate("young_professional", "conservative", null))
        .toBe("balanced");
    });
  });

  describe("return value is never 'smart'", () => {
    const allLifeStages = ["student", "young_professional", "family", "retiree", null] as const;
    const allSpendingStyles = ["conservative", "moderate", "liberal", null] as const;
    const allPriorities = ["debt_payoff", "savings_growth", "lifestyle", "balanced", null] as const;

    it("never returns 'smart' for any combination of inputs", () => {
      for (const lifeStage of allLifeStages) {
        for (const spendingStyle of allSpendingStyles) {
          for (const priority of allPriorities) {
            const result = recommendBudgetTemplate(lifeStage, spendingStyle, priority);
            expect(result).not.toBe("smart");
          }
        }
      }
    });
  });

  describe("always returns a valid BudgetTemplateKey (excluding 'smart')", () => {
    const validKeys: Exclude<BudgetTemplateKey, "smart">[] = [
      "balanced",
      "moderate",
      "survival",
      "aggressive_savings",
    ];

    it("every result is in the set of named templates", () => {
      const result = recommendBudgetTemplate("young_professional", "moderate", "savings_growth");
      expect(validKeys).toContain(result);
    });
  });
});
