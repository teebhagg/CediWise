import {
  computeGhanaTax2026Monthly,
  GHANA_TAX_FALLBACK_2026,
} from '../ghanaTax'

describe('computeGhanaTax2026Monthly', () => {
  it('calculates SSNIT at 5.5% of gross', () => {
    const result = computeGhanaTax2026Monthly(1000)
    expect(result.ssnit).toBeCloseTo(55, 2)
  })

  it('caps SSNIT at maximum insurable earnings', () => {
    const result = computeGhanaTax2026Monthly(100_000)
    expect(result.ssnit).toBeCloseTo(69_000 * 0.055, 2)
  })

  it('applies 0% PAYE for chargeable income within first band', () => {
    const result = computeGhanaTax2026Monthly(500)
    expect(result.paye).toBe(0)
  })

  it('applies progressive bands for higher income', () => {
    const result = computeGhanaTax2026Monthly(2000)
    expect(result.paye).toBeCloseTo(221.5, 1)
  })

  it('calculates net take-home = gross - ssnit - paye', () => {
    const result = computeGhanaTax2026Monthly(3000)
    expect(result.netTakeHome).toBeCloseTo(
      3000 - result.ssnit - result.paye,
      2,
    )
  })

  it('returns zeros for invalid salary', () => {
    const result = computeGhanaTax2026Monthly(-5000)
    expect(result.ssnit).toBe(0)
    expect(result.paye).toBe(0)
    expect(result.netTakeHome).toBe(0)
  })

  it('defaults to GHANA_TAX_FALLBACK_2026 config', () => {
    const withDefault = computeGhanaTax2026Monthly(1000)
    const withExplicit = computeGhanaTax2026Monthly(
      1000,
      GHANA_TAX_FALLBACK_2026,
    )
    expect(withDefault).toEqual(withExplicit)
  })
})
