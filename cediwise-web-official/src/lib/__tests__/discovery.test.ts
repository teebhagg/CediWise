import { describe, expect, it } from 'vitest'
import {
  API_CATALOG_CONTENT_TYPE,
  apiCatalogLinkHeader,
  apiCatalogLinkset,
} from '@/lib/agent/discovery'

describe('API catalog (RFC 9727)', () => {
  const linkset = (
    apiCatalogLinkset() as { linkset: Array<Record<string, any>> }
  ).linkset

  it('lists the ask, MCP, and A2A items with a service description each', () => {
    expect(linkset.map((item) => item.anchor)).toEqual([
      'https://www.cediwise.app/ask',
      'https://www.cediwise.app/mcp',
      'https://www.cediwise.app/a2a',
    ])
    for (const item of linkset) {
      expect(item['service-desc'].length).toBeGreaterThan(0)
    }
  })

  it('uses the linkset media type with the RFC 9727 profile', () => {
    expect(API_CATALOG_CONTENT_TYPE).toBe(
      'application/linkset+json;profile="https://www.rfc-editor.org/info/rfc9727"',
    )
  })

  it('carries the catalog relations in the HEAD Link header', () => {
    expect(apiCatalogLinkHeader()).toContain('rel="api-catalog"')
    expect(apiCatalogLinkHeader()).toContain('rel="service-desc"')
  })
})
