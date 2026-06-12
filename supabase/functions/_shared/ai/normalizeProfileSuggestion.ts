import type { ProfileSuggestionParsed } from "./aiResponseValidation.ts";
import { dedupeProfileSuggestion } from "./dedupeProfileSuggestion.ts";
import { applySuggestionBucketRules } from "./suggestionBucketRules.ts";
import {
  getLineCapAmount,
  type LifeStageKey,
} from "./suggestionConstraints.ts";

function roundMoney(n: number): number {
  return Math.max(0, Math.round(n * 100) / 100);
}

function normalizeSplit(
  split: ProfileSuggestionParsed["budgetSplit"],
): NonNullable<ProfileSuggestionParsed["budgetSplit"]> {
  const needs = split?.needsPct ?? 0.5;
  const wants = split?.wantsPct ?? 0.3;
  const savings = split?.savingsPct ?? 0.2;
  const total = needs + wants + savings;
  if (total <= 0) {
    return { needsPct: 0.5, wantsPct: 0.3, savingsPct: 0.2, reason: split?.reason };
  }
  return {
    needsPct: needs / total,
    wantsPct: wants / total,
    savingsPct: savings / total,
    reason: split?.reason,
  };
}

type Bucket = "needs" | "wants" | "savings";

type MutableLine = {
  bucket: Bucket;
  name: string;
  getAmount: () => number;
  setAmount: (n: number) => void;
  cap: number | null;
};

function lineHeadroom(line: MutableLine): number {
  const cap = line.cap ?? Number.POSITIVE_INFINITY;
  return Math.max(0, cap - line.getAmount());
}

function clampLinesToCaps(lines: MutableLine[]): void {
  for (const line of lines) {
    if (line.cap == null) continue;
    line.setAmount(Math.min(line.getAmount(), line.cap));
  }
}

function fixBucketDrift(lines: MutableLine[], target: number): void {
  if (lines.length === 0) return;
  const sum = roundMoney(lines.reduce((s, l) => s + l.getAmount(), 0));
  let drift = roundMoney(target - sum);
  if (Math.abs(drift) < 0.01) return;

  const sorted = [...lines].sort((a, b) => lineHeadroom(b) - lineHeadroom(a));
  for (const line of sorted) {
    if (Math.abs(drift) < 0.01) break;
    if (drift > 0) {
      const add = Math.min(lineHeadroom(line), drift);
      if (add <= 0) continue;
      line.setAmount(roundMoney(line.getAmount() + add));
      drift = roundMoney(drift - add);
    } else {
      const sub = Math.min(line.getAmount(), -drift);
      if (sub <= 0) continue;
      line.setAmount(roundMoney(line.getAmount() - sub));
      drift = roundMoney(drift + sub);
    }
  }
}

/**
 * Scale down or grow bucket lines toward target without exceeding per-line caps.
 */
function distributeBucketToTarget(lines: MutableLine[], target: number): void {
  if (lines.length === 0) return;

  clampLinesToCaps(lines);

  let sum = roundMoney(lines.reduce((s, l) => s + l.getAmount(), 0));

  if (sum > target && sum > 0) {
    const scale = target / sum;
    for (const line of lines) {
      line.setAmount(roundMoney(line.getAmount() * scale));
    }
    clampLinesToCaps(lines);
    fixBucketDrift(lines, target);
    return;
  }

  if (sum < target) {
    let remaining = roundMoney(target - sum);
    let guard = 0;
    while (remaining >= 0.01 && guard < 50) {
      guard += 1;
      const eligible = lines.filter((l) => lineHeadroom(l) >= 0.01);
      if (eligible.length === 0) break;

      const weightTotal = eligible.reduce(
        (s, l) => s + Math.max(l.getAmount(), 1),
        0,
      );
      let moved = 0;

      for (const line of eligible) {
        const headroom = lineHeadroom(line);
        const weight = Math.max(line.getAmount(), 1) / weightTotal;
        const add = Math.min(headroom, roundMoney(remaining * weight));
        if (add < 0.01) continue;
        line.setAmount(roundMoney(line.getAmount() + add));
        moved = roundMoney(moved + add);
      }

      if (moved < 0.01) break;
      remaining = roundMoney(remaining - moved);
    }
    fixBucketDrift(lines, target);
  }
}

function scaleAllLinesProportionally(lines: MutableLine[], targetTotal: number): void {
  const sum = lines.reduce((s, l) => s + l.getAmount(), 0);
  if (sum <= 0 || targetTotal <= 0) {
    for (const line of lines) line.setAmount(0);
    return;
  }
  const scale = targetTotal / sum;
  for (const line of lines) {
    let next = roundMoney(line.getAmount() * scale);
    if (line.cap != null) next = Math.min(next, line.cap);
    line.setAmount(next);
  }
  clampLinesToCaps(lines);

  let adjustedSum = roundMoney(lines.reduce((s, l) => s + l.getAmount(), 0));
  let drift = roundMoney(targetTotal - adjustedSum);
  if (Math.abs(drift) >= 0.01) {
    const sorted = [...lines].sort((a, b) => lineHeadroom(b) - lineHeadroom(a));
    for (const line of sorted) {
      if (Math.abs(drift) < 0.01) break;
      if (drift > 0 && lineHeadroom(line) > 0) {
        const add = Math.min(lineHeadroom(line), drift);
        line.setAmount(roundMoney(line.getAmount() + add));
        drift = roundMoney(drift - add);
      }
    }
  }
}

/**
 * Enforce per-line caps, bucket targets, and global sum ≤ net income.
 */
export function normalizeProfileSuggestion(
  raw: ProfileSuggestionParsed,
  monthlyIncome: number,
  lifeStage?: LifeStageKey | null,
): ProfileSuggestionParsed {
  const deduped = applySuggestionBucketRules(dedupeProfileSuggestion(raw));
  const income = Math.max(0, monthlyIncome);
  const budgetSplit = normalizeSplit(deduped.budgetSplit);

  const categories = (deduped.categories ?? []).map((c) => ({ ...c }));
  const recurringExpenses = (deduped.recurringExpenses ?? []).map((r) => ({ ...r }));

  const lines: MutableLine[] = [];

  categories.forEach((cat, i) => {
    lines.push({
      bucket: cat.bucket,
      name: cat.name,
      getAmount: () => categories[i].suggestedLimit,
      setAmount: (n) => {
        categories[i].suggestedLimit = n;
      },
      cap: getLineCapAmount(cat.name, cat.bucket, income, lifeStage),
    });
  });

  recurringExpenses.forEach((rec, i) => {
    lines.push({
      bucket: rec.bucket,
      name: rec.name,
      getAmount: () => recurringExpenses[i].amount,
      setAmount: (n) => {
        recurringExpenses[i].amount = n;
      },
      cap: getLineCapAmount(rec.name, rec.bucket, income, lifeStage),
    });
  });

  clampLinesToCaps(lines);

  const bucketTargets: Record<Bucket, number> = {
    needs: roundMoney(income * budgetSplit.needsPct),
    wants: roundMoney(income * budgetSplit.wantsPct),
    savings: roundMoney(income * budgetSplit.savingsPct),
  };

  for (const bucket of ["needs", "wants", "savings"] as const) {
    const bucketLines = lines.filter((l) => l.bucket === bucket);
    distributeBucketToTarget(bucketLines, bucketTargets[bucket]);
  }

  const totalAllocated = roundMoney(lines.reduce((s, l) => s + l.getAmount(), 0));
  if (totalAllocated > income && income > 0) {
    scaleAllLinesProportionally(lines, income);
  }

  return {
    ...deduped,
    budgetSplit,
    categories,
    recurringExpenses,
  };
}
