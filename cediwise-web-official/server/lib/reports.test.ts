import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { codePointLength, websiteReportSchema } from '../../src/lib/websiteReport'
import {
  DEFAULT_REPORT_RECIPIENT_EMAIL,
  REPORT_RATE_LIMIT,
  ReportRateLimitError,
  reportRecipientEmail,
  resolveResendEmailsUrl,
  sendReportEmail,
  submitWebsiteReport,
} from './reports'
import type { ReportEmailPayload } from './reports'
import type { SupabaseClient } from '@supabase/supabase-js'

const validInput = {
  category: 'app_problem' as const,
  name: '  Ama  ',
  email: 'Reader@Example.com',
  page: '',
  message: 'The budget tab crashes after saving a category.',
  do_not_fill: '',
}

type Call = { table: string; op: 'insert' | 'update' | 'eq' | 'select'; payload?: unknown }

type FakeOptions = {
  insertError?: { message: string } | null
  updateError?: { message: string } | null
  /** The first N status writes fail, to test the retry. */
  updateFailures?: number
  /** Reports already stored for this email / for the whole site in the window. */
  recentByEmail?: number
  recentOverall?: number
}

/** Minimal chainable stand-in for the Supabase admin client. */
function fakeAdmin(options: FakeOptions = {}) {
  const calls: Array<Call> = []
  let updatesToFail = options.updateFailures ?? 0

  const client = {
    from(table: string) {
      return {
        select(_columns: string, _options?: unknown) {
          calls.push({ table, op: 'select' })
          const state = { byEmail: false }
          const builder = {
            eq(column: string) {
              if (column === 'reporter_email') state.byEmail = true
              return builder
            },
            gte() {
              return builder
            },
            then(resolve: (value: unknown) => unknown) {
              const count = state.byEmail ? (options.recentByEmail ?? 0) : (options.recentOverall ?? 0)
              return Promise.resolve({ count, error: null }).then(resolve)
            },
          }
          return builder
        },
        insert(payload: unknown) {
          calls.push({ table, op: 'insert', payload })
          return {
            select: () => ({
              single: async () =>
                options.insertError
                  ? { data: null, error: options.insertError }
                  : { data: { id: 'report-1', created_at: '2026-11-24T10:00:00.000Z' }, error: null },
            }),
          }
        },
        update(payload: unknown) {
          calls.push({ table, op: 'update', payload })
          return {
            eq: async (column: string, value: unknown) => {
              calls.push({ table, op: 'eq', payload: { column, value } })
              if (updatesToFail > 0) {
                updatesToFail -= 1
                return { error: { message: 'write failed' } }
              }
              return { error: options.updateError ?? null }
            },
          }
        },
      }
    },
  }
  return { admin: client as unknown as SupabaseClient, calls }
}

describe('websiteReportSchema', () => {
  it('trims fields and turns empty optional values into null', () => {
    const parsed = websiteReportSchema.parse({ ...validInput, name: '   ', page: ' /pricing ' })
    expect(parsed.name).toBeNull()
    expect(parsed.page).toBe('/pricing')
    expect(parsed.email).toBe('Reader@Example.com')
  })

  it('counts the message length in characters, the same rule as the database', () => {
    // 9 characters, but 10 UTF-16 units: must fail the 10-character minimum.
    expect(() => websiteReportSchema.parse({ ...validInput, message: 'Crashes 😭' })).toThrow('at least 10')
    // 10 characters, 20 UTF-16 units: must pass.
    expect(() => websiteReportSchema.parse({ ...validInput, message: '😭'.repeat(10) })).not.toThrow()
    expect(codePointLength('😭'.repeat(10))).toBe(10)
  })

  it('rejects an unknown category, a bad email, and a short message', () => {
    expect(() => websiteReportSchema.parse({ ...validInput, category: 'nope' })).toThrow()
    expect(() => websiteReportSchema.parse({ ...validInput, email: 'not-an-email' })).toThrow()
    expect(() => websiteReportSchema.parse({ ...validInput, message: 'too short' })).toThrow()
  })
})

describe('submitWebsiteReport', () => {
  it('stores the report, emails it, and marks the email as sent', async () => {
    const { admin, calls } = fakeAdmin()
    const sent: Array<ReportEmailPayload> = []

    const result = await submitWebsiteReport(validInput, {
      admin,
      sendEmail: async (payload) => {
        sent.push(payload)
      },
      now: () => new Date('2026-11-24T10:00:05.000Z'),
    })

    expect(result).toMatchObject({ success: true, reportId: 'report-1' })

    const insert = calls.find((call) => call.op === 'insert')
    expect(insert?.table).toBe('website_reports')
    expect(insert?.payload).toEqual({
      category: 'app_problem',
      reporter_name: 'Ama',
      reporter_email: 'reader@example.com',
      message: 'The budget tab crashes after saving a category.',
      page: null,
      source: 'website_report_page',
    })

    expect(sent).toEqual([
      expect.objectContaining({
        reportId: 'report-1',
        category: 'app_problem',
        name: 'Ama',
        email: 'reader@example.com',
        createdAt: '2026-11-24T10:00:00.000Z',
      }),
    ])

    const statusUpdate = calls.find((call) => call.op === 'update')
    expect(statusUpdate?.payload).toMatchObject({ email_status: 'sent' })
  })

  it('keeps the report and marks it failed when email delivery fails', async () => {
    const { admin, calls } = fakeAdmin()
    vi.spyOn(console, 'error').mockImplementation(() => {})

    const result = await submitWebsiteReport(validInput, {
      admin,
      sendEmail: async () => {
        throw new Error('Resend is down')
      },
    })

    expect(result.success).toBe(true)
    expect(calls.some((call) => call.op === 'insert')).toBe(true)
    expect(calls.find((call) => call.op === 'update')?.payload).toMatchObject({ email_status: 'failed' })
    vi.mocked(console.error).mockRestore()
  })

  it('retries a failed status write once and then records it', async () => {
    const { admin, calls } = fakeAdmin({ updateFailures: 1 })
    vi.spyOn(console, 'error').mockImplementation(() => {})

    await submitWebsiteReport(validInput, { admin, sendEmail: async () => {} })

    const updates = calls.filter((call) => call.op === 'update')
    expect(updates).toHaveLength(2)
    expect(updates[1]?.payload).toMatchObject({ email_status: 'sent' })
    expect(console.error).not.toHaveBeenCalled()
    vi.mocked(console.error).mockRestore()
  })

  it('stores and sends nothing when the honeypot field is filled', async () => {
    const { admin, calls } = fakeAdmin()
    const sendEmail = vi.fn(async () => {})
    vi.spyOn(console, 'warn').mockImplementation(() => {})

    const result = await submitWebsiteReport({ ...validInput, do_not_fill: 'https://spam.example' }, { admin, sendEmail })

    expect(result).toMatchObject({ success: true, reportId: null })
    expect(calls).toEqual([])
    expect(sendEmail).not.toHaveBeenCalled()
    vi.mocked(console.warn).mockRestore()
  })

  it('refuses a sender who already filed the per-email limit, and stores nothing', async () => {
    const { admin, calls } = fakeAdmin({ recentByEmail: REPORT_RATE_LIMIT.perEmail })
    const sendEmail = vi.fn(async () => {})

    await expect(submitWebsiteReport(validInput, { admin, sendEmail })).rejects.toBeInstanceOf(ReportRateLimitError)
    expect(calls.some((call) => call.op === 'insert')).toBe(false)
    expect(sendEmail).not.toHaveBeenCalled()
  })

  it('refuses everyone once the site-wide limit is reached', async () => {
    const { admin, calls } = fakeAdmin({ recentOverall: REPORT_RATE_LIMIT.overall })

    await expect(
      submitWebsiteReport(validInput, { admin, sendEmail: async () => {} }),
    ).rejects.toBeInstanceOf(ReportRateLimitError)
    expect(calls.some((call) => call.op === 'insert')).toBe(false)
  })

  it('accepts reports just under both limits', async () => {
    const { admin } = fakeAdmin({
      recentByEmail: REPORT_RATE_LIMIT.perEmail - 1,
      recentOverall: REPORT_RATE_LIMIT.overall - 1,
    })

    await expect(submitWebsiteReport(validInput, { admin, sendEmail: async () => {} })).resolves.toMatchObject({
      success: true,
      reportId: 'report-1',
    })
  })

  it('throws when the database insert fails, so the visitor sees an error', async () => {
    const { admin } = fakeAdmin({ insertError: { message: 'insert failed' } })
    await expect(
      submitWebsiteReport(validInput, { admin, sendEmail: async () => {} }),
    ).rejects.toMatchObject({ message: 'insert failed' })
  })
})

describe('report recipient', () => {
  afterEach(() => {
    delete process.env.REPORT_RECIPIENT_EMAIL
  })

  it('uses the default inbox unless REPORT_RECIPIENT_EMAIL is set', () => {
    expect(reportRecipientEmail()).toBe(DEFAULT_REPORT_RECIPIENT_EMAIL)
    process.env.REPORT_RECIPIENT_EMAIL = '  ops@example.com '
    expect(reportRecipientEmail()).toBe('ops@example.com')
  })
})

describe('resolveResendEmailsUrl', () => {
  const production = 'https://api.resend.com/emails'

  it('uses Resend when no override is set', () => {
    expect(resolveResendEmailsUrl(undefined)).toBe(production)
  })

  it('accepts only http loopback overrides for local mail testing', () => {
    expect(resolveResendEmailsUrl('http://127.0.0.1:8787/emails')).toBe('http://127.0.0.1:8787/emails')
    expect(resolveResendEmailsUrl('http://localhost:8787/emails')).toBe('http://localhost:8787/emails')
  })

  it('ignores overrides that would send the key to another host', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(resolveResendEmailsUrl('https://evil.example/emails')).toBe(production)
    expect(resolveResendEmailsUrl('https://127.0.0.1:8787/emails')).toBe(production)
    expect(resolveResendEmailsUrl('not a url')).toBe(production)
    vi.mocked(console.warn).mockRestore()
  })
})

describe('sendReportEmail', () => {
  beforeEach(() => {
    process.env.RESEND_API_KEY = 'test-resend-key'
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    delete process.env.RESEND_API_KEY
  })

  it('sends to the CediWise inbox with the reporter as reply-to and escapes the message', async () => {
    const fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendReportEmail({
      reportId: 'report-9',
      category: 'safety_or_abuse',
      name: null,
      email: 'reader@example.com',
      page: '/pricing',
      message: '<script>alert("x")</script> please look',
      createdAt: '2026-11-24T10:00:00.000Z',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0] as unknown as [string, RequestInit]
    expect(url).toBe('https://api.resend.com/emails')
    const body = JSON.parse(String(init.body))
    expect(body.to).toEqual([reportRecipientEmail()])
    expect(body.reply_to).toBe('reader@example.com')
    expect(body.subject).toBe('[CediWise report] Abuse or safety')
    expect(body.text).toContain('Report ID: report-9')
    expect(body.html).not.toContain('<script>')
    expect(body.html).toContain('&lt;script&gt;')
  })

  it('refuses to send when the Resend key is missing', async () => {
    delete process.env.RESEND_API_KEY
    await expect(
      sendReportEmail({
        reportId: 'r',
        category: 'other',
        name: null,
        email: 'reader@example.com',
        page: null,
        message: 'Something to report here.',
        createdAt: '2026-11-24T10:00:00.000Z',
      }),
    ).rejects.toThrow('Report email delivery is not configured.')
  })
})
