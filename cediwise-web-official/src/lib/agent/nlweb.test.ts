import { describe, expect, it } from 'vitest'
import { NLWEB_VERSION, handleAsk } from './nlweb'

const parse = (body: string) => JSON.parse(body) as Record<string, any>

describe('handleAsk (NLWeb /ask)', () => {
  it('answers with matching pages and the NLWeb version', () => {
    const reply = handleAsk({ query: { text: 'PAYE and SSNIT on a salary' } })
    expect(reply.status).toBe(200)
    expect(reply.contentType).toBe('application/json; charset=utf-8')
    const body = parse(reply.body)
    expect(body._meta).toEqual({
      response_type: 'answer',
      version: NLWEB_VERSION,
    })
    expect(body.results.length).toBeGreaterThan(0)
    expect(body.results[0]).toMatchObject({ '@type': 'WebPage' })
    expect(body.results[0].url).toMatch(/^https:\/\/www\.cediwise\.app/)
  })

  it('rejects a body that is not an object or has no query text', () => {
    for (const input of [
      null,
      'text',
      [],
      {},
      { query: {} },
      { query: { text: '   ' } },
      { query: { text: 'x'.repeat(501) } },
    ]) {
      const reply = handleAsk(input)
      expect(reply.status).toBe(400)
      expect(parse(reply.body).error.code).toBe('INVALID_QUERY')
    }
  })

  it('reports unsupported formats and modes as failures', () => {
    const format = handleAsk({
      query: { text: 'salary' },
      prefer: { response_format: 'chatgpt_app' },
    })
    expect(format.status).toBe(200)
    expect(parse(format.body).error.code).toBe('UNSUPPORTED_FORMAT')

    const mode = handleAsk({
      query: { text: 'salary' },
      prefer: { mode: 'summarize' },
    })
    expect(parse(mode.body).error.code).toBe('UNSUPPORTED_MODE')
  })

  it('reports NO_RESULTS when nothing matches', () => {
    const reply = handleAsk({ query: { text: 'zzqxwv' } })
    expect(parse(reply.body)).toMatchObject({
      _meta: { response_type: 'failure' },
      error: { code: 'NO_RESULTS' },
    })
  })

  it('streams start, result, and complete events when prefer.streaming is true', () => {
    const reply = handleAsk({
      query: { text: 'budgeting in cedis' },
      prefer: { streaming: true },
    })
    expect(reply.contentType).toBe('text/event-stream; charset=utf-8')
    const events = [...reply.body.matchAll(/^event: (\w+)$/gm)].map((m) => m[1])
    expect(events[0]).toBe('start')
    expect(events.at(-1)).toBe('complete')
    expect(events.filter((e) => e === 'result').length).toBeGreaterThan(0)
    const firstResult = reply.body.match(/event: result\ndata: (.*)\n/)
    expect(JSON.parse(firstResult?.[1] ?? '{}')).toMatchObject({
      index: 0,
      item: { '@type': 'WebPage' },
    })
  })
})

describe('schema feed', () => {
  it('is generated from the page registry as JSON Lines', async () => {
    const { schemaFeedJsonl } = await import('./feed')
    const lines = schemaFeedJsonl().trim().split('\n')
    expect(lines.length).toBeGreaterThanOrEqual(14)
    for (const line of lines) expect(JSON.parse(line)).toMatchObject({ '@type': 'WebPage' })
  })
})
