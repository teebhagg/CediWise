import type { BudgetCategory } from "@/types/budget";
import {
  buildRecurringAnchors,
  isUtilityCategoryName,
} from "@/utils/rebalanceRecurringAnchors";

const baseCat = (
  partial: Partial<BudgetCategory> & Pick<BudgetCategory, "id" | "name" | "bucket">,
): BudgetCategory => ({
  userId: "u1",
  cycleId: "c1",
  limitAmount: 500,
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

describe("buildRecurringAnchors", () => {
  const categories: BudgetCategory[] = [
    baseCat({ id: "ecg", name: "ECG", bucket: "needs" }),
    baseCat({ id: "water", name: "Ghana Water", bucket: "needs" }),
    baseCat({ id: "rent", name: "Rent", bucket: "needs" }),
  ];

  it("maps utilities recurring to ECG and Ghana Water split", () => {
    const { fixedByCategoryId, lockedCategoryIds } = buildRecurringAnchors(
      categories,
      [
        {
          id: "r1",
          userId: "u1",
          name: "Utilities",
          amount: 350,
          frequency: "monthly",
          bucket: "needs",
          startDate: "2020-01-01",
          isActive: true,
          autoAllocate: true,
          createdAt: "",
          updatedAt: "",
        },
      ],
    );

    expect(lockedCategoryIds.has("ecg")).toBe(true);
    expect(lockedCategoryIds.has("water")).toBe(true);
    expect(fixedByCategoryId.get("ecg")).toBeCloseTo(200, 0);
    expect(fixedByCategoryId.get("water")).toBeCloseTo(150, 0);
  });

  it("maps ECG bill by name", () => {
    const { fixedByCategoryId } = buildRecurringAnchors(categories, [
      {
        id: "r2",
        userId: "u1",
        name: "ECG Bill",
        amount: 120,
        frequency: "monthly",
        bucket: "needs",
        startDate: "2020-01-01",
        isActive: true,
        autoAllocate: true,
        createdAt: "",
        updatedAt: "",
      },
    ]);
    expect(fixedByCategoryId.get("ecg")).toBe(120);
  });
});

describe("isUtilityCategoryName", () => {
  it("recognizes utility categories", () => {
    expect(isUtilityCategoryName("ECG")).toBe(true);
    expect(isUtilityCategoryName("Ghana Water")).toBe(true);
    expect(isUtilityCategoryName("Rent")).toBe(false);
  });
});
