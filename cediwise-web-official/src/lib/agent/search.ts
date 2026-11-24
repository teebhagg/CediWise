import { MARKDOWN_PAGE_ROUTES, getMarkdownPage } from './markdown'
import { SITE_URL } from '@/lib/seo'

export interface SiteDocument {
  route: string
  url: string
  title: string
  description: string
  body: string
}

const STOPWORDS = new Set([
  'the',
  'and',
  'for',
  'with',
  'what',
  'how',
  'is',
  'are',
  'a',
  'an',
  'of',
  'to',
  'in',
  'my',
  'your',
  'do',
  'does',
  'can',
  'i',
  'it',
  'me',
  'on',
  'at',
  'by',
  'from',
  'this',
  'that',
  'be',
  'or',
  'if',
  'about',
  'please',
  'tell',
  'show',
  'give',
])

function firstHeading(markdown: string): string {
  const line = markdown.split('\n').find((l) => l.startsWith('# '))
  return line ? line.slice(2).trim() : 'CediWise'
}

function firstParagraph(markdown: string): string {
  const lines = markdown.split('\n')
  const start = lines.findIndex((l) => l.startsWith('# '))
  const paragraph = lines
    .slice(start + 1)
    .map((l) => l.trim())
    .find(
      (l) =>
        l.length > 0 &&
        !l.startsWith('#') &&
        !l.startsWith('-') &&
        !l.startsWith('|'),
    )
  const text = paragraph ?? ''
  return text.length > 240 ? `${text.slice(0, 237)}...` : text
}

/** Every page that has a Markdown body, as a searchable document. */
export function siteDocuments(): Array<SiteDocument> {
  return MARKDOWN_PAGE_ROUTES.flatMap((route) => {
    const body = getMarkdownPage(route)
    if (body === undefined) return []
    return [
      {
        route,
        url: route === '/' ? SITE_URL : `${SITE_URL}${route}`,
        title: firstHeading(body),
        description: firstParagraph(body),
        body,
      },
    ]
  })
}

export function queryTerms(query: string): Array<string> {
  const tokens = query.toLowerCase().match(/[a-z0-9]+/g) ?? []
  return tokens.filter((token) => token.length > 1 && !STOPWORDS.has(token))
}

export interface SearchHit {
  title: string
  url: string
  description: string
  score: number
}

/** Keyword search over the public pages. Titles weigh most, then descriptions, then body text. */
export function searchSite(query: string, limit = 5): Array<SearchHit> {
  const terms = [...new Set(queryTerms(query))]
  if (terms.length === 0) return []

  return siteDocuments()
    .map((doc) => {
      const title = doc.title.toLowerCase()
      const description = doc.description.toLowerCase()
      const body = doc.body.toLowerCase()
      let score = 0
      for (const term of terms) {
        if (title.includes(term)) score += 3
        if (description.includes(term)) score += 2
        const occurrences = body.split(term).length - 1
        score += Math.min(occurrences, 3)
      }
      return {
        title: doc.title,
        url: doc.url,
        description: doc.description,
        score,
      }
    })
    .filter((hit) => hit.score > 0)
    .sort((a, b) => b.score - a.score || a.url.localeCompare(b.url))
    .slice(0, limit)
}
