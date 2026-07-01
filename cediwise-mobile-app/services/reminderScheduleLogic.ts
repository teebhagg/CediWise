/** @deprecated Daily reminders are no longer supported. */
export type LegacyReminderFrequency = "daily" | "weekly";

export type ReminderFrequency = "twice_weekly";

export type ReminderSlotDay = "monday" | "thursday";

export const REMINDER_SCHEDULE_VERSION = "v10";

/** Fixed reminder slots — users do not pick days. Expo weekday: 1=Sun, 2=Mon, 5=Thu. */
export const REMINDER_SLOTS: ReadonlyArray<{
  day: ReminderSlotDay;
  expoWeekday: number;
}> = [
  { day: "monday", expoWeekday: 2 },
  { day: "thursday", expoWeekday: 5 },
] as const;

/** @deprecated Use REMINDER_SLOTS. Kept for tests referencing Monday default. */
export const DEFAULT_WEEKLY_WEEKDAY = 2;

export function normalizeLegacyReminderFrequency(
  _stored: string | null,
): ReminderFrequency {
  return "twice_weekly";
}

export function shouldMigrateLegacyFrequency(stored: string | null): boolean {
  return stored !== "twice_weekly";
}

export type RescheduleEvaluationInput = {
  force: boolean;
  storedVersion: string | null;
  currentVersion: string;
  storedWeek: string | null;
  currentWeek: string;
  reminderId: string | null;
  reminderIdSecond: string | null;
  usedAi: string | null;
  hasPendingAi: boolean;
};

export function evaluateShouldRescheduleReminders(
  input: RescheduleEvaluationInput,
): boolean {
  if (input.force) return true;
  if (input.storedVersion !== input.currentVersion) return true;
  if (input.storedWeek !== input.currentWeek) return true;
  if (!input.reminderId || !input.reminderIdSecond) return true;
  if (input.usedAi !== "true" && input.hasPendingAi) return true;
  return false;
}

/** Pick AI copy for a fixed Mon/Thu slot. */
export function pickAiReminderForDay<
  T extends { day: string; title: string; body: string },
>(rows: T[], day: ReminderSlotDay): T | undefined {
  return rows.find((r) => r.day === day);
}
