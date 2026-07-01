import type { BudgetCategory } from "@/types/budget";
import {
  categoriesOverlapForMerge,
  consolidateProposedDuplicates,
  resolveDuplicateCategories,
} from "@/utils/categoryOverlap";

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

describe("categoryOverlap", () => {
  it("detects Data and Data Bundles as overlapping", () => {
    const data = baseCat({ id: "d1", name: "Data", bucket: "wants", limitAmount: 50 });
    const bundles = baseCat({
      id: "d2",
      name: "Data Bundles",
      bucket: "wants",
      limitAmount: 100,
    });
    expect(categoriesOverlapForMerge(data, bundles)).toBe(true);
  });

  it("keeps ECG and Ghana Water as separate utility lines", () => {
    const ecg = baseCat({ id: "e", name: "ECG", bucket: "needs", limitAmount: 100 });
    const water = baseCat({
      id: "w",
      name: "Ghana Water",
      bucket: "needs",
      limitAmount: 80,
    });
    expect(categoriesOverlapForMerge(ecg, water)).toBe(false);
  });

  it("does not merge Trash into utilities or ECG", () => {
    const trash = baseCat({ id: "t", name: "Trash", bucket: "needs", limitAmount: 50 });
    const ecg = baseCat({ id: "e", name: "ECG", bucket: "needs", limitAmount: 100 });
    const utilities = baseCat({
      id: "u",
      name: "Utilities",
      bucket: "needs",
      limitAmount: 80,
    });
    expect(categoriesOverlapForMerge(trash, ecg)).toBe(false);
    expect(categoriesOverlapForMerge(trash, utilities)).toBe(false);

    const categories = [
      trash,
      ecg,
      baseCat({ id: "r", name: "Rent", bucket: "needs", limitAmount: 800 }),
    ];
    const { mergeIntoWinner } = resolveDuplicateCategories(categories, new Set());
    expect(mergeIntoWinner.has("t")).toBe(false);
  });

  it("merges Data into Data Bundles as winner", () => {
    const categories = [
      baseCat({ id: "d1", name: "Data", bucket: "wants", limitAmount: 50 }),
      baseCat({ id: "d2", name: "Data Bundles", bucket: "wants", limitAmount: 100 }),
      baseCat({ id: "r", name: "Rent", bucket: "needs", limitAmount: 800 }),
    ];
    const { mergeIntoWinner } = resolveDuplicateCategories(categories, new Set());
    expect(mergeIntoWinner.get("d1")).toBe("d2");
    expect(mergeIntoWinner.has("d2")).toBe(false);
  });

  it("consolidates proposed limits into winner", () => {
    const proposed = new Map([
      ["d1", 50],
      ["d2", 100],
    ]);
    consolidateProposedDuplicates(
      [],
      proposed,
      new Map([["d1", "d2"]]),
    );
    expect(proposed.get("d1")).toBe(0);
    expect(proposed.get("d2")).toBe(150);
  });
});
