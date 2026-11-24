import {
  WEBSITE_REPORT_CATEGORY_LABELS,
  websiteReportSchema,
} from '../../src/lib/websiteReport'
import { createAdminClient } from './supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { WebsiteReportData, WebsiteReportInput } from '../../src/lib/websiteReport'

/** Inbox that receives every website report. Override with REPORT_RECIPIENT_EMAIL. */
export const DEFAULT_REPORT_RECIPIENT_EMAIL = 'josua.ansah@cediwise.app'

export function reportRecipientEmail(): string {
  return process.env.REPORT_RECIPIENT_EMAIL?.trim() || DEFAULT_REPORT_RECIPIENT_EMAIL
}

/** Limits on the public form. Counted from stored reports, so refused attempts store nothing. */
export const REPORT_RATE_LIMIT = {
  windowMs: 10 * 60 * 1000,
  /** Reports one email address may send per window. */
  perEmail: 3,
  /** Reports the whole site accepts per window, to cap email volume during a flood. */
  overall: 50,
} as const

export class ReportRateLimitError extends Error {
  constructor() {
    super('Too many reports right now. Please try again in a few minutes.')
    this.name = 'ReportRateLimitError'
  }
}

const REPORT_FROM = 'CediWise <hello@cediwise.app>'
const RESEND_TIMEOUT_MS = 10_000
const RESEND_EMAILS_URL = 'https://api.resend.com/emails'

const GENERIC_REPORT_SUCCESS =
  'Thanks. Your report reached the CediWise team. We will reply by email if you left one.'

export type ReportEmailPayload = {
  reportId: string
  category: WebsiteReportData['category']
  name: string | null
  email: string
  page: string | null
  message: string
  createdAt: string
}

export type ReportEmailSender = (payload: ReportEmailPayload) => Promise<void>

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

/**
 * Local testing can point RESEND_EMAILS_URL at a loopback mail catcher. Any other
 * value is ignored, so the Resend key is never sent to an arbitrary host.
 */
export function resolveResendEmailsUrl(override: string | undefined): string {
  if (!override) return RESEND_EMAILS_URL
  try {
    const parsed = new URL(override)
    const loopback = parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost'
    if (parsed.protocol === 'http:' && loopback) return override
  } catch {
    // Fall through to the default below.
  }
  console.warn('[reports] ignoring RESEND_EMAILS_URL: only loopback test endpoints are allowed')
  return RESEND_EMAILS_URL
}

/** Sends one report to the CediWise inbox through Resend. Server-only. */
export async function sendReportEmail(payload: ReportEmailPayload) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Report email delivery is not configured.')

  const label = WEBSITE_REPORT_CATEGORY_LABELS[payload.category]
  const lines = [
    `Category: ${label}`,
    `Report ID: ${payload.reportId}`,
    `Received: ${payload.createdAt}`,
    `From: ${payload.name ? `${payload.name} <${payload.email}>` : payload.email}`,
    `Page or screen: ${payload.page ?? 'not given'}`,
    '',
    payload.message,
  ]

  const response = await fetch(resolveResendEmailsUrl(process.env.RESEND_EMAILS_URL), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(RESEND_TIMEOUT_MS),
    body: JSON.stringify({
      from: REPORT_FROM,
      to: [reportRecipientEmail()],
      reply_to: payload.email,
      subject: `[CediWise report] ${label}`,
      text: lines.join('\n'),
      html: `<!doctype html><html><body style="font-family:Arial,sans-serif;color:#111"><h2 style="margin:0 0 12px">CediWise report: ${escapeHtml(label)}</h2><table style="border-collapse:collapse;font-size:14px"><tr><td style="padding:2px 12px 2px 0;color:#555">Report ID</td><td>${escapeHtml(payload.reportId)}</td></tr><tr><td style="padding:2px 12px 2px 0;color:#555">Received</td><td>${escapeHtml(payload.createdAt)}</td></tr><tr><td style="padding:2px 12px 2px 0;color:#555">From</td><td>${escapeHtml(payload.name ? `${payload.name} <${payload.email}>` : payload.email)}</td></tr><tr><td style="padding:2px 12px 2px 0;color:#555">Page or screen</td><td>${escapeHtml(payload.page ?? 'not given')}</td></tr></table><p style="white-space:pre-wrap;margin-top:16px;padding:12px;border:1px solid #ddd;border-radius:8px">${escapeHtml(payload.message)}</p></body></html>`,
    }),
  })

  if (!response.ok) {
    throw new Error(`Report email delivery failed (${response.status}).`)
  }
}

type ReportDeps = {
  admin?: SupabaseClient
  sendEmail?: ReportEmailSender
  now?: () => Date
}

type ReportRow = { id: string; created_at: string }

const EMAIL_STATUS_WRITE_ATTEMPTS = 2

async function markEmailStatus(
  admin: SupabaseClient,
  reportId: string,
  status: 'sent' | 'failed',
  now: Date,
) {
  const iso = now.toISOString()
  let lastError: unknown = null
  for (let attempt = 1; attempt <= EMAIL_STATUS_WRITE_ATTEMPTS; attempt++) {
    const { error } = await admin
      .from('website_reports')
      .update({
        email_status: status,
        email_sent_at: status === 'sent' ? iso : null,
        updated_at: iso,
      })
      .eq('id', reportId)
    if (!error) return
    lastError = error
  }
  console.error('[reports] could not record email status', { reportId, status, error: lastError })
}

/** Throws ReportRateLimitError when the sender or the site has hit the window limit. */
async function assertWithinRateLimit(admin: SupabaseClient, email: string, now: Date) {
  const since = new Date(now.getTime() - REPORT_RATE_LIMIT.windowMs).toISOString()

  const sameEmail = await admin
    .from('website_reports')
    .select('id', { count: 'exact', head: true })
    .eq('reporter_email', email)
    .gte('created_at', since)
  if (sameEmail.error) throw sameEmail.error
  if ((sameEmail.count ?? 0) >= REPORT_RATE_LIMIT.perEmail) throw new ReportRateLimitError()

  const overall = await admin
    .from('website_reports')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', since)
  if (overall.error) throw overall.error
  if ((overall.count ?? 0) >= REPORT_RATE_LIMIT.overall) throw new ReportRateLimitError()
}

/**
 * Stores a website report, then emails it to the CediWise inbox.
 *
 * The report is saved first so it is never lost. If the email fails, the row is
 * marked `email_status = 'failed'` and still shows on the dashboard, and the
 * visitor still gets a success message.
 *
 * Known gap: the rate-limit check and the insert are not atomic, so a burst of
 * concurrent requests can overshoot the limit by a few reports.
 */
export async function submitWebsiteReport(
  input: WebsiteReportInput,
  deps: ReportDeps = {},
) {
  const data = websiteReportSchema.parse(input)

  // Honeypot filled: pretend success, store nothing, send nothing.
  if (data.do_not_fill && data.do_not_fill.trim()) {
    console.warn('[reports] honeypot filled; report dropped')
    return { success: true as const, reportId: null, message: GENERIC_REPORT_SUCCESS }
  }

  const admin = deps.admin ?? createAdminClient()
  const sendEmail = deps.sendEmail ?? sendReportEmail
  const now = deps.now ?? (() => new Date())
  const email = data.email.toLowerCase()

  await assertWithinRateLimit(admin, email, now())

  const { data: row, error } = await admin
    .from('website_reports')
    .insert({
      category: data.category,
      reporter_name: data.name,
      reporter_email: email,
      message: data.message,
      page: data.page,
      source: 'website_report_page',
    })
    .select('id,created_at')
    .single<ReportRow>()
  if (error) throw error

  try {
    await sendEmail({
      reportId: row.id,
      category: data.category,
      name: data.name,
      email,
      page: data.page,
      message: data.message,
      createdAt: row.created_at,
    })
    await markEmailStatus(admin, row.id, 'sent', now())
  } catch (sendError) {
    console.error('[reports] email delivery failed', { reportId: row.id, sendError })
    await markEmailStatus(admin, row.id, 'failed', now())
  }

  return { success: true as const, reportId: row.id, message: GENERIC_REPORT_SUCCESS }
}
