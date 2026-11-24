import { createMiddleware, createStart } from '@tanstack/react-start'

import {
  buildMarkdownResponse,
  decideAgentResponse,
  withVaryAccept,
} from '@/lib/agent/negotiation'
import { isKnownRoute } from '@/lib/agent/routeMatch'

/**
 * Agent-facing content negotiation for document requests.
 *
 * - `Accept: text/markdown` (preferred over HTML) gets Markdown for the
 *   homepage, Markdown 404s for unknown paths, and Markdown 406s for pages
 *   with no Markdown version when HTML is not accepted.
 * - Every other document response gets `Vary: Accept`, so caches keep the
 *   HTML and Markdown variants apart.
 */
const agentNegotiation = createMiddleware({ type: 'request' }).server(
  async ({ request, next }) => {
    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return next()
    }

    const pathname = new URL(request.url).pathname
    const decision = decideAgentResponse({
      accept: request.headers.get('accept'),
      pathname,
      isKnownRoute,
    })

    if (decision.kind === 'markdown') {
      return buildMarkdownResponse(decision, request.method)
    }

    const result = await next()
    return { ...result, response: withVaryAccept(result.response) }
  },
)

export const startInstance = createStart(() => ({
  requestMiddleware: [agentNegotiation],
}))
