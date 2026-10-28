import { describe, expect, it } from 'vitest'
import { smsImportBodySchema, structuredCandidateSchema } from './types'

const validCandidate = {
  schemaVersion: 1,
  clientImportId: 'sms-12345678',
  provider: 'mtn_momo',
  eventType: 'merchant_payment',
  principalPesewas: 1000,
  feePesewas: 0,
  receivedAt: '2026-10-01T10:00:00.000Z',
  counterparty: 'ECG',
  receiptId: null,
  reversedReceiptId: null,
  parserVersion: '1',
  confidence: 'high',
  classification: 'expense',
  categoryId: null,
}

describe('SMS import request schemas', () => {
  it('accepts an opaque SHA-256 legacy dedupe key', () => {
    expect(structuredCandidateSchema.safeParse({
      ...validCandidate,
      legacyDedupeKey: `hash:${'a'.repeat(64)}`,
    }).success).toBe(true)
    expect(structuredCandidateSchema.safeParse({
      ...validCandidate,
      legacyDedupeKey: 'hash:not-a-digest',
    }).success).toBe(false)
  })

  it('accepts native ISO timestamps with an explicit UTC offset', () => {
    expect(structuredCandidateSchema.safeParse({
      ...validCandidate,
      receivedAt: '2026-10-01T10:00:00.000+00:00',
    }).success).toBe(true)
  })

  it('rejects timestamps outside the supported SMS range', () => {
    expect(structuredCandidateSchema.safeParse({
      ...validCandidate,
      receivedAt: '1999-12-31T23:59:59.000Z',
    }).success).toBe(false)
    expect(structuredCandidateSchema.safeParse({
      ...validCandidate,
      receivedAt: '2099-01-01T00:00:00.000Z',
    }).success).toBe(false)
  })

  it('rejects raw legacy message fields on a structured candidate', () => {
    const result = structuredCandidateSchema.safeParse({
      ...validCandidate,
      legacyMessage: 'Payment made for GHS 10.00 to ECG.',
      legacySender: 'MTN MoMo',
    })

    expect(result.success).toBe(false)
  })

  it('bounds raw message length and sender size', () => {
    expect(smsImportBodySchema.safeParse({ message: 'x'.repeat(4001) }).success).toBe(false)
    expect(smsImportBodySchema.safeParse({ message: 'A valid body long enough', sender: 'x'.repeat(201) }).success).toBe(false)
    expect(smsImportBodySchema.safeParse({ message: 'A valid body long enough', sender: 'MTN\u0000MoMo' }).success).toBe(false)
  })

  it('requires an ISO timestamp for raw messages', () => {
    expect(smsImportBodySchema.safeParse({ message: 'A valid body long enough', receivedAt: 'yesterday' }).success).toBe(false)
  })
})
