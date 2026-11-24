import { beforeEach, describe, expect, it } from 'vitest'
import {
  createUnsubscribeToken,
  newsletterSubscriptionSchema,
  verifyUnsubscribeToken,
} from './newsletter'

describe('newsletter helpers', () => {
  beforeEach(() => {
    process.env.NEWSLETTER_UNSUBSCRIBE_SECRET = 'newsletter-test-secret-that-is-at-least-32-bytes'
  })

  it('accepts a valid public subscription request and preserves its source', () => {
    expect(newsletterSubscriptionSchema.parse({
      email: ' Reader@Example.com ',
      source: 'footer',
    })).toEqual({ email: 'Reader@Example.com', source: 'footer' })
  })

  it('rejects invalid email addresses and unknown sources', () => {
    expect(() => newsletterSubscriptionSchema.parse({ email: 'not-an-email', source: 'footer' })).toThrow()
    expect(() => newsletterSubscriptionSchema.parse({ email: 'reader@example.com', source: 'other' })).toThrow()
  })

  it('verifies a signed unsubscribe token', () => {
    const id = '6ddda72b-5faa-4887-b419-9b0b3a7b47f2'
    expect(verifyUnsubscribeToken(createUnsubscribeToken(id))).toBe(id)
  })

  it('rejects a tampered unsubscribe token', () => {
    const token = createUnsubscribeToken('6ddda72b-5faa-4887-b419-9b0b3a7b47f2')
    expect(verifyUnsubscribeToken(`${token}tampered`)).toBeNull()
  })
})
