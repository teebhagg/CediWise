import {
  pickCategoryForSms,
  type BudgetCategoryRow,
} from './categoryRules'
import type { ParsedSms } from './types'
import { describe, expect, it } from 'vitest'

function parsed(partial: Partial<ParsedSms> & { counterparty: string | null }): ParsedSms {
  return {
    provider: 'mtn_momo',
    direction: 'expense',
    amount: 2,
    fee: 0,
    reference: null,
    txId: '1',
    balanceAfter: null,
    confidence: 'high',
    ...partial,
  }
}

const SAMPLE: BudgetCategoryRow[] = [
  { id: 't1', name: 'Transport', bucket: 'needs' },
  { id: 'g1', name: 'Groceries', bucket: 'needs' },
  { id: 'e1', name: 'ECG', bucket: 'needs' },
  { id: 'w1', name: 'Ghana Water', bucket: 'needs' },
  { id: 'd1', name: 'Data Bundles', bucket: 'wants' },
  { id: 'o1', name: 'Others', bucket: 'wants' },
]

describe('pickCategoryForSms', () => {
  it('maps MTN AIRTIME to Data Bundles', () => {
    const hit = pickCategoryForSms(
      SAMPLE,
      parsed({ counterparty: 'MTN AIRTIME' }),
      'Your payment of GHS 2.00 to MTN AIRTIME has been completed',
    )
    expect(hit?.id).toBe('d1')
    expect(hit?.name).toBe('Data Bundles')
  })

  it('falls back to Others when Data Bundles is missing for airtime', () => {
    const withoutData = SAMPLE.filter((c) => c.name !== 'Data Bundles')
    const hit = pickCategoryForSms(
      withoutData,
      parsed({ counterparty: 'MTN AIRTIME' }),
    )
    expect(hit?.name).toBe('Others')
  })

  it('maps ECG PREPAID to ECG', () => {
    const hit = pickCategoryForSms(
      SAMPLE,
      parsed({ counterparty: 'ECG PREPAID' }),
    )
    expect(hit?.name).toBe('ECG')
  })

  it('maps Ghana Water merchants to Ghana Water', () => {
    const hit = pickCategoryForSms(
      SAMPLE,
      parsed({ counterparty: 'GWCL PAYMENT' }),
    )
    expect(hit?.name).toBe('Ghana Water')
  })

  it('uses Others → Transport fallback for unknown merchants', () => {
    const hit = pickCategoryForSms(
      SAMPLE,
      parsed({ counterparty: 'KWAME MENSAH' }),
      'Payment made for GHS 25.00 to KWAME MENSAH',
    )
    expect(hit?.name).toBe('Others')
  })

  it('uses Transport when Others is absent for unknown merchants', () => {
    const withoutOthers = SAMPLE.filter((c) => c.name !== 'Others')
    const hit = pickCategoryForSms(
      withoutOthers,
      parsed({ counterparty: 'KWAME MENSAH' }),
    )
    expect(hit?.name).toBe('Transport')
  })

  it('returns null for an empty category list', () => {
    expect(pickCategoryForSms([], parsed({ counterparty: 'MTN AIRTIME' }))).toBeNull()
  })
})
