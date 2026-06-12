/** @deprecated Daily reminders are no longer supported. */
export type LegacyReminderFrequency = "daily" | "twice_weekly";

export type ReminderFrequency = "weekly";

export const REMINDER_SCHEDULE_VERSION = "v6";

/** Default weekly slot: Monday 20:00 (Expo weekday 1). */
export const DEFAULT_WEEKLY_WEEKDAY = 1;

export function normalizeLegacyReminderFrequency(
  _stored: string | null,
): ReminderFrequency {
  return "weekly";
}

export function shouldMigrateLegacyFrequency(stored: string | null): boolean {
  return stored != null && stored !== "weekly";
}

export type RescheduleEvaluationInput = {
  force: boolean;
  storedVersion: string | null;
  currentVersion: string;
  storedWeek: string | null;
  currentWeek: string;
  reminderId: string | null;
  usedAi: string | null;
  hasPendingAi: boolean;
};

export function evaluateShouldRescheduleReminders(
  input: RescheduleEvaluationInput,
): boolean {
  if (input.force) return true;
  if (input.storedVersion !== input.currentVersion) return true;
  if (input.storedWeek !== input.currentWeek) return true;
  if (!input.reminderId) return true;
  if (input.usedAi !== "true" && input.hasPendingAi) return true;
  return false;
}

/** Pick the best AI row for a single weekly local notification. */
export function pickWeeklyAiReminder<
  T extends { day: string; title: string; body: string },
>(rows: T[]): T | undefined {
  return (
    rows.find((r) => r.day === "monday") ??
    rows.find((r) => r.day === "thursday") ??
    rows[0]
  );
}
