function lastDayOfMonth(year: number, monthIndex0: number) {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function addMonths(date: Date, months: number): Date {
  const day = date.getDate();
  const result = new Date(date);
  result.setDate(1);
  result.setMonth(result.getMonth() + months);
  const lastDay = lastDayOfMonth(result.getFullYear(), result.getMonth());
  result.setDate(Math.min(day, lastDay));
  return result;
}

/**
 * Next cycle from previous: start = prevEnd + 1, same duration as prev.
 * Weekly/bi-weekly use days; monthly+ use calendar months.
 */
export function computeNextCycleFromPrevious(
  prevStartDate: string,
  prevEndDate: string,
  useMonths: boolean,
): { start: Date; end: Date } {
  const prevStart = new Date(prevStartDate);
  const prevEnd = new Date(prevEndDate);

  const newStart = new Date(prevEnd);
  newStart.setDate(newStart.getDate() + 1);

  if (useMonths) {
    const durationDays =
      Math.round((prevEnd.getTime() - prevStart.getTime()) / 86400000) + 1;
    const durationMonths = Math.max(1, Math.round(durationDays / 30.44));
    const periodEnd = addMonths(newStart, durationMonths);
    periodEnd.setDate(periodEnd.getDate() - 1);
    return { start: newStart, end: periodEnd };
  }

  const durationDays =
    Math.round((prevEnd.getTime() - prevStart.getTime()) / 86400000) + 1;
  const newEnd = new Date(newStart);
  newEnd.setDate(newEnd.getDate() + durationDays - 1);
  return { start: newStart, end: newEnd };
}
