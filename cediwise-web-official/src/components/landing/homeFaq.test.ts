import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { HOME_FAQ, HomeFaq } from './HomeFaq'
import type { ReactNode } from 'react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) =>
    createElement('a', { href: to }, children),
}))

function headingLevels(html: string): Array<number> {
  return [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) => Number(m[1]))
}

describe('HomeFaq', () => {
  const html = renderToStaticMarkup(createElement(HomeFaq))

  it('renders a visible question list in raw HTML', () => {
    expect(html).toContain('Common questions')
    for (const item of HOME_FAQ) {
      expect(html).toContain(item.question)
      expect(html).toContain(item.answer.slice(0, 40))
    }
  })

  it('has enough text to count as meaningful content without JavaScript', () => {
    const text = html
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
    expect(text.length).toBeGreaterThan(1800)
  })

  it('uses sequential heading levels under the section heading', () => {
    expect(headingLevels(html)).toEqual([2, ...HOME_FAQ.map(() => 3)])
  })

  it('links to the pricing and calculator pages', () => {
    expect(html).toContain('href="/pricing"')
    expect(html).toContain('href="/salary-calculator"')
  })
})
