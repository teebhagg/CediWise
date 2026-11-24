/**
 * Routes that have a Markdown twin (`/about` → `/about.md`, `/` → `/index.md`).
 * Kept free of content imports so client bundles can read it for alternate links.
 * `markdown.test.ts` checks that this list matches the Markdown registry.
 */
export const MARKDOWN_TWIN_ROUTES: ReadonlyArray<string> = [
  '/',
  '/pricing',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/feedback',
  '/salary-calculator',
  '/try-salary-calculator',
  '/budgeting-tool',
  '/sme-ledger',
  '/financial-literacy',
  '/debt-dashboard',
  '/spending-insights',
]

/** `<link rel="alternate">` entries for a page's Markdown twin, or none. */
export function markdownAlternateLinks(
  route: string,
): Array<{ rel: 'alternate'; type: 'text/markdown'; href: string }> {
  if (!MARKDOWN_TWIN_ROUTES.includes(route)) return []
  const href = route === '/' ? '/index.md' : `${route}.md`
  return [{ rel: 'alternate', type: 'text/markdown', href }]
}
