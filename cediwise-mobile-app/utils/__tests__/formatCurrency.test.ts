import { formatCurrency } from "../formatCurrency";

describe("formatCurrency", () => {
  // ── Basic formatting ────────────────────────────────────────────────
  it("formats integer to 2 decimal places", () => {
    const result = formatCurrency(1000);
    expect(result).toMatch(/1[,.]000\.00/);
  });

  it("formats decimal value correctly", () => {
    const result = formatCurrency(1234.5);
    expect(result).toMatch(/1[,.]234\.50/);
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toBe("0.00");
  });

  it("formats negative values", () => {
    const result = formatCurrency(-500);
    expect(result).toMatch(/-?500\.00/);
  });

  // ── Custom decimals ─────────────────────────────────────────────────
  it("respects custom decimal places", () => {
    const result = formatCurrency(100, 0);
    expect(result).not.toContain(".");
  });

  it("supports 3 decimal places", () => {
    const result = formatCurrency(99.1234, 3);
    expect(result).toMatch(/99\.123/);
  });

  // ── String input ────────────────────────────────────────────────────
  it("parses string input with commas", () => {
    const result = formatCurrency("1,234.56");
    expect(result).toMatch(/1[,.]234\.56/);
  });

  it("parses plain string number", () => {
    const result = formatCurrency("500");
    expect(result).toBe("500.00");
  });

  // ── Edge cases ──────────────────────────────────────────────────────
  it("returns 0.00 for NaN", () => {
    const result = formatCurrency(NaN);
    expect(result).toBe("0.00");
  });

  it("returns 0.00 for Infinity", () => {
    const result = formatCurrency(Infinity);
    expect(result).toBe("0.00");
  });

  it("returns 0.00 for -Infinity", () => {
    const result = formatCurrency(-Infinity);
    expect(result).toBe("0.00");
  });

  it("returns 0.00 for non-numeric string", () => {
    const result = formatCurrency("abc");
    expect(result).toBe("0.00");
  });

  it("handles very large numbers", () => {
    const result = formatCurrency(1_000_000_000);
    expect(result).toContain("000");
    expect(result).toContain(".00");
  });

  it("handles very small decimal", () => {
    const result = formatCurrency(0.001);
    expect(result).toBe("0.00");
  });
});
