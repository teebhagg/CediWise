import { describe, expect, it } from 'vitest'
import { queryTerms, searchSite, siteDocuments } from './search'

describe('site search', () => {
  it('indexes every page that has a Markdown body', () => {
    const docs = siteDocuments()
    expect(docs.length).toBeGreaterThanOrEqual(14)
    for (const doc of docs) {
      expect(doc.url.startsWith('https://www.cediwise.app')).toBe(true)
      expect(doc.title.length).toBeGreaterThan(0)
    }
  })

  it('finds the calculator pages for PAYE and SSNIT questions', () => {
    const hits = searchSite('What is PAYE and SSNIT on my salary?')
    expect(
      hits
        .slice(0, 3)
        .map((hit) => hit.url)
        .join(' '),
    ).toContain('salary-calculator')
  })

  it('finds the SME ledger for VAT questions', () => {
    const top = searchSite('VAT for a small business')
      .slice(0, 3)
      .map((hit) => hit.url)
    expect(top.join(' ')).toContain('sme-ledger')
  })

  it('returns nothing for stop words only or unrelated text', () => {
    expect(searchSite('the and of')).toEqual([])
    expect(searchSite('zzqxwv')).toEqual([])
  })

  it('drops stop words and short tokens from queries', () => {
    expect(queryTerms('What is the PAYE on a GHS 5,000 salary?')).toEqual(
      expect.arrayContaining(['paye', 'ghs', '000', 'salary']),
    )
    expect(queryTerms('What is the')).toEqual([])
  })

  it('honors the result limit', () => {
    expect(searchSite('budget', 2).length).toBeLessThanOrEqual(2)
  })
})
