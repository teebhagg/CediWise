import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'
import type { ReactNode } from 'react'

import { Route } from '@/routes/pricing'

vi.mock('@tanstack/react-router', () => ({
  Link: ({ to, children }: { to: string; children: ReactNode }) =>
    createElement('a', { href: to }, children),
  createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
  useRouter: () => ({ navigate: () => undefined }),
}))

vi.mock('@/components/newsletter/NewsletterSignupForm', () => ({
  NewsletterSignupForm: () => createElement('form'),
}))

describe('/pricing heading structure', () => {
  const PricingPage = (
    Route as unknown as { options: { component: () => ReactNode } }
  ).options.component
  const html = renderToStaticMarkup(
    createElement(PricingPage as () => ReactNode),
  )

  it('renders one h1 and plan names as h2 so levels never skip', () => {
    const levels = [...html.matchAll(/<h([1-6])[\s>]/g)].map((m) =>
      Number(m[1]),
    )
    expect(levels.filter((level) => level === 1)).toHaveLength(1)
    expect(levels.some((level) => level === 3)).toBe(false)
    expect(levels).toContain(2)
    for (let i = 1; i < levels.length; i += 1) {
      const previous = levels[i - 1] ?? 0
      expect((levels[i] ?? 0) - previous).toBeLessThanOrEqual(1)
    }
  })
})
