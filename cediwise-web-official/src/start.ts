import { createMiddleware, createStart } from '@tanstack/react-start'

import {
  buildAgentResponse,
  decideAgentResponse,
  decidePathResponse,
  withDiscoveryLinks,
  withVaryAccept,
} from '@/lib/agent/negotiation'
import { isKnownRoute } from '@/lib/agent/routeMatch'

/**
 * Agent-facing responses for document requests.
 *
 * - URL-addressed agent documents: `/auth.md`, `.md` twins such as `/index.md`
 *   and `/pricing.md`, and the structured view at `/?mode=agent`.
 * - `Accept: text/markdown` (preferred over HTML): Markdown for pages with a
 *   Markdown version, Markdown 404s for unknown paths, and Markdown 406s for
 *   pages without one when HTML is not accepted.
 * - HTML document responses get `Vary: Accept`, and the homepage and pricing
 *   pages advertise their Markdown twins and the sitemap in Link headers.
 */
const agentNegotiation = createMiddleware({ type: 'request' }).server(
  async ({ request, next }) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return next()
    }

    const url = new URL(request.url)
    const pathDecision = decidePathResponse({
      pathname: url.pathname,
      search: url.search,
      isKnownRoute,
    })
    if (pathDecision.kind !== 'pass') {
      return buildAgentResponse(pathDecision, request.method)
    }

    const decision = decideAgentResponse({
      accept: request.headers.get('accept'),
      pathname: url.pathname,
      isKnownRoute,
    })
    if (decision.kind !== 'pass') {
      return buildAgentResponse(decision, request.method)
    }

    const result = await next()
    const response = withDiscoveryLinks(
      withVaryAccept(result.response),
      url.pathname,
    )
    return { ...result, response }
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [agentNegotiation],
}))
