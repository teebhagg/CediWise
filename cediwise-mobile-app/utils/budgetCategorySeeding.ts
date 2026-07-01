import type { BudgetBucket } from "@/types/budget";
import type { LifeStage } from "@/calculators/budget-intelligence";
import { isSchoolFeesExcludedForLifeStage } from "@/utils/categoryProfileRelevance";
import {
  NEEDS_GENERAL_CATEGORY_NAME,
} from "@/utils/budgetPlanConstants";

export type CategoryNameRef = { bucket: BudgetBucket; name: string };

function categoryKey(bucket: BudgetBucket, name: string): string {
  return `${bucket}:${name.trim().toLowerCase()}`;
}

export function isWantsOthersCategoryName(
  bucket: BudgetBucket,
  name: string,
): boolean {
  return bucket === "wants" && name.trim().toLowerCase() === "others";
}

export function isNeedsGeneralCategoryName(
  bucket: BudgetBucket,
  name: string,
): boolean {
  return (
    bucket === "needs" &&
    name.trim().toLowerCase() === NEEDS_GENERAL_CATEGORY_NAME.toLowerCase()
  );
}

export function seedCategoriesFull(
  interests?: string[],
  lifeStage?: LifeStage | null,
) {
  const wantsFromInterests = (interestList?: string[]) => {
    const base = ["Data Bundles"] as string[];
    const map: Record<string, string[]> = {
      Tech: ["Subscriptions", "Gadgets"],
      Fashion: ["Clothing", "Shoes & Accessories"],
      Fitness: ["Gym", "Supplements"],
      Food: ["Dining Out"],
      Travel: ["Travel"],
      Gaming: ["Games"],
      Music: ["Entertainment"],
      Business: ["Skills & Courses"],
      Beauty: ["Self-care"],
    };

    const picked: string[] = [];
    for (const interest of interestList ?? []) {
      const items = map[String(interest)];
      if (!items) continue;
      for (const it of items) picked.push(it);
    }

    const fallbacks = ["Dining Out", "Clothing", "Hobbies"] as const;
    const out = [...base, ...picked, ...fallbacks, "Others"];
    const uniq: string[] = [];
    for (const name of out) {
      const normalized = name.trim();
      if (!normalized) continue;
      if (!uniq.includes(normalized)) uniq.push(normalized);
    }
    const withoutOthers = uniq.filter((name) => name !== "Others");
    return [...withoutOthers.slice(0, 4), "Others"];
  };

  const needs = [
    "Rent",
    "School Fees",
    "Transport",
    "Groceries",
    "Tithes/Church",
    "Emergency",
    "ECG",
    "Ghana Water",
    "Trash",
  ].filter(
    (name) =>
      name !== "School Fees" || !isSchoolFeesExcludedForLifeStage(lifeStage),
  );

  return {
    needs,
    wants: wantsFromInterests(interests),
    savings: ["Savings"],
  } satisfies Record<BudgetBucket, string[]>;
}

export function buildMinimalCategoryNames(params: {
  customCategories?: {
    name: string;
    bucket: BudgetBucket;
    limitAmount: number;
  }[];
  fixedAmountsByCategory?: Record<string, number>;
  interests?: string[];
  lifeStage?: LifeStage | null;
}): CategoryNameRef[] {
  const { customCategories = [], fixedAmountsByCategory = {}, interests, lifeStage } =
    params;
  const keys = new Set<string>();
  const out: CategoryNameRef[] = [];

  const push = (bucket: BudgetBucket, name: string) => {
    const normalized = name.trim();
    if (!normalized) return;
    const key = categoryKey(bucket, normalized);
    if (keys.has(key)) return;
    keys.add(key);
    out.push({ bucket, name: normalized });
  };

  for (const custom of customCategories) {
    const isOthers = isWantsOthersCategoryName(custom.bucket, custom.name);
    if (custom.limitAmount <= 0 && !isOthers) continue;
    push(custom.bucket, custom.name);
  }

  for (const [name, amount] of Object.entries(fixedAmountsByCategory)) {
    if (amount <= 0) continue;
    const match = customCategories.find(
      (c) => c.name.trim().toLowerCase() === name.trim().toLowerCase(),
    );
    if (match) continue;
    push("needs", name);
  }

  if (
    fixedAmountsByCategory["Debt Payments"] &&
    !keys.has(categoryKey("needs", "Debt Payments"))
  ) {
    push("needs", "Debt Payments");
  }

  const hasNeeds = out.some((c) => c.bucket === "needs");
  const hasWants = out.some((c) => c.bucket === "wants");
  const hasSavings = out.some((c) => c.bucket === "savings");

  if (hasNeeds && !out.some((c) => isNeedsGeneralCategoryName(c.bucket, c.name))) {
    push("needs", NEEDS_GENERAL_CATEGORY_NAME);
  }
  if (hasWants && !out.some((c) => isWantsOthersCategoryName(c.bucket, c.name))) {
    push("wants", "Others");
  }
  if (hasSavings && !out.some((c) => c.bucket === "savings")) {
    push("savings", "Savings");
  }

  // Interest-based wants only when user selected wants but no wants lines from AI
  if (!hasWants && interests?.length) {
    const seeded = seedCategoriesFull(interests, lifeStage);
    for (const name of seeded.wants) {
      push("wants", name);
    }
  }

  return out;
}

export function categoryNamesFromFullSeed(
  interests?: string[],
  fixedAmountsByCategory?: Record<string, number>,
  lifeStage?: LifeStage | null,
): CategoryNameRef[] {
  const seeded = seedCategoriesFull(interests, lifeStage);
  const needsList = [...seeded.needs];
  if (
    fixedAmountsByCategory?.["Debt Payments"] &&
    !needsList.includes("Debt Payments")
  ) {
    needsList.push("Debt Payments");
  }
  return [
    ...needsList.map((name) => ({ bucket: "needs" as const, name })),
    ...seeded.wants.map((name) => ({ bucket: "wants" as const, name })),
    ...seeded.savings.map((name) => ({ bucket: "savings" as const, name })),
  ];
}
