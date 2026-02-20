/**
 * Phase 4: Centralized message templates for the budget advisor.
 * Behavioral nudge-oriented, Ghanaian context (₵). Ready for i18n.
 */

export function formatAmount(n: number): string {
  const safe = Number.isFinite(n) ? Math.round(Math.max(0, n)) : 0;
  return safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

export const MESSAGES = {
  overspend: {
    title: (categoryName: string) => `${categoryName} over limit`,
    message: (categoryName: string, over: number) =>
      `You've exceeded your ${categoryName} limit by ₵${formatAmount(
        over
      )}. Consider reducing spending in other wants categories next cycle.`,
  },
  nearLimit: {
    title: (categoryName: string) => `Approaching ${categoryName} limit`,
    messageShort: (remaining: number, daysRemaining: number) =>
      `You have ₵${formatAmount(
        remaining
      )} left with ${daysRemaining} days remaining. Spend carefully.`,
    messageDefault: (remaining: number) =>
      `You have ₵${formatAmount(
        remaining
      )} left. Spend carefully to stay on track.`,
  },
  underspend: {
    title: (categoryName: string) => `You saved on ${categoryName}`,
    message: (saved: number) =>
      `You spent ₵${formatAmount(
        saved
      )} less than budgeted. Consider moving this to your Emergency Fund or a savings goal.`,
  },
  trendUp: {
    title: (categoryName: string) => `${categoryName} trending up`,
    message: (categoryName: string) =>
      `Your spending in ${categoryName} has been increasing. Watch this category to avoid overspending.`,
  },
  categoryReallocate: {
    title: () => "Move budget within bucket",
    message: (moveAmt: number, sourceName: string, targetName: string) =>
      `Move ₵${formatAmount(
        moveAmt
      )} from ${sourceName} to ${targetName} to cover overspend.`,
  },
  limitIncrease: {
    title: (categoryName: string) =>
      `Consider increasing ${categoryName} limit`,
    message: (categoryName: string, newLimit: number) =>
      `You've consistently spent more than your ${categoryName} limit. Consider raising it to ₵${formatAmount(
        newLimit
      )}.`,
  },
  limitDecrease: {
    title: (categoryName: string) => `Consider reducing ${categoryName} limit`,
    message: (suggestedLimit: number) =>
      `You're spending less than budgeted. Consider reducing the limit to ₵${formatAmount(
        suggestedLimit
      )} and moving the difference to savings.`,
  },
  bucketNeeds: {
    title: () => "Needs bucket over budget",
    message: (over: number) =>
      `Essential spending exceeded by ₵${formatAmount(
        over
      )}. Review your needs categories—you may need to adjust next cycle.`,
  },
  bucketWants: {
    title: () => "Wants bucket over budget",
    message: (over: number) =>
      `Discretionary spending exceeded by ₵${formatAmount(
        over
      )}. Try cutting back on non-essentials next month.`,
  },
} as const;
