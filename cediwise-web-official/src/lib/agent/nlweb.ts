import { searchSite } from './search'

/** NLWeb protocol version this endpoint implements (NLWEBSPEC v0.55). */
export const NLWEB_VERSION = '0.55'

const MAX_QUERY_LENGTH = 500

export interface AskResponse {
  status: number
  contentType: string
  body: string
}

const JSON_TYPE = 'application/json; charset=utf-8'
const SSE_TYPE = 'text/event-stream; charset=utf-8'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function failure(code: string, message: string, status = 200): AskResponse {
  return {
    status,
    contentType: JSON_TYPE,
    body: JSON.stringify({
      _meta: { response_type: 'failure', version: NLWEB_VERSION },
      error: { code, message },
    }),
  }
}

function sseFrame(event: string, data: unknown): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`
}

/**
 * Handles `POST /ask` (NLWeb). Answers with the public pages that match the
 * question. Streams start, result, and complete events when `prefer.streaming`
 * is true.
 */
export function handleAsk(input: unknown): AskResponse {
  if (!isObject(input)) {
    return failure(
      'INVALID_QUERY',
      'The request body must be a JSON object.',
      400,
    )
  }
  const query = input.query
  const text =
    isObject(query) && typeof query.text === 'string' ? query.text.trim() : ''
  if (text.length === 0 || text.length > MAX_QUERY_LENGTH) {
    return failure(
      'INVALID_QUERY',
      `query.text must be a non-empty string of at most ${MAX_QUERY_LENGTH} characters.`,
      400,
    )
  }

  const prefer = isObject(input.prefer) ? input.prefer : {}
  const format =
    typeof prefer.response_format === 'string'
      ? prefer.response_format
      : 'conversational_search'
  if (format !== 'conversational_search') {
    return failure(
      'UNSUPPORTED_FORMAT',
      `Response format "${format}" is not supported.`,
    )
  }
  const modes =
    typeof prefer.mode === 'string'
      ? prefer.mode
          .split(',')
          .map((m) => m.trim())
          .filter(Boolean)
      : ['list']
  if (modes.some((mode) => mode !== 'list')) {
    return failure('UNSUPPORTED_MODE', 'Only the "list" mode is supported.')
  }

  const hits = searchSite(text)
  const streaming = prefer.streaming === true
  const meta = { response_type: 'answer', version: NLWEB_VERSION }

  if (hits.length === 0) {
    if (!streaming)
      return failure(
        'NO_RESULTS',
        'No public CediWise page matches this question.',
      )
    return {
      status: 200,
      contentType: SSE_TYPE,
      body:
        sseFrame('start', {
          _meta: { ...meta, response_type: 'failure', streaming: true },
        }) +
        sseFrame('error', {
          _meta: { response_type: 'failure', version: NLWEB_VERSION },
          error: {
            code: 'NO_RESULTS',
            message: 'No public CediWise page matches this question.',
          },
        }) +
        sseFrame('complete', {
          _meta: { ...meta, response_type: 'failure', session_context: {} },
        }),
    }
  }

  const items = hits.map((hit) => ({
    '@type': 'WebPage',
    name: hit.title,
    url: hit.url,
    description: hit.description,
  }))

  if (!streaming) {
    return {
      status: 200,
      contentType: JSON_TYPE,
      body: JSON.stringify({ _meta: meta, results: items }),
    }
  }

  return {
    status: 200,
    contentType: SSE_TYPE,
    body:
      sseFrame('start', { _meta: { ...meta, streaming: true } }) +
      items.map((item, index) => sseFrame('result', { index, item })).join('') +
      sseFrame('complete', { _meta: { ...meta, session_context: {} } }),
  }
}
