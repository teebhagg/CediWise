import { describe, expect, it } from 'vitest'
import { buildDedupeKey, isMoMoTransactionSms, parseGhanaMoMoSms, parseGhsAmount } from './parser'

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

  it('parses payment made without period after name', () => {
    const sms =
      'Payment made for GHS 20.00 to JOSHUA ANSAH Current Balance: GHS 69.49 . Available Balance: GHS 69.49. Reference: . Transaction ID: 999888777'
    const parsed = parseGhanaMoMoSms(sms, 'MTN')
    expect(parsed.direction).toBe('expense')
    expect(parsed.amount).toBe(20)
    expect(parsed.counterparty).toBe('JOSHUA ANSAH')
    expect(parsed.balanceAfter).toBe(69.49)
    expect(parsed.txId).toBe('999888777')
  })

  it('parses payment received (income)', () => {
    const sms =
      'Payment received for GHS 100.00 from JOHN DOE 0241234567. Current balance: GHS 300.00. Transaction ID: 555'
    const parsed = parseGhanaMoMoSms(sms, 'MTN')
    expect(parsed.direction).toBe('income')
    expect(parsed.amount).toBe(100)
    expect(parsed.counterparty).toContain('JOHN DOE')
  })

  it('parses payment received without period after name', () => {
    const sms =
      'Payment received for GHS 20.00 from JOSHUA ANSAH  Current Balance: GHS 20.55 . Available Balance: GHS 20.55. Reference: . Transaction ID: 112233'
    const parsed = parseGhanaMoMoSms(sms, 'MTN MoMo')
    expect(parsed.direction).toBe('income')
    expect(parsed.amount).toBe(20)
    expect(parsed.counterparty).toBe('JOSHUA ANSAH')
    expect(parsed.balanceAfter).toBe(20.55)
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

  it('parses your payment completed (expense)', () => {
    const sms =
      'Your payment of GHS 5.00 to ECG PREPAID has been completed at 2026-07-08 14:30:00. Your new balance is GHS 45.50. Transaction ID: 1234567890'
    const parsed = parseGhanaMoMoSms(sms, 'MTN MoMo')
    expect(parsed.provider).toBe('mtn_momo')
    expect(parsed.direction).toBe('expense')
    expect(parsed.amount).toBe(5)
    expect(parsed.counterparty).toBe('ECG PREPAID')
    expect(parsed.balanceAfter).toBe(45.5)
    expect(parsed.txId).toBe('1234567890')
    expect(parsed.confidence).toBe('high')
  })

  it('parses MTN airtime payment with Financial Transaction Id (real format)', () => {
    const sms =
      'Your payment of GHS 2.00 to MTN AIRTIME has been completed at 2026-07-08 21:56:07. Your new balance: GHS 20.55. Fee was GHS 0.00 Tax was GHS -. Reference: -. Financial Transaction Id: 85012132862. External Transaction Id: 85012132862.Download the MoMo App for a Faster & Easier Experience Click here: https://mtnmymomo.onelink.me/XJOt/MoMo'
    const parsed = parseGhanaMoMoSms(sms, 'MTN MoMo')
    expect(parsed.provider).toBe('mtn_momo')
    expect(parsed.direction).toBe('expense')
    expect(parsed.amount).toBe(2)
    expect(parsed.counterparty).toBe('MTN AIRTIME')
    expect(parsed.balanceAfter).toBe(20.55)
    expect(parsed.fee).toBe(0)
    expect(parsed.reference).toBeNull()
    expect(parsed.txId).toBe('85012132862')
    expect(isMoMoTransactionSms(sms, 'MTN MoMo')).toBe(true)
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

  it('parses T-Cash Confirmed sent-to SMS (real format)', () => {
    const sms =
      '0000013645405283 Confirmed. GHS2.00 sent to 0534578211 - JOSHUA ANSAH on MTN MOBILE MONEY on 2026-07-08 at 15:19:37. Your Telecel Cash balance is GHS30.92. You were charged GHS0.00. Your E-levy charge is GHS0.00. Sending money from Telecel Cash to Telecel Cash remains FREE on the Telecel Play App. Download the App https://bit.ly/TelecelPlayGhana and continue to enjoy the convenience. Reference: Airtime. Sendi k3k3!'
    const parsed = parseGhanaMoMoSms(sms, 'Telecel')
    expect(parsed.provider).toBe('telecel_cash')
    expect(parsed.direction).toBe('expense')
    expect(parsed.amount).toBe(2)
    expect(parsed.fee).toBe(0)
    expect(parsed.txId).toBe('0000013645405283')
    expect(parsed.counterparty).toContain('0534578211')
    expect(parsed.counterparty).toContain('JOSHUA ANSAH')
    expect(parsed.balanceAfter).toBe(30.92)
    expect(parsed.reference).toBe('Airtime')
    expect(parsed.confidence).toBe('high')
  })

  it('parses T-Cash Confirmed received-from SMS', () => {
    const sms =
      '0000013645405999 Confirmed. GHS15.50 received from 0244111222 - AMA MENSAH on MTN MOBILE MONEY on 2026-07-08 at 10:00:00. Your Telecel Cash balance is GHS100.00. You were charged GHS0.00.'
    const parsed = parseGhanaMoMoSms(sms, 'T-Cash')
    expect(parsed.provider).toBe('telecel_cash')
    expect(parsed.direction).toBe('income')
    expect(parsed.amount).toBe(15.5)
    expect(parsed.txId).toBe('0000013645405999')
    expect(parsed.counterparty).toContain('AMA MENSAH')
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

describe('isMoMoTransactionSms', () => {
  it('returns true for MTN and Telecel transaction alerts', () => {
    expect(
      isMoMoTransactionSms(
        'Your payment of GHS 5.00 to ECG PREPAID has been completed at 2026-07-08 14:30:00. Your new balance is GHS 45.50.',
        'MTN',
      ),
    ).toBe(true)
    expect(
      isMoMoTransactionSms(
        '0000013645405283 Confirmed. GHS2.00 sent to 0534578211 - JOSHUA ANSAH on MTN MOBILE MONEY',
        'Telecel',
      ),
    ).toBe(true)
  })

  it('returns false for promos and non-transaction SMS', () => {
    expect(
      isMoMoTransactionSms(
        'Enjoy 50% bonus on your next recharge. Dial *123# now!',
      ),
    ).toBe(false)
    expect(
      isMoMoTransactionSms(
        'Your MoMo wallet balance is GHS 50.00. Dial *170# for more services.',
        'MTN MoMo',
      ),
    ).toBe(false)
  })
})

describe('buildDedupeKey', () => {
  it('uses provider and tx id when available', () => {
    const parsed = parseGhanaMoMoSms(
      'Payment made for GHS 10.00 to A. Transaction ID: 777',
    )
    expect(buildDedupeKey(parsed, 'raw')).toBe('mtn_momo:777')
  })

  it('uses Telecel confirm id for dedupe', () => {
    const sms =
      '0000013645405283 Confirmed. GHS2.00 sent to 0534578211 - JOSHUA ANSAH on MTN MOBILE MONEY on 2026-07-08 at 15:19:37. Your Telecel Cash balance is GHS30.92.'
    const parsed = parseGhanaMoMoSms(sms, 'Telecel')
    expect(buildDedupeKey(parsed, sms)).toBe('telecel_cash:0000013645405283')
  })

  it('falls back to hash prefix when no tx id', () => {
    const parsed = parseGhanaMoMoSms('random text without ids')
    const key = buildDedupeKey(parsed, 'same body')
    expect(key.startsWith('hash:')).toBe(true)
  })
})
