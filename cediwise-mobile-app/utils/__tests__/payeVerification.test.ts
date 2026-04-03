import { GHANA_TAX_FALLBACK_2026 } from "../taxSync";
import {
  PAYE_VERIFICATION_TOLERANCE_GHS,
  buildCasualShareMessage,
  buildPayeVerificationSnapshot,
  buildPrivacySafeShareBody,
  compareEmployerDeduction,
  describeCasualPayeLine,
  describeCasualSsnitLine,
  describePrivacySafeDeductionLine,
  isSsnitInsurableCapApplied,
  payeVerificationResultState,
  salaryRangeBucket,
  shouldShowHighSalaryWarning,
} from "../payeVerification";

describe("compareEmployerDeduction", () => {
  it("treats exact match as correct", () => {
    const r = compareEmployerDeduction(100, 100);
    expect(r.verdict).toBe("correct");
    expect(r.diff).toBe(0);
  });

  it("treats diff within ±1 GHS as correct (tolerance)", () => {
    expect(compareEmployerDeduction(100, 101).verdict).toBe("correct");
    expect(compareEmployerDeduction(100, 99).verdict).toBe("correct");
    expect(compareEmployerDeduction(100, 100.5).verdict).toBe("correct");
  });

  it("treats diff > 1 as overpaid when claimed > computed", () => {
    const r = compareEmployerDeduction(105, 100);
    expect(r.verdict).toBe("overpaid");
    expect(r.diff).toBe(5);
  });

  it("treats diff < -1 as underpaid when claimed < computed", () => {
    const r = compareEmployerDeduction(95, 100);
    expect(r.verdict).toBe("underpaid");
    expect(r.diff).toBe(-5);
  });

  it("boundary: diff = 1 + epsilon is overpaid", () => {
    const r = compareEmployerDeduction(
      100 + PAYE_VERIFICATION_TOLERANCE_GHS + 0.01,
      100,
    );
    expect(r.verdict).toBe("overpaid");
  });

  it("boundary: diff = -(1 + epsilon) is underpaid", () => {
    const r = compareEmployerDeduction(
      100 - PAYE_VERIFICATION_TOLERANCE_GHS - 0.01,
      100,
    );
    expect(r.verdict).toBe("underpaid");
  });

  it("sanitizes NaN claimed to 0", () => {
    const r = compareEmployerDeduction(NaN, 50);
    expect(r.claimed).toBe(0);
    expect(r.verdict).toBe("underpaid");
  });

  it("sanitizes NaN computed to 0", () => {
    const r = compareEmployerDeduction(50, NaN);
    expect(r.computed).toBe(0);
    expect(r.verdict).toBe("overpaid");
  });

  it("sanitizes Infinity claimed to 0 via Math.max", () => {
    const r = compareEmployerDeduction(Infinity, 10);
    expect(r.claimed).toBe(0);
  });

  it("negative claimed is clamped to 0", () => {
    const r = compareEmployerDeduction(-20, 15);
    expect(r.claimed).toBe(0);
    expect(r.verdict).toBe("underpaid");
  });

  it("negative computed is clamped to 0", () => {
    const r = compareEmployerDeduction(10, -5);
    expect(r.computed).toBe(0);
    expect(r.verdict).toBe("overpaid");
  });

  it("custom tolerance overrides default", () => {
    expect(compareEmployerDeduction(100.5, 100, 0).verdict).toBe("overpaid");
    expect(compareEmployerDeduction(100.5, 100, 1).verdict).toBe("correct");
  });
});

describe("buildPayeVerificationSnapshot", () => {
  it("computes annual PAYE overpayment only when PAYE overpaid", () => {
    const s = buildPayeVerificationSnapshot(120, 50, 100, 50);
    expect(s.paye.verdict).toBe("overpaid");
    expect(s.annualPayeOverpaymentIfOverpaid).toBe(20 * 12);
    expect(s.ssnit.verdict).toBe("correct");
  });

  it("returns null annual overpayment when PAYE not overpaid", () => {
    const s = buildPayeVerificationSnapshot(100, 50, 100, 50);
    expect(s.annualPayeOverpaymentIfOverpaid).toBeNull();
  });
});

describe("payeVerificationResultState", () => {
  it("returns correct when both lines match", () => {
    const snap = buildPayeVerificationSnapshot(100, 50, 100, 50);
    expect(payeVerificationResultState(snap)).toBe("correct");
  });

  it("returns single flag when only PAYE mismatches", () => {
    const snap = buildPayeVerificationSnapshot(110, 50, 100, 50);
    expect(payeVerificationResultState(snap)).toBe("paye_overpaid");
  });

  it("returns mixed when both lines mismatch", () => {
    const snap = buildPayeVerificationSnapshot(110, 60, 100, 50);
    expect(payeVerificationResultState(snap)).toBe("mixed");
  });

  it("returns ssnit_underpaid when only SSNIT is low", () => {
    const snap = buildPayeVerificationSnapshot(100, 40, 100, 50);
    expect(payeVerificationResultState(snap)).toBe("ssnit_underpaid");
  });
});

describe("salaryRangeBucket", () => {
  it("buckets edge cases", () => {
    expect(salaryRangeBucket(0)).toBe("unknown");
    expect(salaryRangeBucket(-100)).toBe("unknown");
    expect(salaryRangeBucket(500)).toBe("0_999");
    expect(salaryRangeBucket(1000)).toBe("1000_4999");
    expect(salaryRangeBucket(500_000)).toBe("500000_plus");
  });

  it("sanitizes NaN to unknown", () => {
    expect(salaryRangeBucket(NaN)).toBe("unknown");
  });
});

describe("isSsnitInsurableCapApplied", () => {
  it("is true when gross exceeds cap", () => {
    expect(
      isSsnitInsurableCapApplied(70_000, GHANA_TAX_FALLBACK_2026),
    ).toBe(true);
  });

  it("is false at or below cap", () => {
    expect(
      isSsnitInsurableCapApplied(69_000, GHANA_TAX_FALLBACK_2026),
    ).toBe(false);
  });

  it("is false when cap is invalid", () => {
    const cfg = { ...GHANA_TAX_FALLBACK_2026, ssnit_monthly_cap: 0 };
    expect(isSsnitInsurableCapApplied(100_000, cfg)).toBe(false);
  });
});

describe("shouldShowHighSalaryWarning", () => {
  it("is true above threshold", () => {
    expect(shouldShowHighSalaryWarning(500_001)).toBe(true);
  });

  it("is false at threshold", () => {
    expect(shouldShowHighSalaryWarning(500_000)).toBe(false);
  });
});

describe("describePrivacySafeDeductionLine", () => {
  it("never includes digits or GHS", () => {
    const lines = [
      describePrivacySafeDeductionLine("PAYE", "correct"),
      describePrivacySafeDeductionLine("PAYE", "overpaid"),
      describePrivacySafeDeductionLine("PAYE", "underpaid"),
      describePrivacySafeDeductionLine("SSNIT", "correct"),
    ].join(" ");
    expect(lines).not.toMatch(/\d/);
    expect(lines.toLowerCase()).not.toContain("ghs");
  });
});

describe("buildPrivacySafeShareBody", () => {
  it("combines PAYE and SSNIT lines without amounts", () => {
    const snap = buildPayeVerificationSnapshot(100, 50, 100, 50);
    const body = buildPrivacySafeShareBody(snap);
    expect(body).toContain("PAYE:");
    expect(body).toContain("SSNIT:");
    expect(body).not.toMatch(/\d/);
  });
});

describe("describeCasualPayeLine", () => {
  it("returns playful copy for correct", () => {
    expect(describeCasualPayeLine("correct")).toContain("on point");
  });

  it("returns playful copy for overpaid", () => {
    expect(describeCasualPayeLine("overpaid")).toContain("more than GRA");
  });

  it("returns playful copy for underpaid", () => {
    expect(describeCasualPayeLine("underpaid")).toContain("less than GRA");
  });
});

describe("describeCasualSsnitLine", () => {
  it("returns playful copy for correct", () => {
    expect(describeCasualSsnitLine("correct")).toContain("good");
  });

  it("returns playful copy for overpaid", () => {
    expect(describeCasualSsnitLine("overpaid")).toContain("high side");
  });

  it("returns playful copy for underpaid", () => {
    expect(describeCasualSsnitLine("underpaid")).toContain("short");
  });
});

describe("buildCasualShareMessage", () => {
  it("returns 'all good' message when both correct", () => {
    const snap = buildPayeVerificationSnapshot(100, 50, 100, 50);
    const msg = buildCasualShareMessage(snap);
    expect(msg).toContain("All good");
    expect(msg).toContain("cediwise.app");
  });

  it("returns 'overdeducting' message when overpaid", () => {
    const snap = buildPayeVerificationSnapshot(120, 50, 100, 50);
    const msg = buildCasualShareMessage(snap);
    expect(msg).toContain("overdeducting");
    expect(msg).toContain("cediwise.app");
  });

  it("returns 'discrepancies' message when underpaid", () => {
    const snap = buildPayeVerificationSnapshot(80, 50, 100, 50);
    const msg = buildCasualShareMessage(snap);
    expect(msg).toContain("discrepancies");
    expect(msg).toContain("cediwise.app");
  });

  it("returns 'don't add up' message for mixed verdict", () => {
    const snap = buildPayeVerificationSnapshot(120, 40, 100, 50);
    const msg = buildCasualShareMessage(snap);
    expect(msg).toContain("don't add up");
    expect(msg).toContain("cediwise.app");
  });
});
