import { expenseLabelsMatch, expenseMatchesPriority } from "../expenseMatching";

describe("expenseMatchesPriority", () => {
  it("matches rent synonyms", () => {
    expect(expenseMatchesPriority("Housing / Rent", ["Rent"])).toBe(true);
  });

  it("matches utilities to ECG", () => {
    expect(expenseMatchesPriority("ECG Bill", ["Utilities"])).toBe(true);
  });

  it("returns false with empty priorities", () => {
    expect(expenseMatchesPriority("Groceries", [])).toBe(false);
  });
});

describe("expenseLabelsMatch", () => {
  it("matches dining out and restaurant", () => {
    expect(expenseLabelsMatch("Dining Out", "Restaurant")).toBe(true);
  });

  it("matches subscriptions separately from entertainment", () => {
    expect(expenseMatchesPriority("Netflix", ["Subscriptions"])).toBe(true);
    expect(expenseMatchesPriority("Netflix", ["Entertainment"])).toBe(false);
    expect(expenseMatchesPriority("Cinema", ["Entertainment"])).toBe(true);
  });
});
