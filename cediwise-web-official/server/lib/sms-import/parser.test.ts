import { describe, expect, it } from 'vitest'
import { buildDedupeKey, parseGhanaMoMoSms, parseGhsAmount } from './parser'

describe('parseGhsAmount', () => {
  it('parses comma-separated amounts', () => {
    expect(parseGhsAmount('1,250.50')).toBe(1250.5)
  })

  it('returns null for invalid input', () => {
    expect(parseGhsAmount('abc')).toBeNull()
  })
})

describe('parseGhanaMoMoSms — MTN', () => {
  it('parses payment made (expense)', () => {
    const sms =
      'Payment made for GHS 50.00 to SHOP XYZ. Fee: GHS 0.38. Available balance: GHS 200.00. Reference: 998877. Transaction ID: 1234567890'
    const parsed = parseGhanaMoMoSms(sms, 'MTN MoMo')
    expect(parsed.provider).toBe('mtn_momo')
    expect(parsed.direction).toBe('expense')
    expect(parsed.amount).toBe(50)
    expect(parsed.fee).toBe(0.38)
    expect(parsed.counterparty).toContain('SHOP XYZ')
    expect(parsed.txId).toBe('1234567890')
    expect(parsed.confidence).toBe('high')
  })

  it('parses payment received (income)', () => {
    const sms =
      'Payment received for GHS 100.00 from JOHN DOE 0241234567. Current balance: GHS 300.00. Transaction ID: 555'
    const parsed = parseGhanaMoMoSms(sms, 'MTN')
    expect(parsed.direction).toBe('income')
    expect(parsed.amount).toBe(100)
    expect(parsed.counterparty).toContain('JOHN DOE')
  })

  it('parses cash out (expense)', () => {
    const sms = 'Cash Out of GHS 200.00 from AGENT NAME. Transaction ID: 42'
    const parsed = parseGhanaMoMoSms(sms)
    expect(parsed.direction).toBe('expense')
    expect(parsed.amount).toBe(200)
  })

  it('parses cash in (transfer)', () => {
    const sms = 'Cash In of GHS 150.00 from AGENT. Transaction ID: 99'
    const parsed = parseGhanaMoMoSms(sms)
    expect(parsed.direction).toBe('transfer')
    expect(parsed.amount).toBe(150)
  })
})

describe('parseGhanaMoMoSms — Telecel', () => {
  it('parses sent message (expense)', () => {
    const sms =
      'You have sent GHS 25.00 to MERCHANT ABC. Your balance is GHS 75.00. Reference: 1122'
    const parsed = parseGhanaMoMoSms(sms, 'Telecel')
    expect(parsed.provider).toBe('telecel_cash')
    expect(parsed.direction).toBe('expense')
    expect(parsed.amount).toBe(25)
    expect(parsed.counterparty).toContain('MERCHANT ABC')
  })

  it('parses received message (income)', () => {
    const sms = 'You have received GHS 80.00 from JANE DOE.'
    const parsed = parseGhanaMoMoSms(sms, 'Telecel Cash')
    expect(parsed.direction).toBe('income')
    expect(parsed.amount).toBe(80)
  })
})

describe('parseGhanaMoMoSms — unknown', () => {
  it('returns unknown for promo SMS', () => {
    const parsed = parseGhanaMoMoSms(
      'Enjoy 50% bonus on your next recharge. Dial *123# now!',
    )
    expect(parsed.direction).toBe('unknown')
    expect(parsed.amount).toBeNull()
    expect(parsed.confidence).toBe('low')
  })
})

describe('buildDedupeKey', () => {
  it('uses provider and tx id when available', () => {
    const parsed = parseGhanaMoMoSms(
      'Payment made for GHS 10.00 to A. Transaction ID: 777',
    )
    expect(buildDedupeKey(parsed, 'raw')).toBe('mtn_momo:777')
  })

  it('falls back to hash prefix when no tx id', () => {
    const parsed = parseGhanaMoMoSms('random text without ids')
    const key = buildDedupeKey(parsed, 'same body')
    expect(key.startsWith('hash:')).toBe(true)
  })
})
