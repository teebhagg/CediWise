import {
  computeBudgetHealthScore,
  generateAdvisorRecommendations,
} from "../budget-advisor";

describe("generateAdvisorRecommendations", () => {
  it("returns overspend recommendation when spent > limit", () => {
    const recs = generateAdvisorRecommendations([
      {
        categoryId: "1",
        categoryName: "Groceries",
        spent: 500,
        limit: 400,
      },
    ]);
    expect(recs.length).toBeGreaterThan(0);
    expect(
      recs.some((r) => r.type === "overspend" && r.context === "Groceries")
    ).toBe(true);
  });

  it("returns underspend recommendation when significantly under", () => {
    const recs = generateAdvisorRecommendations([
      {
        categoryId: "1",
        categoryName: "Dining Out",
        spent: 50,
        limit: 200,
        avgSpent: 150,
      },
    ]);
    const underspend = recs.find((r) => r.type === "underspend");
    expect(underspend).toBeDefined();
  });

  it("Phase 2: does not suggest underspend for needs bucket", () => {
    const recs = generateAdvisorRecommendations([
      {
        categoryId: "1",
        categoryName: "Rent",
        bucket: "needs",
        spent: 50,
        limit: 500,
        avgSpent: 400,
        confidence: 0.8,
        variance: 10,
      },
    ]);
    const underspend = recs.find((r) => r.type === "underspend");
    expect(underspend).toBeUndefined();
  });

  it("Phase 4: returns empty for empty insights", () => {
    expect(generateAdvisorRecommendations([])).toEqual([]);
  });

  it("Phase 4: handles invalid/edge insight values without crashing", () => {
    const recs = generateAdvisorRecommendations([
      {
        categoryId: "1",
        categoryName: "Test",
        spent: NaN,
        limit: 100,
      },
      {
        categoryId: "2",
        categoryName: "Valid",
        spent: 500,
        limit: 400,
      },
    ]);
    // Should skip NaN insight, still produce rec for valid
    expect(recs.some((r) => r.context === "Valid")).toBe(true);
  });

  it("sorts by priority", () => {
    const recs = generateAdvisorRecommendations([
      { categoryId: "1", categoryName: "A", spent: 500, limit: 400 },
      {
        categoryId: "2",
        categoryName: "B",
        spent: 100,
        limit: 200,
        avgSpent: 150,
      },
    ]);
    if (recs.length >= 2) {
      const order = { high: 0, medium: 1, low: 2 };
      expect(order[recs[0].priority]).toBeLessThanOrEqual(
        order[recs[1].priority]
      );
    }
  });
});

describe("computeBudgetHealthScore", () => {
  it("returns high score when within limits", () => {
    const { score } = computeBudgetHealthScore({
      needsSpent: 800,
      wantsSpent: 400,
      savingsSpent: 300,
      needsLimit: 1000,
      wantsLimit: 600,
      savingsLimit: 400,
      categoriesOver: 0,
      categoriesTotal: 10,
    });
    expect(score).toBeGreaterThanOrEqual(75);
  });

  it("returns lower score when needs overspent", () => {
    const { score } = computeBudgetHealthScore({
      needsSpent: 1200,
      wantsSpent: 400,
      savingsSpent: 0,
      needsLimit: 1000,
      wantsLimit: 600,
      savingsLimit: 400,
      categoriesOver: 2,
      categoriesTotal: 10,
    });
    expect(score).toBeLessThan(75);
  });

  it("returns score between 0 and 100", () => {
    const { score } = computeBudgetHealthScore({
      needsSpent: 2000,
      wantsSpent: 1000,
      savingsSpent: 0,
      needsLimit: 500,
      wantsLimit: 300,
      savingsLimit: 200,
      categoriesOver: 8,
      categoriesTotal: 10,
    });
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(100);
  });
});
