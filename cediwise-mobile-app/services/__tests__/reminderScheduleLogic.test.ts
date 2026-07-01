import {
  DEFAULT_WEEKLY_WEEKDAY,
  evaluateShouldRescheduleReminders,
  normalizeLegacyReminderFrequency,
  pickAiReminderForDay,
  REMINDER_SCHEDULE_VERSION,
  REMINDER_SLOTS,
  shouldMigrateLegacyFrequency,
} from "../reminderScheduleLogic";

describe("reminderScheduleLogic", () => {
  it("normalizes all legacy frequencies to twice_weekly", () => {
    expect(normalizeLegacyReminderFrequency("daily")).toBe("twice_weekly");
    expect(normalizeLegacyReminderFrequency("weekly")).toBe("twice_weekly");
    expect(normalizeLegacyReminderFrequency("twice_weekly")).toBe("twice_weekly");
    expect(normalizeLegacyReminderFrequency(null)).toBe("twice_weekly");
  });

  it("flags non-twice_weekly stored values for migration", () => {
    expect(shouldMigrateLegacyFrequency("daily")).toBe(true);
    expect(shouldMigrateLegacyFrequency("weekly")).toBe(true);
    expect(shouldMigrateLegacyFrequency("twice_weekly")).toBe(false);
    expect(shouldMigrateLegacyFrequency(null)).toBe(true);
  });

  it("evaluates reschedule reasons for both fixed slots", () => {
    const base = {
      force: false,
      storedVersion: REMINDER_SCHEDULE_VERSION,
      currentVersion: REMINDER_SCHEDULE_VERSION,
      storedWeek: "2026-W24",
      currentWeek: "2026-W24",
      reminderId: "mon",
      reminderIdSecond: "thu",
      usedAi: "true",
      hasPendingAi: false,
    };
    expect(evaluateShouldRescheduleReminders(base)).toBe(false);
    expect(evaluateShouldRescheduleReminders({ ...base, force: true })).toBe(true);
    expect(evaluateShouldRescheduleReminders({ ...base, reminderIdSecond: null })).toBe(true);
    expect(
      evaluateShouldRescheduleReminders({ ...base, usedAi: "false", hasPendingAi: true }),
    ).toBe(true);
  });

  it("picks AI copy per fixed slot day", () => {
    const rows = [
      { day: "thursday", title: "Thu", body: "Thu body" },
      { day: "monday", title: "Mon", body: "Mon body" },
    ];
    expect(pickAiReminderForDay(rows, "monday")?.title).toBe("Mon");
    expect(pickAiReminderForDay(rows, "thursday")?.title).toBe("Thu");
  });

  it("uses fixed Monday and Thursday slots only", () => {
    expect(REMINDER_SLOTS).toEqual([
      { day: "monday", expoWeekday: 2 },
      { day: "thursday", expoWeekday: 5 },
    ]);
    expect(DEFAULT_WEEKLY_WEEKDAY).toBe(2);
  });
});
