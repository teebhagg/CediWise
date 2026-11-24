import { SITE_URL } from '@/lib/seo'
import { siteDocuments } from './search'

/**
 * Schema feed (JSON Lines): one schema.org WebPage per public page with a
 * Markdown body. Served at `/feeds/pages.jsonl` and listed in `schemamap.xml`.
 */
export function schemaFeedJsonl(): string {
  return siteDocuments()
    .map((doc) =>
      JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebPage',
        name: doc.title,
        url: doc.url,
        description: doc.description,
      }),
    )
    .join('\n')
    .concat('\n')
}

export const SCHEMA_FEED_URL = `${SITE_URL}/feeds/pages.jsonl`
