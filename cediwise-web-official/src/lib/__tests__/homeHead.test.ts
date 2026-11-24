import { describe, expect, it, vi } from 'vitest'

import { Route } from '@/routes/index'
import { HOME_FAQ } from '@/components/landing/HomeFaq'

vi.mock('@tanstack/react-router', () => ({
  createFileRoute: () => (options: Record<string, unknown>) => ({ options }),
  Link: () => null,
  useRouter: () => ({ navigate: () => undefined }),
}))

type HeadOutput = {
  links: Array<{ rel?: string; href?: string; type?: string }>
  scripts: Array<{ type?: string; children?: string }>
}

const head = (
  Route as unknown as { options: { head: () => HeadOutput } }
).options.head()

describe('homepage head', () => {
  it('advertises the Markdown twin and the ARD manifest', () => {
    expect(head.links).toContainEqual({
      rel: 'alternate',
      type: 'text/markdown',
      href: '/index.md',
    })
    expect(head.links).toContainEqual({
      rel: 'ard',
      href: '/.well-known/ard.json',
    })
  })

  it('keeps one canonical link pointing at the homepage', () => {
    const canonicals = head.links.filter((link) => link.rel === 'canonical')
    expect(canonicals).toHaveLength(1)
    expect(canonicals[0]?.href).toBe('https://www.cediwise.app/')
  })

  it('includes FAQPage JSON-LD that matches the visible questions', () => {
    const faq = head.scripts
      .filter((script) => script.type === 'application/ld+json')
      .map(
        (script) =>
          JSON.parse(script.children ?? '{}') as Record<string, unknown>,
      )
      .find((schema) => schema['@type'] === 'FAQPage')
    expect(faq).toBeDefined()
    const entities = (faq?.mainEntity ?? []) as Array<{ name: string }>
    expect(entities.map((entity) => entity.name)).toEqual(
      HOME_FAQ.map((item) => item.question),
    )
  })
})
