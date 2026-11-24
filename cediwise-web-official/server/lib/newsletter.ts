import { createHmac, timingSafeEqual } from 'node:crypto'
import { z } from 'zod'
import { createAdminClient } from './supabase/admin'
import type { SupabaseClient } from '@supabase/supabase-js'

export const newsletterSubscriptionSchema = z.object({
  email: z.string().trim().email('Enter a valid email address.').max(255),
  source: z.enum(['footer']),
})

export type NewsletterSource = z.infer<typeof newsletterSubscriptionSchema>['source']

type Subscriber = {
  id: string
  email: string
  status: 'active' | 'unsubscribed'
  consented_at: string
  welcome_sent_at: string | null
}

const GENERIC_SUCCESS =
  'You are on the list. Check your inbox for a welcome from CediWise.'

function getUnsubscribeSecret() {
  const secret = process.env.NEWSLETTER_UNSUBSCRIBE_SECRET
  if (!secret || secret.length < 32) {
    throw new Error('Newsletter unsubscribe signing is not configured.')
  }
  return secret
}

function getSiteUrl() {
  return (process.env.PUBLIC_SITE_URL || 'https://cediwise.app').replace(/\/$/, '')
}

function signatureFor(subscriberId: string) {
  return createHmac('sha256', getUnsubscribeSecret())
    .update(`newsletter-unsubscribe:${subscriberId}`, 'utf8')
    .digest('base64url')
}

function secureEqual(a: string, b: string) {
  const first = Buffer.from(a)
  const second = Buffer.from(b)
  return first.length === second.length && timingSafeEqual(first, second)
}

export function createUnsubscribeToken(subscriberId: string) {
  return `${subscriberId}.${signatureFor(subscriberId)}`
}

export function verifyUnsubscribeToken(token: string) {
  const [subscriberId, signature, ...rest] = token.split('.')
  if (!subscriberId || !signature || rest.length > 0) return null
  return secureEqual(signature, signatureFor(subscriberId)) ? subscriberId : null
}

export function getUnsubscribeUrl(subscriberId: string) {
  return `${getSiteUrl()}/api/newsletter/unsubscribe?token=${encodeURIComponent(createUnsubscribeToken(subscriberId))}`
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

async function sendWelcomeEmail(subscriber: Pick<Subscriber, 'id' | 'email'>) {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) throw new Error('Newsletter delivery is not configured.')

  const unsubscribeUrl = getUnsubscribeUrl(subscriber.id)
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'CediWise <hello@cediwise.app>',
      to: [subscriber.email],
      reply_to: 'joshua.ansah@cediwise.app',
      subject: 'Welcome to the CediWise Money Brief',
      html: `<!doctype html><html><body style="margin:0;background:#0A0A0A;color:#e4e4e7;font-family:Arial,sans-serif"><main style="max-width:620px;margin:32px auto;padding:32px;border:1px solid #27272a;border-radius:20px;background:#111"><p style="color:#34d399;font-weight:700">CEDIWISE MONEY BRIEF</p><h1 style="color:#fff">Practical money guidance for Ghana.</h1><p>Welcome. Every week, we share clear PAYE, budgeting, debt, and small-business money guidance — with occasional news from CediWise.</p><p>No spam. Leave whenever you want.</p><p><a href="${escapeHtml(unsubscribeUrl)}" style="color:#34d399">Unsubscribe</a></p></main></body></html>`,
      text: `Welcome to the CediWise Money Brief. Every week, we share practical Ghana PAYE, budgeting, debt, and small-business money guidance. No spam. Unsubscribe: ${unsubscribeUrl}`,
    }),
  })

  if (!response.ok) {
    throw new Error(`Newsletter delivery failed (${response.status}).`)
  }
}

export async function subscribeToNewsletter(
  input: z.infer<typeof newsletterSubscriptionSchema>,
  admin: SupabaseClient = createAdminClient(),
) {
  const { email, source } = newsletterSubscriptionSchema.parse(input)
  const normalizedEmail = email.toLowerCase()
  const { data: existing, error: existingError } = await admin
    .from('newsletter_subscribers')
    .select('id,email,status,consented_at,welcome_sent_at')
    .eq('email', normalizedEmail)
    .maybeSingle<Subscriber>()
  if (existingError) throw existingError

  let shouldSendWelcome = false
  let subscriber = existing
  if (!existing) {
    const { data, error } = await admin
      .from('newsletter_subscribers')
      .insert({ email: normalizedEmail, subscription_source: source })
      .select('id,email,status,consented_at,welcome_sent_at')
      .single<Subscriber>()
    if (error) {
      // A concurrent subscription may have won the unique-email race.
      if (error.code !== '23505') throw error
      const { data: raced, error: racedError } = await admin
        .from('newsletter_subscribers')
        .select('id,email,status,consented_at,welcome_sent_at')
        .eq('email', normalizedEmail)
        .single<Subscriber>()
      if (racedError) throw racedError
      subscriber = raced
    } else {
      subscriber = data
      shouldSendWelcome = true
    }
  } else if (existing.status === 'unsubscribed') {
    const { data, error } = await admin
      .from('newsletter_subscribers')
      .update({
        status: 'active',
        subscription_source: source,
        consented_at: new Date().toISOString(),
        unsubscribed_at: null,
        resubscribed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
      .select('id,email,status,consented_at,welcome_sent_at')
      .single<Subscriber>()
    if (error) throw error
    subscriber = data
    shouldSendWelcome = true
  } else if (existing && !existing.welcome_sent_at) {
    shouldSendWelcome = true
  }

  if (shouldSendWelcome && subscriber) {
    await sendWelcomeEmail(subscriber)
    const { error } = await admin
      .from('newsletter_subscribers')
      .update({ welcome_sent_at: new Date().toISOString(), updated_at: new Date().toISOString() })
      .eq('id', subscriber.id)
    if (error) throw error
  }

  return { success: true as const, message: GENERIC_SUCCESS }
}

export async function unsubscribeFromNewsletter(token: string, admin: SupabaseClient = createAdminClient()) {
  const subscriberId = verifyUnsubscribeToken(token)
  if (!subscriberId) return { success: false as const, reason: 'invalid_token' as const }

  const { error } = await admin
    .from('newsletter_subscribers')
    .update({ status: 'unsubscribed', unsubscribed_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', subscriberId)
  if (error) throw error
  return { success: true as const }
}
