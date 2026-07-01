import type { BudgetCategory } from "@/types/budget";
import {
  applyRebalancePreview,
  buildRebalancePreview,
  formatRebalancePreviewRowLabel,
} from "@/utils/budgetRebalance";
import type { BudgetPlanValidationResult } from "@/utils/budgetPlanValidation";

const baseCat = (
  partial: Partial<BudgetCategory> & Pick<BudgetCategory, "id" | "name" | "bucket" | "limitAmount">,
): BudgetCategory => ({
  userId: "u1",
  cycleId: "c1",
  isCustom: false,
  parentId: null,
  sortOrder: 0,
  suggestedLimit: null,
  isArchived: false,
  manualOverride: false,
  createdAt: "",
  updatedAt: "",
  ...partial,
});

function validation(
  takeHome: number,
  categories: BudgetCategory[],
): BudgetPlanValidationResult {
  const buckets = {
    needs: {
      bucket: "needs" as const,
      allocated: 0,
      envelope: takeHome * 0.5,
      freeInBucket: 0,
      overflow: 0,
      status: "ok" as const,
    },
    wants: {
      bucket: "wants" as const,
      allocated: 0,
      envelope: takeHome * 0.3,
      freeInBucket: 0,
      overflow: 0,
      status: "ok" as const,
    },
    savings: {
      bucket: "savings" as const,
      allocated: 0,
      envelope: takeHome * 0.2,
      freeInBucket: 0,
      overflow: 0,
      status: "ok" as const,
    },
  };
  for (const c of categories) {
    buckets[c.bucket].allocated += c.limitAmount;
  }
  const totalPlanned = categories.reduce((s, c) => s + c.limitAmount, 0);
  return {
    valid: totalPlanned <= takeHome,
    takeHome,
    totalPlanned,
    unassigned: 0,
    buckets,
    violations:
      totalPlanned > takeHome
        ? [{ type: "L3", amount: totalPlanned - takeHome }]
        : [],
    lockedObligations: 0,
  };
}

describe("buildRebalancePreview", () => {
  it("anchors recurring utilities and does not zero ECG", () => {
    const takeHome = 3000;
    const categories: BudgetCategory[] = [
      baseCat({ id: "ecg", name: "ECG", bucket: "needs", limitAmount: 0 }),
      baseCat({ id: "water", name: "Ghana Water", bucket: "needs", limitAmount: 0 }),
      baseCat({ id: "rent", name: "Rent", bucket: "needs", limitAmount: 2000 }),
      baseCat({ id: "groceries", name: "Groceries", bucket: "needs", limitAmount: 800 }),
      baseCat({ id: "dining", name: "Dining Out", bucket: "wants", limitAmount: 600 }),
      baseCat({ id: "data", name: "Data Bundles", bucket: "wants", limitAmount: 200 }),
      baseCat({ id: "savings", name: "Savings", bucket: "savings", limitAmount: 400 }),
    ];

    const preview = buildRebalancePreview(
      categories,
      validation(takeHome, categories),
      {
        recurringExpenses: [
          {
            id: "r1",
            userId: "u1",
            name: "ECG",
            amount: 150,
            frequency: "monthly",
            bucket: "needs",
            startDate: "2020-01-01",
            isActive: true,
            autoAllocate: true,
            createdAt: "",
            updatedAt: "",
          },
          {
            id: "r2",
            userId: "u1",
            name: "Ghana Water",
            amount: 80,
            frequency: "monthly",
            bucket: "needs",
            startDate: "2020-01-01",
            isActive: true,
            autoAllocate: true,
            createdAt: "",
            updatedAt: "",
          },
        ],
      },
    );

    const ecgRow = preview.rows.find((r) => r.categoryId === "ecg");
    const waterRow = preview.rows.find((r) => r.categoryId === "water");
    expect(ecgRow?.proposed ?? preview.proposedByCategoryId?.get("ecg")).toBe(150);
    expect(waterRow?.proposed ?? preview.proposedByCategoryId?.get("water")).toBe(80);
    expect(preview.totalAfter).toBeLessThanOrEqual(takeHome + 0.01);
    expect(preview.lockedCategoryIds?.has("ecg")).toBe(true);
  });

  it("schedules School Fees for deletion for family without recurring", () => {
    const takeHome = 3000;
    const categories: BudgetCategory[] = [
      baseCat({ id: "school", name: "School Fees", bucket: "needs", limitAmount: 400 }),
      baseCat({ id: "rent", name: "Rent", bucket: "needs", limitAmount: 1200 }),
      baseCat({ id: "groceries", name: "Groceries", bucket: "needs", limitAmount: 500 }),
      baseCat({ id: "dining", name: "Dining Out", bucket: "wants", limitAmount: 400 }),
      baseCat({ id: "data", name: "Data Bundles", bucket: "wants", limitAmount: 200 }),
      baseCat({ id: "savings", name: "Savings", bucket: "savings", limitAmount: 300 }),
    ];

    const preview = buildRebalancePreview(
      categories,
      validation(takeHome, categories),
      { lifeStage: "family" },
    );

    expect(preview.deleteCategoryIds).toEqual(["school"]);
    expect(preview.proposedByCategoryId?.get("school")).toBe(0);
    const schoolRow = preview.rows.find((r) => r.categoryId === "school");
    expect(schoolRow?.kind).toBe("deleted");
    expect(formatRebalancePreviewRowLabel(schoolRow!)).toContain("Deleted");
  });

  it("schedules School Fees for deletion for young_professional without recurring", () => {
    const takeHome = 3000;
    const categories: BudgetCategory[] = [
      baseCat({ id: "school", name: "School Fees", bucket: "needs", limitAmount: 400 }),
      baseCat({ id: "rent", name: "Rent", bucket: "needs", limitAmount: 1200 }),
      baseCat({ id: "groceries", name: "Groceries", bucket: "needs", limitAmount: 500 }),
      baseCat({ id: "dining", name: "Dining Out", bucket: "wants", limitAmount: 400 }),
      baseCat({ id: "data", name: "Data Bundles", bucket: "wants", limitAmount: 200 }),
      baseCat({ id: "savings", name: "Savings", bucket: "savings", limitAmount: 300 }),
    ];

    const preview = buildRebalancePreview(
      categories,
      validation(takeHome, categories),
      { lifeStage: "young_professional" },
    );

    expect(preview.proposedByCategoryId?.get("school")).toBe(0);
    expect(preview.deleteCategoryIds).toEqual(["school"]);
    expect(preview.totalAfter).toBeLessThanOrEqual(takeHome + 0.01);
  });

  it("applyRebalancePreview removes deleted categories", () => {
    const categories: BudgetCategory[] = [
      baseCat({ id: "school", name: "School Fees", bucket: "needs", limitAmount: 400 }),
      baseCat({ id: "rent", name: "Rent", bucket: "needs", limitAmount: 1200 }),
    ];
    const preview = buildRebalancePreview(
      categories,
      validation(3000, categories),
      { lifeStage: "young_professional" },
    );
    const next = applyRebalancePreview(categories, preview);
    expect(next.some((c) => c.id === "school")).toBe(false);
    expect(next.find((c) => c.id === "rent")).toBeDefined();
  });

  it("merges Data into Data Bundles and zeros the duplicate", () => {
    const takeHome = 3000;
    const categories: BudgetCategory[] = [
      baseCat({ id: "data", name: "Data", bucket: "wants", limitAmount: 80 }),
      baseCat({ id: "bundles", name: "Data Bundles", bucket: "wants", limitAmount: 120 }),
      baseCat({ id: "rent", name: "Rent", bucket: "needs", limitAmount: 1200 }),
      baseCat({ id: "groceries", name: "Groceries", bucket: "needs", limitAmount: 500 }),
      baseCat({ id: "savings", name: "Savings", bucket: "savings", limitAmount: 400 }),
    ];

    const preview = buildRebalancePreview(
      categories,
      validation(takeHome, categories),
      { lifeStage: "young_professional" },
    );

    expect(preview.proposedByCategoryId?.get("data")).toBe(0);
    expect(preview.proposedByCategoryId?.get("bundles")).toBeGreaterThan(0);
    const dataRow = preview.rows.find((r) => r.categoryId === "data");
    expect(dataRow?.kind).toBe("duplicate_removed");
    expect(dataRow?.mergedIntoName).toBe("Data Bundles");
    expect(formatRebalancePreviewRowLabel(dataRow!)).toContain("Duplicate");
  });
});
