import { describe, expect, it } from 'vitest'
import {
  buildMarkdownResponse,
  decideAgentResponse,
  parseAcceptHeader,
  withVaryAccept,
} from './negotiation'

const BROWSER_ACCEPT =
  'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8'

const knownOnly = (known: Array<string>) => (pathname: string) =>
  known.includes(pathname)

const KNOWN = knownOnly(['/', '/about', '/pricing'])

describe('parseAcceptHeader', () => {
  it('reads media types and q-values', () => {
    const weights = parseAcceptHeader('text/markdown, text/html;q=0.9')
    expect(weights.get('text/markdown')).toBe(1)
    expect(weights.get('text/html')).toBe(0.9)
  })

  it('treats missing or invalid q-values safely', () => {
    expect(parseAcceptHeader(null).size).toBe(0)
    expect(parseAcceptHeader('text/markdown;q=abc').get('text/markdown')).toBe(
      0,
    )
    expect(parseAcceptHeader('text/markdown;q=2').get('text/markdown')).toBe(1)
  })

  it('keeps the highest weight when a media type repeats', () => {
    const weights = parseAcceptHeader(
      'text/markdown;q=0.2, text/markdown;q=0.7',
    )
    expect(weights.get('text/markdown')).toBe(0.7)
  })
})

describe('decideAgentResponse', () => {
  it('keeps HTML for browsers', () => {
    expect(
      decideAgentResponse({
        accept: BROWSER_ACCEPT,
        pathname: '/',
        isKnownRoute: KNOWN,
      }),
    ).toEqual({ kind: 'pass' })
  })

  it('keeps HTML when no Accept header is sent', () => {
    expect(
      decideAgentResponse({ accept: null, pathname: '/', isKnownRoute: KNOWN }),
    ).toEqual({ kind: 'pass' })
  })

  it('keeps HTML when Markdown is not preferred', () => {
    expect(
      decideAgentResponse({
        accept: 'text/html;q=0.5, text/markdown;q=0.5',
        pathname: '/',
        isKnownRoute: KNOWN,
      }),
    ).toEqual({ kind: 'pass' })
    expect(
      decideAgentResponse({
        accept: 'text/markdown;q=0, */*',
        pathname: '/',
        isKnownRoute: KNOWN,
      }).kind,
    ).toBe('pass')
  })

  it('serves a non-empty Markdown homepage for Accept: text/markdown', () => {
    const decision = decideAgentResponse({
      accept: 'text/markdown',
      pathname: '/',
      isKnownRoute: KNOWN,
    })
    expect(decision.kind).toBe('markdown')
    if (decision.kind !== 'markdown') return
    expect(decision.status).toBe(200)
    expect(decision.body).toMatch(/^# CediWise/)
    expect(decision.body.length).toBeGreaterThan(500)
    expect(decision.body).toContain('/llms.txt')
  })

  it('serves a Markdown 404 with a link for unknown paths', () => {
    const decision = decideAgentResponse({
      accept: 'text/markdown',
      pathname: '/__ora-404-probe-27v5y5ix',
      isKnownRoute: KNOWN,
    })
    expect(decision.kind).toBe('markdown')
    if (decision.kind !== 'markdown') return
    expect(decision.status).toBe(404)
    expect(decision.body.length).toBeGreaterThanOrEqual(20)
    expect(decision.body).toContain('does not exist')
    expect(decision.body).toMatch(
      /https?:\/\/[^)\s]+\/(llms\.txt|sitemap\.xml)/,
    )
  })

  it('serves HTML to Markdown-preferring agents on pages without Markdown', () => {
    expect(
      decideAgentResponse({
        accept: 'text/markdown, text/html;q=0.9',
        pathname: '/about',
        isKnownRoute: KNOWN,
      }),
    ).toEqual({ kind: 'pass' })
  })

  it('returns 406 Markdown when HTML is not accepted and the page has no Markdown', () => {
    const decision = decideAgentResponse({
      accept: 'text/markdown',
      pathname: '/about',
      isKnownRoute: KNOWN,
    })
    expect(decision.kind).toBe('markdown')
    if (decision.kind !== 'markdown') return
    expect(decision.status).toBe(406)
    expect(decision.body).toContain('only available as HTML')
  })

  it('normalizes trailing slashes before looking up Markdown pages', () => {
    const decision = decideAgentResponse({
      accept: 'text/markdown',
      pathname: '/',
      isKnownRoute: KNOWN,
    })
    expect(decision.kind === 'markdown' && decision.status).toBe(200)
  })
})

describe('buildMarkdownResponse', () => {
  it('sets Markdown content type, Vary, and the decided status', async () => {
    const decision = decideAgentResponse({
      accept: 'text/markdown',
      pathname: '/missing',
      isKnownRoute: KNOWN,
    })
    if (decision.kind !== 'markdown') throw new Error('expected markdown')
    const response = buildMarkdownResponse(decision, 'GET')
    expect(response.status).toBe(404)
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    )
    expect(response.headers.get('vary')).toBe('Accept')
    expect(await response.text()).toContain('404 Not Found')
  })

  it('omits the body for HEAD requests but keeps headers', async () => {
    const decision = decideAgentResponse({
      accept: 'text/markdown',
      pathname: '/',
      isKnownRoute: KNOWN,
    })
    if (decision.kind !== 'markdown') throw new Error('expected markdown')
    const response = buildMarkdownResponse(decision, 'HEAD')
    expect(response.headers.get('content-type')).toBe(
      'text/markdown; charset=utf-8',
    )
    expect(await response.text()).toBe('')
  })
})

describe('withVaryAccept', () => {
  it('adds Vary: Accept to HTML responses and keeps their body and status', async () => {
    const original = new Response('<html></html>', {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' },
    })
    const response = withVaryAccept(original)
    expect(response.status).toBe(200)
    expect(response.headers.get('vary')).toBe('Accept')
    expect(response.headers.get('content-type')).toBe(
      'text/html; charset=utf-8',
    )
    expect(await response.text()).toBe('<html></html>')
  })

  it('appends to an existing Vary header without duplicating Accept', () => {
    const base = new Response('ok', { headers: { Vary: 'Accept-Encoding' } })
    expect(withVaryAccept(base).headers.get('vary')).toBe(
      'Accept-Encoding, Accept',
    )

    const already = new Response('ok', { headers: { Vary: 'accept, Cookie' } })
    expect(withVaryAccept(already).headers.get('vary')).toBe('accept, Cookie')
  })

  it('leaves redirects untouched', () => {
    const redirect = new Response(null, {
      status: 307,
      headers: { Location: '/x' },
    })
    expect(withVaryAccept(redirect)).toBe(redirect)
  })
})
