import type { BudgetBucket } from "@/types/budget";

/** Human-readable label for a budget bucket (e.g. "needs" → "Needs"). */
export function bucketLabel(bucket: BudgetBucket): string {
  return bucket.charAt(0).toUpperCase() + bucket.slice(1);
}
