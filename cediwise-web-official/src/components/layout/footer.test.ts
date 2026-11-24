import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import { Footer } from './Footer'
import type { ReactNode } from 'react'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) =>
    createElement('a', { href: to }, children),
}))

vi.mock('@/components/newsletter/NewsletterSignupForm', () => ({
  NewsletterSignupForm: () => createElement('form'),
}))

describe('Footer', () => {
  const html = renderToStaticMarkup(createElement(Footer))

  it('uses h2 for footer section titles so headings never skip a level', () => {
    expect(html).not.toMatch(/<h4[\s>]/)
    expect(html).toContain('>Product</h2>')
    expect(html).toContain('>Company</h2>')
    expect(html).toContain('>Newsletter</h2>')
  })
})
