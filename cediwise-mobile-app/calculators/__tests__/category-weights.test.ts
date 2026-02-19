import {
  computeWeightedCategoryLimits,
  getCategoryWeight,
} from "../category-weights";

describe("getCategoryWeight", () => {
  it("returns higher weight for Rent than Trash in needs", () => {
    const rentWeight = getCategoryWeight("Rent", "needs");
    const trashWeight = getCategoryWeight("Trash", "needs");
    expect(rentWeight).toBeGreaterThan(trashWeight);
  });

  it("returns default for unknown category", () => {
    const w = getCategoryWeight("UnknownCategory", "needs");
    expect(w).toBeGreaterThan(0);
  });

  it("applies life stage boost for School Fees in family", () => {
    const base = getCategoryWeight("School Fees", "needs");
    const family = getCategoryWeight("School Fees", "needs", "family");
    expect(family).toBeGreaterThan(base);
  });
});

describe("computeWeightedCategoryLimits", () => {
  it("distributes bucket total by weight", () => {
    const limits = computeWeightedCategoryLimits(
      1000,
      [
        {
          name: "Rent",
          bucket: "needs",
          fixedAmount: undefined,
          manualOverride: false,
        },
        {
          name: "Trash",
          bucket: "needs",
          fixedAmount: undefined,
          manualOverride: false,
        },
      ],
      null
    );
    const rentLimit = limits.get("Rent");
    const trashLimit = limits.get("Trash");
    expect(rentLimit).toBeGreaterThan(trashLimit!);
    expect((rentLimit ?? 0) + (trashLimit ?? 0)).toBeCloseTo(1000, 0);
  });

  it("locks fixed amounts and distributes remainder", () => {
    const limits = computeWeightedCategoryLimits(
      1000,
      [
        {
          name: "Rent",
          bucket: "needs",
          fixedAmount: 600,
          manualOverride: false,
        },
        {
          name: "Trash",
          bucket: "needs",
          fixedAmount: undefined,
          manualOverride: false,
        },
      ],
      null
    );
    expect(limits.get("Rent")).toBe(600);
    const trashLimit = limits.get("Trash") ?? 0;
    expect(trashLimit).toBeCloseTo(400, -1);
  });

  it("preserves manual override (excludes from allocation)", () => {
    const limits = computeWeightedCategoryLimits(
      1000,
      [
        { name: "Rent", bucket: "needs", manualOverride: true },
        { name: "Trash", bucket: "needs", manualOverride: false },
      ],
      null
    );
    expect(limits.has("Rent")).toBe(false);
    expect(limits.get("Trash")).toBeCloseTo(1000, -1);
  });
});
