export const DAILY_CALCULATOR_LIMIT = 5
export const STORAGE_KEY = 'cediwise_salary_calc_usage'

export type UsageRecord = {
  date: string
  count: number
}

export function ghanaDateKey(date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Accra',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(date)
}

export function getUsage(): UsageRecord {
  if (typeof window === 'undefined') {
    return { date: ghanaDateKey(), count: 0 }
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? (JSON.parse(raw) as UsageRecord) : null
    const today = ghanaDateKey()
    if (!parsed || parsed.date !== today) {
      return { date: today, count: 0 }
    }
    return parsed
  } catch {
    return { date: ghanaDateKey(), count: 0 }
  }
}

export function getUsageStatus(): {
  allowed: boolean
  remaining: number
  used: number
  limit: number
} {
  const usage = getUsage()
  const remaining = Math.max(0, DAILY_CALCULATOR_LIMIT - usage.count)
  return {
    allowed: usage.count < DAILY_CALCULATOR_LIMIT,
    remaining,
    used: usage.count,
    limit: DAILY_CALCULATOR_LIMIT,
  }
}

export function recordCalculatorUse(): UsageRecord {
  const usage = getUsage()
  usage.count += 1
  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(usage))
  }
  return usage
}
