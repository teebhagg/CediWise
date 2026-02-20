import type { BudgetTemplate } from "../../types/budget";
import { getBestMatchingTemplate, matchTemplates } from "../template-matcher";

const mockTemplates: BudgetTemplate[] = [
  {
    id: "1",
    name: "Student Budget",
    description: "For students",
    targetAudience: "students",
    lifeStage: "student",
    needsPct: 0.65,
    wantsPct: 0.25,
    savingsPct: 0.1,
    recommendedCategories: {
      needs: ["Rent", "Transport"],
      wants: ["Dining Out"],
      savings: ["Emergency Fund"],
    },
    isDefault: false,
    sortOrder: 1,
    createdAt: "",
  },
  {
    id: "2",
    name: "Young Professional",
    description: "Balanced",
    targetAudience: "professionals",
    lifeStage: "young_professional",
    needsPct: 0.5,
    wantsPct: 0.3,
    savingsPct: 0.2,
    recommendedCategories: {
      needs: ["Rent"],
      wants: ["Dining Out"],
      savings: ["Emergency Fund"],
    },
    isDefault: true,
    sortOrder: 2,
    createdAt: "",
  },
  {
    id: "3",
    name: "Debt Crusher",
    description: "For debt payoff",
    targetAudience: "debt",
    lifeStage: null,
    needsPct: 0.7,
    wantsPct: 0.15,
    savingsPct: 0.15,
    recommendedCategories: {
      needs: ["Debt Payments"],
      wants: [],
      savings: ["Debt Payoff Fund"],
    },
    isDefault: false,
    sortOrder: 3,
    createdAt: "",
  },
];

describe("matchTemplates", () => {
  it("scores student template highest for student profile", () => {
    const scored = matchTemplates(
      {
        lifeStage: "student",
        idealAllocation: { needsPct: 0.6, wantsPct: 0.25, savingsPct: 0.15 },
      },
      mockTemplates
    );
    expect(scored[0].id).toBe("1");
    expect(scored[0].score).toBeGreaterThan(scored[1].score);
    expect(scored[0].reasons.length).toBeGreaterThan(0);
  });

  it("scores debt template for debt_payoff priority", () => {
    const scored = matchTemplates(
      { financialPriority: "debt_payoff" },
      mockTemplates
    );
    const debtTemplate = scored.find((t) => t.name === "Debt Crusher");
    expect(debtTemplate).toBeDefined();
    expect(
      debtTemplate!.reasons.some((r) => r.toLowerCase().includes("debt"))
    ).toBe(true);
  });

  it("returns templates sorted by score descending", () => {
    const scored = matchTemplates(
      { lifeStage: "young_professional" },
      mockTemplates
    );
    for (let i = 1; i < scored.length; i++) {
      expect(scored[i].score).toBeLessThanOrEqual(scored[i - 1].score);
    }
  });
});

describe("getBestMatchingTemplate", () => {
  it("returns top template", () => {
    const best = getBestMatchingTemplate(
      { lifeStage: "student" },
      mockTemplates
    );
    expect(best).not.toBeNull();
    expect(best!.id).toBe("1");
  });

  it("returns null for empty templates", () => {
    const best = getBestMatchingTemplate({ lifeStage: "student" }, []);
    expect(best).toBeNull();
  });
});
