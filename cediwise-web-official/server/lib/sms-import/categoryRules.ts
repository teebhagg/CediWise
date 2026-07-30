import type { ParsedSms } from './types'

export type BudgetCategoryRow = {
  id: string
  name: string
  bucket: string
}

/** Preferred fallback when no MoMo context rule matches. */
export const SMS_CATEGORY_FALLBACK_NAMES = [
  'others',
  'transport',
  'groceries',
] as const

type CategoryRule = {
  /** Preferred category names in order (must exist in the user's cycle). */
  prefer: string[]
  /** Case-insensitive substrings matched against counterparty + body. */
  signals: string[]
}

/**
 * First-match MoMo context → seeded category names.
 * Only assigns when the preferred name exists in the cycle.
 */
export const SMS_CATEGORY_RULES: CategoryRule[] = [
  {
    prefer: ['data bundles', 'others'],
    signals: ['airtime', 'mtn airtime', 'data bundle', 'data bundles', 'internet'],
  },
  {
    prefer: ['data bundles', 'others'],
    signals: ['bundle'],
  },
  {
    prefer: ['ecg'],
    signals: ['ecg'],
  },
  {
    prefer: ['ghana water'],
    signals: ['ghana water', 'gwcl'],
  },
]

function findByName(
  categories: BudgetCategoryRow[],
  name: string,
): BudgetCategoryRow | null {
  const needle = name.trim().toLowerCase()
  return categories.find((row) => row.name?.trim().toLowerCase() === needle) ?? null
}

function buildHaystack(parsed: ParsedSms, rawMessage?: string): string {
  return [parsed.counterparty ?? '', rawMessage ?? ''].join(' ').toLowerCase()
}

/**
 * Pick a budget category from MoMo parse context using deterministic rules,
 * then the Others → Transport → Groceries fallback, then wants / first category.
 */
export function pickCategoryForSms(
  categories: BudgetCategoryRow[],
  parsed: ParsedSms,
  rawMessage?: string,
): BudgetCategoryRow | null {
  if (!categories.length) return null

  const haystack = buildHaystack(parsed, rawMessage)

  for (const rule of SMS_CATEGORY_RULES) {
    if (!rule.signals.some((signal) => haystack.includes(signal))) continue
    for (const name of rule.prefer) {
      const hit = findByName(categories, name)
      if (hit) return hit
    }
  }

  for (const name of SMS_CATEGORY_FALLBACK_NAMES) {
    const hit = findByName(categories, name)
    if (hit) return hit
  }

  return (
    categories.find((row) => row.bucket === 'wants') ?? categories[0] ?? null
  )
}
