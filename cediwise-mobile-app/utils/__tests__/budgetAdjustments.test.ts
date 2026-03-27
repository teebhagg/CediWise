import {
  formatAdjustmentType,
  formatAdjustmentChanges,
} from "../budgetAdjustments";

describe("formatAdjustmentType", () => {
  it.each([
    ["vitals_change", "Vitals Updated"],
    ["manual", "Manual Adjustment"],
    ["auto_reallocation", "Auto Reallocation"],
    ["template_applied", "Template Applied"],
    ["rollover", "Budget Rollover"],
    ["income_change", "Income Changed"],
    ["category_change", "Category Updated"],
  ] as const)('maps "%s" to "%s"', (type, label) => {
    expect(formatAdjustmentType(type)).toBe(label);
  });

  it("returns raw type for unknown adjustment type", () => {
    expect(formatAdjustmentType("unknown_type" as any)).toBe("unknown_type");
  });
});

describe("formatAdjustmentChanges", () => {
  it("formats from/to diff showing changed fields", () => {
    const changes = {
      from: { needsPct: 0.5, wantsPct: 0.3, savingsPct: 0.2 },
      to: { needsPct: 0.6, wantsPct: 0.2, savingsPct: 0.2 },
    };
    const result = formatAdjustmentChanges(changes);
    expect(result).toContain("needsPct");
    expect(result).toContain("0.5");
    expect(result).toContain("0.6");
    expect(result).toContain("wantsPct");
    // savingsPct unchanged, should not appear
    expect(result).not.toContain("savingsPct");
  });

  it("outputs JSON for generic changes without from/to", () => {
    const changes = { categoryId: "cat1", limitAmount: 500 };
    const result = formatAdjustmentChanges(changes);
    const parsed = JSON.parse(result);
    expect(parsed.categoryId).toBe("cat1");
    expect(parsed.limitAmount).toBe(500);
  });

  it("uses arrow separator for from/to diffs", () => {
    const changes = {
      from: { amount: 100 },
      to: { amount: 200 },
    };
    const result = formatAdjustmentChanges(changes);
    expect(result).toContain("→");
  });

  it("handles empty changes object", () => {
    const result = formatAdjustmentChanges({});
    expect(result).toBeDefined();
    expect(typeof result).toBe("string");
  });

  it("handles from/to with no actual changes", () => {
    const changes = {
      from: { amount: 100 },
      to: { amount: 100 },
    };
    const result = formatAdjustmentChanges(changes);
    // No changed fields, should return empty or minimal
    expect(typeof result).toBe("string");
  });
});
