import { describe, expect, it, vi } from 'vitest'
import { ClientImportConflictError, importStructuredCandidate } from './insert'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { StructuredCandidate } from './types'

describe('importStructuredCandidate', () => {
  it.each([
    { eventType: 'bill_payment', counterparty: 'ECG', expectedCategoryId: 'ecg-category' },
    { eventType: 'airtime_data', counterparty: 'Network', expectedCategoryId: 'data-bundles-category' },
  ] as const)(
    'resolves $eventType category from structured fields before calling the RPC',
    async ({ eventType, counterparty, expectedCategoryId }) => {
      const categories = [
        { id: 'data-bundles-category', name: 'Data Bundles', bucket: 'needs' },
        { id: 'ecg-category', name: 'ECG', bucket: 'needs' },
        { id: 'other-category', name: 'Others', bucket: 'wants' },
      ]
      const admin = {
        from: vi.fn((table: string) => {
          const builder: Record<string, any> = {
            select: vi.fn(() => builder),
            eq: vi.fn(() => builder),
            lte: vi.fn(() => builder),
            gte: vi.fn(() => builder),
            order: vi.fn(() => builder),
            limit: vi.fn(() => builder),
            maybeSingle: vi.fn().mockResolvedValue({
              data: table === 'budget_cycles' ? { id: 'cycle-1' } : null,
              error: null,
            }),
            then: (resolve: (value: unknown) => unknown) =>
              Promise.resolve({ data: table === 'budget_categories' ? categories : null, error: null }).then(resolve),
          }
          return builder
        }),
        rpc: vi.fn().mockResolvedValue({ data: { status: 'parsed' }, error: null }),
      } as unknown as SupabaseClient
      const candidate: StructuredCandidate = {
        schemaVersion: 1,
        clientImportId: 'sms-12345678',
        provider: 'mtn_momo',
        eventType,
        principalPesewas: 5000,
        feePesewas: 0,
        receivedAt: '2026-10-01T10:00:00.000Z',
        counterparty,
        receiptId: 'receipt-123',
        reversedReceiptId: null,
        parserVersion: '1',
        confidence: 'high',
        classification: 'expense',
        categoryId: null,
      }

      await importStructuredCandidate(admin, 'user-1', candidate)

      expect(admin.from).toHaveBeenCalledWith('budget_cycles')
      expect(admin.from).toHaveBeenCalledWith('budget_categories')
      expect(admin.rpc).toHaveBeenCalledWith('import_structured_momo_expense', expect.objectContaining({
        p_candidate: expect.objectContaining({ categoryId: expectedCategoryId }),
      }))
    },
  )

  it('maps a reused client import id with a different payload to a terminal conflict', async () => {
    const admin = {
      from: vi.fn(),
      rpc: vi.fn().mockResolvedValue({ data: null, error: { message: 'client_import_id_conflict' } }),
    } as unknown as SupabaseClient
    const candidate: StructuredCandidate = {
      schemaVersion: 1,
      clientImportId: 'sms-12345678',
      provider: 'mtn_momo',
      eventType: 'reversal',
      principalPesewas: null,
      feePesewas: 0,
      receivedAt: '2026-10-01T10:00:00.000Z',
      counterparty: null,
      receiptId: null,
      reversedReceiptId: 'R1',
      parserVersion: '1',
      confidence: 'high',
      classification: null,
      categoryId: 'category-1',
    }
    process.env.SMS_IMPORT_HMAC_SECRET = 'x'.repeat(32)

    await expect(importStructuredCandidate(admin, 'user-1', candidate)).rejects.toBeInstanceOf(ClientImportConflictError)
  })
})
