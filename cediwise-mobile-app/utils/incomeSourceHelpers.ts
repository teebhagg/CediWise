import type { IncomeSource } from "@/types/budget";

/** Canonical primary-income labels (case-insensitive). */
export const PRIMARY_INCOME_NAME_ALIASES = [
  "primary income",
  "primary salary",
] as const;

export function normalizeIncomeSourceName(name: string): string {
  return name.trim().toLowerCase();
}

export function isCanonicalPrimaryIncomeName(name: string): boolean {
  const normalized = normalizeIncomeSourceName(name);
  return (PRIMARY_INCOME_NAME_ALIASES as readonly string[]).includes(normalized);
}

/** Existing row that represents the user's main salary stream. */
export function isPrimaryIncomeSource(source: IncomeSource): boolean {
  if (source.type === "primary") return true;
  return isCanonicalPrimaryIncomeName(source.name);
}

export function findPrimaryIncomeSource(
  sources: IncomeSource[] | undefined | null,
): IncomeSource | undefined {
  return sources?.find(isPrimaryIncomeSource);
}

/** Incoming add/update payload that should reuse the primary slot, not create a duplicate. */
export function isPrimaryIncomeCandidate(
  name: string,
  type: IncomeSource["type"],
): boolean {
  return type === "primary" || isCanonicalPrimaryIncomeName(name);
}

/**
 * After merge/hydrate, keep a single primary-like income row (local wins on tie).
 */
export function dedupePrimaryIncomeSources(
  sources: IncomeSource[],
): IncomeSource[] {
  const primaries = sources.filter(isPrimaryIncomeSource);
  if (primaries.length <= 1) return sources;

  const keep = primaries.reduce((best, cur) => {
    const bestTs = Date.parse(best.updatedAt) || 0;
    const curTs = Date.parse(cur.updatedAt) || 0;
    return curTs >= bestTs ? cur : best;
  });

  return sources.filter(
    (s) => !isPrimaryIncomeSource(s) || s.id === keep.id,
  );
}
