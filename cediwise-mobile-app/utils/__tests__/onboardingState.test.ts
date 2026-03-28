import {
  getOnboardingStatus,
  setOnboardingStatus,
  ONBOARDING_VERSION,
  type AccountOnboardingRecord,
} from "../onboardingState";

function makeRecord(
  overrides?: Partial<AccountOnboardingRecord>
): AccountOnboardingRecord {
  return {
    userId: "u1",
    onboardingVersion: ONBOARDING_VERSION,
    state1Status: "never_seen",
    state1SeenAt: null,
    state1CompletedAt: null,
    state1DismissedAt: null,
    state1InvalidatedAt: null,
    state2Status: "never_seen",
    state2SeenAt: null,
    state2CompletedAt: null,
    state2DismissedAt: null,
    ...overrides,
  };
}

describe("getOnboardingStatus", () => {
  it("returns state1Status for state_1_unpersonalized", () => {
    const record = makeRecord({ state1Status: "completed" });
    expect(getOnboardingStatus(record, "state_1_unpersonalized")).toBe(
      "completed"
    );
  });

  it("returns state2Status for state_2_personalized", () => {
    const record = makeRecord({ state2Status: "in_progress" });
    expect(getOnboardingStatus(record, "state_2_personalized")).toBe(
      "in_progress"
    );
  });

  it("returns never_seen by default", () => {
    const record = makeRecord();
    expect(getOnboardingStatus(record, "state_1_unpersonalized")).toBe(
      "never_seen"
    );
    expect(getOnboardingStatus(record, "state_2_personalized")).toBe(
      "never_seen"
    );
  });
});

describe("setOnboardingStatus", () => {
  const now = "2025-06-15T10:00:00.000Z";

  // ── State 1 ─────────────────────────────────────────────────────────
  it("sets state1 to completed with timestamps", () => {
    const record = makeRecord();
    const result = setOnboardingStatus(
      record,
      "state_1_unpersonalized",
      "completed",
      now
    );
    expect(result.state1Status).toBe("completed");
    expect(result.state1CompletedAt).toBe(now);
    expect(result.state1SeenAt).toBe(now); // first seen
    expect(result.state1DismissedAt).toBeNull();
    expect(result.state1InvalidatedAt).toBeNull();
  });

  it("sets state1 to dismissed with timestamps", () => {
    const record = makeRecord();
    const result = setOnboardingStatus(
      record,
      "state_1_unpersonalized",
      "dismissed",
      now
    );
    expect(result.state1Status).toBe("dismissed");
    expect(result.state1DismissedAt).toBe(now);
    expect(result.state1CompletedAt).toBeNull();
  });

  it("sets state1 to invalidated with timestamps", () => {
    const record = makeRecord();
    const result = setOnboardingStatus(
      record,
      "state_1_unpersonalized",
      "invalidated",
      now
    );
    expect(result.state1Status).toBe("invalidated");
    expect(result.state1InvalidatedAt).toBe(now);
  });

  it("preserves existing state1SeenAt when already set", () => {
    const existingSeenAt = "2025-01-01T00:00:00.000Z";
    const record = makeRecord({ state1SeenAt: existingSeenAt });
    const result = setOnboardingStatus(
      record,
      "state_1_unpersonalized",
      "completed",
      now
    );
    expect(result.state1SeenAt).toBe(existingSeenAt);
  });

  // ── State 2 ─────────────────────────────────────────────────────────
  it("sets state2 to completed with timestamps", () => {
    const record = makeRecord();
    const result = setOnboardingStatus(
      record,
      "state_2_personalized",
      "completed",
      now
    );
    expect(result.state2Status).toBe("completed");
    expect(result.state2CompletedAt).toBe(now);
    expect(result.state2SeenAt).toBe(now);
    expect(result.state2DismissedAt).toBeNull();
  });

  it("sets state2 to dismissed with timestamps", () => {
    const record = makeRecord();
    const result = setOnboardingStatus(
      record,
      "state_2_personalized",
      "dismissed",
      now
    );
    expect(result.state2Status).toBe("dismissed");
    expect(result.state2DismissedAt).toBe(now);
    expect(result.state2CompletedAt).toBeNull();
  });

  it("preserves existing state2SeenAt when already set", () => {
    const existingSeenAt = "2025-01-01T00:00:00.000Z";
    const record = makeRecord({ state2SeenAt: existingSeenAt });
    const result = setOnboardingStatus(
      record,
      "state_2_personalized",
      "completed",
      now
    );
    expect(result.state2SeenAt).toBe(existingSeenAt);
  });

  // ── Version ─────────────────────────────────────────────────────────
  it("always sets onboardingVersion to current ONBOARDING_VERSION", () => {
    const record = makeRecord({ onboardingVersion: 0 });
    const result = setOnboardingStatus(
      record,
      "state_1_unpersonalized",
      "completed",
      now
    );
    expect(result.onboardingVersion).toBe(ONBOARDING_VERSION);
  });

  // ── Immutability ────────────────────────────────────────────────────
  it("does not mutate the original record", () => {
    const record = makeRecord();
    const original = { ...record };
    setOnboardingStatus(record, "state_1_unpersonalized", "completed", now);
    expect(record).toEqual(original);
  });
});
