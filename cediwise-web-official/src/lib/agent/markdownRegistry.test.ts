import { describe, expect, it } from 'vitest'
import { MARKDOWN_PAGE_ROUTES, getMarkdownPage } from './markdown'
import { MARKDOWN_TWIN_ROUTES, markdownAlternateLinks } from './twins'

describe('Markdown twin registry', () => {
  it('has a Markdown body for exactly the routes that advertise a twin', () => {
    expect([...MARKDOWN_PAGE_ROUTES].sort()).toEqual(
      [...MARKDOWN_TWIN_ROUTES].sort(),
    )
  })

  it.each(MARKDOWN_PAGE_ROUTES.map((route) => [route] as const))(
    '%s serves a non-empty Markdown body that starts with a top-level heading',
    (route) => {
      const body = getMarkdownPage(route)
      expect(body).toBeDefined()
      expect(body?.trimStart().startsWith('# ')).toBe(true)
      expect((body ?? '').length).toBeGreaterThan(200)
    },
  )

  it('advertises the twin as an alternate link only for routes that have one', () => {
    expect(markdownAlternateLinks('/')).toEqual([
      { rel: 'alternate', type: 'text/markdown', href: '/index.md' },
    ])
    expect(markdownAlternateLinks('/about')).toEqual([
      { rel: 'alternate', type: 'text/markdown', href: '/about.md' },
    ])
    expect(markdownAlternateLinks('/changelog')).toEqual([])
  })
})
