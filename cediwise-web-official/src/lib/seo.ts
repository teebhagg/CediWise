/**
 * SEO base URL. Override via PUBLIC_SITE_URL env var at build time.
 * @example PUBLIC_SITE_URL=https://cediwise.app
 */
export const SITE_URL =
  (typeof process !== 'undefined' && process.env?.PUBLIC_SITE_URL) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.PUBLIC_SITE_URL) ||
  'https://cediwise.app'

export const OG_IMAGE = `${SITE_URL}/cediwise-smooth-light-logo.png`

export function absoluteUrl(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${clean}`
}

export function createPageHead(options: {
  path: string
  title: string
  description: string
}) {
  const { path, title, description } = options
  const url = absoluteUrl(path)
  return {
    meta: [
      { title: `${title} — CediWise` },
      { name: 'description', content: description },
      { property: 'og:url', content: url },
      { property: 'og:title', content: `${title} — CediWise` },
      { property: 'og:description', content: description },
      { property: 'og:image', content: OG_IMAGE },
      { name: 'twitter:title', content: `${title} — CediWise` },
      { name: 'twitter:description', content: description },
      { name: 'twitter:image', content: OG_IMAGE },
    ],
    links: [{ rel: 'canonical', href: url }],
  }
}
