import {
  getMarkdownPage,
  notAcceptableMarkdown,
  notFoundMarkdown,
} from './markdown'

const MARKDOWN_TYPE = 'text/markdown'
const HTML_TYPE = 'text/html'
const MARKDOWN_CONTENT_TYPE = 'text/markdown; charset=utf-8'

export type AgentDecision =
  | { kind: 'pass' }
  | { kind: 'markdown'; status: 200 | 404 | 406; body: string }

/**
 * Parses an Accept header into media type → quality value (RFC 9110 §12.4.2).
 * Duplicate media types keep the highest q-value. Invalid q-values count as 0.
 */
export function parseAcceptHeader(
  header: string | null | undefined,
): Map<string, number> {
  const weights = new Map<string, number>()
  if (!header) return weights

  for (const part of header.split(',')) {
    const [rawType, ...params] = part.split(';')
    const type = rawType?.trim().toLowerCase()
    if (!type) continue

    let quality = 1
    for (const param of params) {
      const [rawKey, rawValue] = param.split('=')
      if (rawKey?.trim().toLowerCase() !== 'q' || rawValue === undefined) {
        continue
      }
      const parsed = Number(rawValue.trim())
      quality = Number.isFinite(parsed) ? Math.min(Math.max(parsed, 0), 1) : 0
    }

    weights.set(type, Math.max(weights.get(type) ?? 0, quality))
  }

  return weights
}

/** Explicit weight for a type; HTML also inherits `*\/*` the way browsers send it. */
function weightFor(weights: Map<string, number>, type: string): number {
  const explicit = weights.get(type)
  if (explicit !== undefined) return explicit
  if (type === HTML_TYPE) return weights.get('*/*') ?? 0
  return 0
}

function normalizePathname(pathname: string): string {
  const withLeadingSlash = pathname.startsWith('/') ? pathname : `/${pathname}`
  return withLeadingSlash.length > 1
    ? withLeadingSlash.replace(/\/+$/, '') || '/'
    : withLeadingSlash
}

/**
 * Decides whether a request should get a Markdown response.
 *
 * Markdown is used only when the client prefers it over HTML. Browsers
 * (`text/html`, `*\/*`) and clients that never mention Markdown keep the
 * normal HTML rendering path.
 */
export function decideAgentResponse(input: {
  accept: string | null | undefined
  pathname: string
  isKnownRoute: (pathname: string) => boolean
}): AgentDecision {
  const weights = parseAcceptHeader(input.accept)
  const markdownWeight = weightFor(weights, MARKDOWN_TYPE)
  const htmlWeight = weightFor(weights, HTML_TYPE)

  if (markdownWeight <= 0 || markdownWeight <= htmlWeight) {
    return { kind: 'pass' }
  }

  const pathname = normalizePathname(input.pathname)

  if (!input.isKnownRoute(pathname)) {
    return { kind: 'markdown', status: 404, body: notFoundMarkdown() }
  }

  const page = getMarkdownPage(pathname)
  if (page !== undefined) {
    return { kind: 'markdown', status: 200, body: page }
  }

  // The client accepts no HTML, and this route has no Markdown version.
  // Without this branch the HTML renderer would answer with a 500 error.
  if (htmlWeight <= 0) {
    return { kind: 'markdown', status: 406, body: notAcceptableMarkdown() }
  }

  return { kind: 'pass' }
}

/** Builds the Response for a Markdown decision. */
export function buildMarkdownResponse(
  decision: Extract<AgentDecision, { kind: 'markdown' }>,
  method: string,
): Response {
  return new Response(method === 'HEAD' ? null : decision.body, {
    status: decision.status,
    headers: {
      'Content-Type': MARKDOWN_CONTENT_TYPE,
      Vary: 'Accept',
      'Cache-Control': 'public, max-age=0, must-revalidate',
    },
  })
}

/**
 * Adds `Vary: Accept` to an HTML response so caches store the HTML and the
 * Markdown variants separately. Redirects are returned untouched because the
 * router reads them as special objects.
 */
export function withVaryAccept(response: Response): Response {
  if (response.status >= 300 && response.status < 400) return response

  const existing = response.headers.get('Vary')
  if (
    existing &&
    existing.split(',').some((v) => v.trim().toLowerCase() === 'accept')
  ) {
    return response
  }

  const headers = new Headers(response.headers)
  headers.set('Vary', existing ? `${existing}, Accept` : 'Accept')
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  })
}
