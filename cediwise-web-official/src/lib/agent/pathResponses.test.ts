import { describe, expect, it } from 'vitest'
import {
  buildAgentResponse,
  decidePathResponse,
  withDiscoveryLinks,
} from './negotiation'
import { markdownTwinRoute } from './markdown'

const KNOWN = (pathname: string) =>
  ['/', '/about', '/pricing', '/changelog', '/salary-calculator/5000'].includes(pathname)

describe('markdownTwinRoute', () => {
  it('maps .md twins to their HTML routes', () => {
    expect(markdownTwinRoute('/index.md')).toBe('/')
    expect(markdownTwinRoute('/pricing.md')).toBe('/pricing')
    expect(markdownTwinRoute('/about')).toBeUndefined()
  })
})

describe('decidePathResponse', () => {
  it('serves /index.md and /pricing.md as Markdown', () => {
    const home = decidePathResponse({
      pathname: '/index.md',
      search: '',
      isKnownRoute: KNOWN,
    })
    expect(home).toMatchObject({ kind: 'markdown', status: 200 })
    const pricing = decidePathResponse({
      pathname: '/pricing.md',
      search: '',
      isKnownRoute: KNOWN,
    })
    expect(pricing).toMatchObject({ kind: 'markdown', status: 200 })
    if (pricing.kind === 'markdown') expect(pricing.body).toContain('GH¢ 39')
  })

  it('returns a Markdown 404 for a .md twin of an unknown path', () => {
    const decision = decidePathResponse({
      pathname: '/nope.md',
      search: '',
      isKnownRoute: KNOWN,
    })
    expect(decision).toMatchObject({ kind: 'markdown', status: 404 })
  })

  it('returns a Markdown 404 that links to the HTML page when no twin exists', () => {
    const decision = decidePathResponse({
      pathname: '/changelog.md',
      search: '',
      isKnownRoute: KNOWN,
    })
    expect(decision.kind).toBe('markdown')
    if (decision.kind !== 'markdown') return
    expect(decision.status).toBe(404)
    expect(decision.body).toContain('https://www.cediwise.app/changelog')
  })

  it('serves the agent access guide at /auth.md', () => {
    const decision = decidePathResponse({
      pathname: '/auth.md',
      search: '',
      isKnownRoute: KNOWN,
    })
    expect(decision.kind).toBe('markdown')
    if (decision.kind !== 'markdown') return
    expect(decision.body).toMatch(/^# Agent access to CediWise/)
    expect(decision.body).toContain('does not issue credentials to agents')
  })

  it('returns a JSON agent view for /?mode=agent only', () => {
    const view = decidePathResponse({
      pathname: '/',
      search: '?mode=agent',
      isKnownRoute: KNOWN,
    })
    expect(view.kind).toBe('json')
    if (view.kind !== 'json') return
    const parsed = JSON.parse(view.body)
    expect(parsed.api).toBeNull()
    expect(parsed.authentication.agent_credentials).toBe('none')
    expect(parsed.capabilities.length).toBeGreaterThan(0)

    expect(
      decidePathResponse({
        pathname: '/',
        search: '?mode=other',
        isKnownRoute: KNOWN,
      }),
    ).toEqual({ kind: 'pass' })
    expect(
      decidePathResponse({
        pathname: '/about',
        search: '?mode=agent',
        isKnownRoute: KNOWN,
      }),
    ).toEqual({ kind: 'pass' })
  })

  it('passes ordinary HTML requests through', () => {
    expect(
      decidePathResponse({
        pathname: '/about',
        search: '',
        isKnownRoute: KNOWN,
      }),
    ).toEqual({ kind: 'pass' })
  })
})

describe('buildAgentResponse', () => {
  it('returns JSON with an application/json content type', async () => {
    const decision = decidePathResponse({
      pathname: '/',
      search: '?mode=agent',
      isKnownRoute: KNOWN,
    })
    if (decision.kind !== 'json') throw new Error('expected json')
    const response = buildAgentResponse(decision, 'GET')
    expect(response.status).toBe(200)
    expect(response.headers.get('content-type')).toBe(
      'application/json; charset=utf-8',
    )
    expect(JSON.parse(await response.text()).url).toBe(
      'https://www.cediwise.app',
    )
  })
})

describe('withDiscoveryLinks', () => {
  it('advertises the Markdown twin, sitemap, and ARD manifest on the homepage', () => {
    const response = withDiscoveryLinks(
      new Response('<html></html>', { status: 200 }),
      '/',
    )
    const link = response.headers.get('Link') ?? ''
    expect(link).toContain('</index.md>; rel="alternate"; type="text/markdown"')
    expect(link).toContain('</sitemap.xml>; rel="sitemap"')
    expect(link).toContain('</.well-known/ard.json>; rel="ard"')
  })

  it('advertises the pricing Markdown twin on the pricing page', () => {
    const response = withDiscoveryLinks(
      new Response('<html></html>', { status: 200 }),
      '/pricing',
    )
    expect(response.headers.get('Link')).toContain(
      '</pricing.md>; rel="alternate"',
    )
  })

  it('leaves other pages and redirects untouched', () => {
    const about = new Response('ok', { status: 200 })
    expect(withDiscoveryLinks(about, '/about')).toBe(about)
    const redirect = new Response(null, {
      status: 307,
      headers: { Location: '/' },
    })
    expect(withDiscoveryLinks(redirect, '/')).toBe(redirect)
  })
})
