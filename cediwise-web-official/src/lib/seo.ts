/**
 * SEO base URL. Override via PUBLIC_SITE_URL env var at build time.
 * @example PUBLIC_SITE_URL=https://cediwise.app
 */
export const SITE_URL =
  (typeof process !== 'undefined' && process.env?.PUBLIC_SITE_URL) ||
  (typeof import.meta !== 'undefined' &&
    (import.meta as any).env?.PUBLIC_SITE_URL) ||
  'https://cediwise.app'

export const OG_IMAGE = `${SITE_URL}/banner.webp`

export function absoluteUrl(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `${SITE_URL}${clean}`
}

export interface SchemaGenerator {
  generate: () => Record<string, any>
}

export const getAppSchema = (): SchemaGenerator => ({
  generate: () => ({
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'CediWise',
    operatingSystem: 'Android, iOS',
    applicationCategory: 'FinanceApplication',
    aggregateRating: {
      '@type': 'AggregateRating',
      ratingValue: '4.8',
      ratingCount: '120',
    },
    offers: {
      '@type': 'Offer',
      price: '0',
      priceCurrency: 'GHS',
    },
    downloadUrl: 'https://play.google.com/store/apps/details?id=com.cediwise.app',
    featureList: [
      'Ghana Salary Calculator (2026 PAYE/SSNIT)',
      'Budget Management',
      'SME Ledger',
      'Debt Tracking',
      'Financial Literacy',
    ],
  }),
})

export const getFAQSchema = (
  faqs: { question: string; answer: string }[],
): SchemaGenerator => ({
  generate: () => ({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((faq) => ({
      '@type': 'Question',
      name: faq.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: faq.answer,
      },
    })),
  }),
})

export function createPageHead(options: {
  path: string
  title: string
  description: string
  schemas?: SchemaGenerator[]
}) {
  const { path, title, description, schemas = [] } = options
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
    scripts: schemas.map((schema) => ({
      type: 'application/ld+json',
      children: JSON.stringify(schema.generate()),
    })),
  }
}
