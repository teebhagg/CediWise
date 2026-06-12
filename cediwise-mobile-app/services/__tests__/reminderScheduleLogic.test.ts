import {
  DEFAULT_WEEKLY_WEEKDAY,
  evaluateShouldRescheduleReminders,
  normalizeLegacyReminderFrequency,
  pickWeeklyAiReminder,
  REMINDER_SCHEDULE_VERSION,
  shouldMigrateLegacyFrequency,
} from "../reminderScheduleLogic";

describe("reminderScheduleLogic", () => {
  it("migrates legacy daily and twice_weekly to weekly", () => {
    expect(normalizeLegacyReminderFrequency("daily")).toBe("weekly");
    expect(normalizeLegacyReminderFrequency("twice_weekly")).toBe("weekly");
    expect(normalizeLegacyReminderFrequency("weekly")).toBe("weekly");
    expect(normalizeLegacyReminderFrequency(null)).toBe("weekly");
  });

  it("flags legacy stored values for migration", () => {
    expect(shouldMigrateLegacyFrequency("daily")).toBe(true);
    expect(shouldMigrateLegacyFrequency("twice_weekly")).toBe(true);
    expect(shouldMigrateLegacyFrequency("weekly")).toBe(false);
    expect(shouldMigrateLegacyFrequency(null)).toBe(false);
  });

  it("evaluates reschedule reasons", () => {
    const base = {
      force: false,
      storedVersion: REMINDER_SCHEDULE_VERSION,
      currentVersion: REMINDER_SCHEDULE_VERSION,
      storedWeek: "2026-W24",
      currentWeek: "2026-W24",
      reminderId: "abc",
      usedAi: "true",
      hasPendingAi: false,
    };
    expect(evaluateShouldRescheduleReminders(base)).toBe(false);
    expect(evaluateShouldRescheduleReminders({ ...base, force: true })).toBe(true);
    expect(
      evaluateShouldRescheduleReminders({ ...base, storedWeek: "2026-W23" }),
    ).toBe(true);
    expect(
      evaluateShouldRescheduleReminders({ ...base, usedAi: "false", hasPendingAi: true }),
    ).toBe(true);
  });

  it("prefers monday AI copy for weekly scheduling", () => {
    const picked = pickWeeklyAiReminder([
      { day: "thursday", title: "Thu", body: "Thu body" },
      { day: "monday", title: "Mon", body: "Mon body" },
    ]);
    expect(picked?.title).toBe("Mon");
  });

  it("defaults weekly weekday to Monday", () => {
    expect(DEFAULT_WEEKLY_WEEKDAY).toBe(1);
  });
});
