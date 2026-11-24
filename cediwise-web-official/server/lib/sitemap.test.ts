import { describe, expect, it } from 'vitest'
import { SITEMAP_ENTRIES, buildSitemapXml } from './sitemap'

describe('sitemap', () => {
  const xml = buildSitemapXml('https://www.cediwise.app')

  it('gives every URL a W3C lastmod date', () => {
    const lastmods = [...xml.matchAll(/<lastmod>([^<]+)<\/lastmod>/g)].map(
      (m) => m[1],
    )
    expect(lastmods).toHaveLength(SITEMAP_ENTRIES.length)
    for (const date of lastmods) {
      expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })

  it('roots every URL at the given base and includes the pricing page', () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toContain('https://www.cediwise.app/')
    expect(locs).toContain('https://www.cediwise.app/pricing')
    for (const loc of locs) {
      expect((loc ?? '').startsWith('https://www.cediwise.app')).toBe(true)
    }
  })

  it('is a sitemaps.org urlset document', () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain(
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    )
  })
})
