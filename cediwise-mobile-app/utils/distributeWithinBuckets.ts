import {
  computeWeightedCategoryLimits,
  type CategoryAllocationProfile,
  type CategoryLimitInput,
} from "@/calculators/category-weights";
import type { BudgetBucket } from "@/types/budget";
import type { LifeStage } from "@/calculators/budget-intelligence";
import {
  isNeedsGeneralCategoryName,
  isWantsOthersCategoryName,
} from "@/utils/budgetCategorySeeding";

export type BucketDistributionInput = {
  name: string;
  bucket: BudgetBucket;
  fixedAmount?: number;
  manualOverride?: boolean;
  explicitLimit?: number;
};

export type DistributeWithinBucketsParams = {
  bucketEnvelopes: Record<BudgetBucket, number>;
  categories: BucketDistributionInput[];
  lifeStage?: LifeStage | null;
  profile?: CategoryAllocationProfile | null;
};

export type BucketOverflow = {
  bucket: BudgetBucket;
  fixedTotal: number;
  envelope: number;
  overflow: number;
};

export type DistributeWithinBucketsResult = {
  limitsByKey: Map<string, number>;
  overflows: BucketOverflow[];
};

function rowKey(bucket: BudgetBucket, name: string): string {
  return `${bucket}:${name}`;
}

/**
 * Distribute category limits within bucket envelopes.
 * Fixed amounts lock first; remainder flows to flexible categories via weights.
 */
export function distributeWithinBuckets(
  params: DistributeWithinBucketsParams,
): DistributeWithinBucketsResult {
  const { bucketEnvelopes, categories, lifeStage, profile } = params;
  const limitsByKey = new Map<string, number>();
  const overflows: BucketOverflow[] = [];

  for (const bucket of ["needs", "wants", "savings"] as BudgetBucket[]) {
    const bucketCats = categories.filter((c) => c.bucket === bucket);
    if (bucketCats.length === 0) continue;

    const envelope = bucketEnvelopes[bucket];

    for (const cat of bucketCats) {
      if (cat.explicitLimit != null) {
        limitsByKey.set(rowKey(bucket, cat.name), Math.max(0, cat.explicitLimit));
      }
    }

    const fixedTotal = bucketCats.reduce((sum, cat) => {
      if (cat.explicitLimit != null) return sum;
      const fixed = cat.fixedAmount ?? 0;
      return fixed > 0 ? sum + fixed : sum;
    }, 0);

    if (fixedTotal > envelope + 0.001) {
      overflows.push({
        bucket,
        fixedTotal,
        envelope,
        overflow: fixedTotal - envelope,
      });
    }

    const inputs: CategoryLimitInput[] = bucketCats
      .filter(
        (cat) =>
          cat.explicitLimit == null &&
          !isWantsOthersCategoryName(bucket, cat.name),
      )
      .map((cat) => ({
        name: cat.name,
        bucket,
        fixedAmount: cat.fixedAmount,
        manualOverride:
          cat.manualOverride ||
          (bucket === "needs" &&
            cat.name.trim().toLowerCase() === "emergency") ||
          isNeedsGeneralCategoryName(bucket, cat.name),
      }));

    const weighted = computeWeightedCategoryLimits(
      envelope,
      inputs,
      lifeStage ?? null,
      profile ?? null,
    );

    weighted.forEach((limit, name) => {
      if (!limitsByKey.has(rowKey(bucket, name))) {
        limitsByKey.set(rowKey(bucket, name), limit);
      }
    });

    for (const cat of bucketCats) {
      if (isWantsOthersCategoryName(bucket, cat.name) && cat.explicitLimit == null) {
        limitsByKey.set(rowKey(bucket, cat.name), 0);
      }
      if (isNeedsGeneralCategoryName(bucket, cat.name) && cat.explicitLimit == null) {
        const current = limitsByKey.get(rowKey(bucket, cat.name));
        if (current == null) limitsByKey.set(rowKey(bucket, cat.name), 0);
      }
    }
  }

  return { limitsByKey, overflows };
}
