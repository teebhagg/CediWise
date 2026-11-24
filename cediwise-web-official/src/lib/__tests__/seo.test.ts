import { describe, expect, it } from 'vitest'
import {
  CONTACT_EMAIL,
  SITE_URL,
  SOCIAL_PROFILE_URLS,
  getOrganizationSchema,
} from '@/lib/seo'

describe('SITE_URL', () => {
  it('defaults to the www host that serves pages directly', () => {
    if (!process.env.PUBLIC_SITE_URL) {
      expect(SITE_URL).toBe('https://www.cediwise.app')
    }
    expect(SITE_URL).toMatch(/^https:\/\//)
  })
})

describe('getOrganizationSchema', () => {
  const schema = getOrganizationSchema() as Record<string, any>

  it('is a schema.org Organization for CediWise', () => {
    expect(schema['@context']).toBe('https://schema.org')
    expect(schema['@type']).toBe('Organization')
    expect(schema.name).toBe('CediWise')
    expect(schema.url).toBe(SITE_URL)
  })

  it('includes contactPoint with an email and contactType', () => {
    expect(schema.contactPoint).toMatchObject({
      '@type': 'ContactPoint',
      contactType: 'customer support',
      email: CONTACT_EMAIL,
    })
  })

  it('includes an address as a PostalAddress with a country', () => {
    expect(schema.address).toEqual({
      '@type': 'PostalAddress',
      addressCountry: 'GH',
    })
  })

  it('includes an absolute logo URL and the official social profiles in sameAs', () => {
    expect(schema.logo).toEqual({
      '@type': 'ImageObject',
      url: `${SITE_URL}/cediwise-smooth-light-logo.png`,
    })
    expect(schema.sameAs).toEqual([...SOCIAL_PROFILE_URLS])
    for (const url of schema.sameAs) {
      expect(url).toMatch(/^https:\/\//)
    }
  })

  it('serializes to valid JSON-LD', () => {
    expect(JSON.parse(JSON.stringify(schema))).toEqual(schema)
  })
})
