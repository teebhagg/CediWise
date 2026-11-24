import { SITE_URL } from '@/lib/seo'

/**
 * RFC 9727 API catalog (linkset). Items point to the NLWeb `/ask` API, the
 * MCP server, and the A2A agent. Each `service-desc` is a machine-readable
 * description of the item.
 */
export function apiCatalogLinkset(): Record<string, unknown> {
  return {
    linkset: [
      {
        anchor: `${SITE_URL}/ask`,
        'service-desc': [
          {
            href: `${SITE_URL}/openapi.json`,
            type: 'application/vnd.oai.openapi+json',
          },
        ],
        'service-doc': [{ href: `${SITE_URL}/llms.txt`, type: 'text/plain' }],
      },
      {
        anchor: `${SITE_URL}/mcp`,
        'service-desc': [
          { href: `${SITE_URL}/mcp/server-card`, type: 'application/json' },
        ],
        'service-doc': [{ href: `${SITE_URL}/llms.txt`, type: 'text/plain' }],
      },
      {
        anchor: `${SITE_URL}/a2a`,
        'service-desc': [
          {
            href: `${SITE_URL}/.well-known/agent-card.json`,
            type: 'application/json',
          },
        ],
      },
    ],
  }
}

export const API_CATALOG_CONTENT_TYPE =
  'application/linkset+json;profile="https://www.rfc-editor.org/info/rfc9727"'

/** Link header for HEAD requests to `/.well-known/api-catalog` (RFC 9727 §2). */
export function apiCatalogLinkHeader(): string {
  return [
    `<${SITE_URL}/.well-known/api-catalog>; rel="api-catalog"; type="application/linkset+json"`,
    `<${SITE_URL}/openapi.json>; rel="service-desc"; type="application/vnd.oai.openapi+json"`,
  ].join(', ')
}
