import { dedupeAIProfileSuggestions } from "../dedupeSuggestions";
import type { AIProfileSuggestions } from "@/types/ai";

function baseSuggestions(
  overrides: Partial<AIProfileSuggestions> = {},
): AIProfileSuggestions {
  return {
    templateKey: "balanced",
    templateReason: "Test",
    budgetSplit: {
      needsPct: 0.5,
      wantsPct: 0.3,
      savingsPct: 0.2,
      reason: "test",
    },
    categories: [],
    recurringExpenses: [],
    goals: [],
    economicContext: {
      inflationRate: 0,
      snapshotDate: "2026-01-01",
      currencySymbol: "₵",
    },
    ...overrides,
  };
}

describe("dedupeAIProfileSuggestions", () => {
  it("merges duplicate category names via aliases", () => {
    const result = dedupeAIProfileSuggestions(
      baseSuggestions({
        categories: [
          {
            id: "1",
            name: "Groceries",
            bucket: "needs",
            suggestedLimit: 400,
            reason: "a",
            confidence: 0.9,
            accepted: false,
          },
          {
            id: "2",
            name: "Food",
            bucket: "needs",
            suggestedLimit: 500,
            reason: "b",
            confidence: 0.8,
            accepted: false,
          },
        ],
      }),
    );

    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].name).toBe("Groceries");
    expect(result.categories[0].suggestedLimit).toBe(400);
    expect(result.categories[1].name).toBe("Others");
  });

  it("drops category when rent also appears in recurring", () => {
    const result = dedupeAIProfileSuggestions(
      baseSuggestions({
        categories: [
          {
            id: "cat-rent",
            name: "Rent",
            bucket: "needs",
            suggestedLimit: 1200,
            reason: "a",
            confidence: 0.9,
            accepted: false,
          },
        ],
        recurringExpenses: [
          {
            id: "rec-housing",
            name: "Housing",
            bucket: "needs",
            amount: 1200,
            reason: "b",
            confidence: 0.9,
            accepted: false,
          },
        ],
      }),
    );

    expect(result.categories).toHaveLength(1);
    expect(result.categories[0].name).toBe("Others");
    expect(result.recurringExpenses).toHaveLength(1);
    expect(result.recurringExpenses[0].name).toBe("Housing");
  });

  it("coerces transport into needs", () => {
    const result = dedupeAIProfileSuggestions(
      baseSuggestions({
        categories: [
          {
            id: "t1",
            name: "Uber",
            bucket: "wants",
            suggestedLimit: 200,
            reason: "a",
            confidence: 0.9,
            accepted: false,
          },
        ],
      }),
    );

    const transport = result.categories.find((c) => c.id === "t1");
    expect(transport?.bucket).toBe("needs");
  });

  it("always appends wants Others at zero", () => {
    const result = dedupeAIProfileSuggestions(baseSuggestions());
    const others = result.categories.find((c) => c.name === "Others");
    expect(others).toBeDefined();
    expect(others?.bucket).toBe("wants");
    expect(others?.suggestedLimit).toBe(0);
  });

  it("drops recurring when groceries also appears as category", () => {
    const result = dedupeAIProfileSuggestions(
      baseSuggestions({
        categories: [
          {
            id: "cat-food",
            name: "Groceries",
            bucket: "needs",
            suggestedLimit: 600,
            reason: "a",
            confidence: 0.9,
            accepted: false,
          },
        ],
        recurringExpenses: [
          {
            id: "rec-food",
            name: "Food",
            bucket: "needs",
            amount: 600,
            reason: "b",
            confidence: 0.9,
            accepted: false,
          },
        ],
      }),
    );

    expect(result.categories).toHaveLength(2);
    expect(result.categories[0].name).toBe("Groceries");
    expect(result.categories[1].name).toBe("Others");
    expect(result.recurringExpenses).toHaveLength(0);
  });
});
