import { describe, expect, it } from 'vitest'
import {
  MCP_LEGACY_PROTOCOL_VERSION,
  MCP_PROTOCOL_VERSION,
  handleMcpMessage,
  mcpServerCard,
} from './mcp'

const rpc = (method: string, params?: unknown, id: number | string = 1) => ({
  jsonrpc: '2.0',
  id,
  method,
  ...(params === undefined ? {} : { params }),
})

describe('handleMcpMessage', () => {
  it('answers notifications with 202 and no body', async () => {
    expect(
      await handleMcpMessage({
        jsonrpc: '2.0',
        method: 'notifications/initialized',
      }),
    ).toEqual({ status: 202 })
  })

  it('advertises the current and legacy protocol versions in server/discover', async () => {
    const reply = await handleMcpMessage(rpc('server/discover'))
    expect(reply.status).toBe(200)
    const result = (reply.body as { result: Record<string, any> }).result
    expect(result.supportedVersions).toEqual([
      MCP_PROTOCOL_VERSION,
      MCP_LEGACY_PROTOCOL_VERSION,
    ])
    expect(result.capabilities).toEqual({ tools: {} })
    expect(result._meta['io.modelcontextprotocol/serverInfo'].name).toBe(
      'CediWise',
    )
  })

  it('answers the legacy initialize handshake', async () => {
    const result = (await handleMcpMessage(rpc('initialize'))).body as {
      result: Record<string, any>
    }
    expect(result.result.protocolVersion).toBe(MCP_LEGACY_PROTOCOL_VERSION)
    expect(result.result.serverInfo.name).toBe('CediWise')
  })

  it('lists the read-only tools', async () => {
    const result = (
      (await handleMcpMessage(rpc('tools/list'))).body as {
        result: {
          tools: Array<{
            name: string
            annotations?: { readOnlyHint?: boolean }
          }>
        }
      }
    ).result
    expect(result.tools.map((tool) => tool.name)).toEqual([
      'estimate_ghana_take_home',
      'list_public_pages',
      'search_site',
    ])
    for (const tool of result.tools)
      expect(tool.annotations?.readOnlyHint).toBe(true)
  })

  it('calls the take-home tool and returns its JSON as text', async () => {
    const reply = await handleMcpMessage(
      rpc('tools/call', {
        name: 'estimate_ghana_take_home',
        arguments: { grossMonthlySalary: 5000 },
      }),
    )
    const result = (
      reply.body as {
        result: { content: Array<{ text: string }>; isError: boolean }
      }
    ).result
    expect(result.isError).toBe(false)
    expect(JSON.parse(result.content[0]?.text ?? '{}')).toMatchObject({
      currency: 'GHS',
      grossMonthly: 5000,
    })
  })

  it('reports tool failures inside the result with isError', async () => {
    const reply = await handleMcpMessage(
      rpc('tools/call', {
        name: 'estimate_ghana_take_home',
        arguments: { grossMonthlySalary: -1 },
      }),
    )
    const result = (
      reply.body as {
        result: { isError: boolean; content: Array<{ text: string }> }
      }
    ).result
    expect(result.isError).toBe(true)
    expect(result.content[0]?.text).toMatch(/grossMonthlySalary/)
  })

  it('returns JSON-RPC errors for unknown tools, unknown methods, and bad envelopes', async () => {
    expect(
      await handleMcpMessage(rpc('tools/call', { name: 'nope' })),
    ).toMatchObject({
      status: 400,
      body: { error: { code: -32602 } },
    })
    expect(await handleMcpMessage(rpc('resources/list'))).toMatchObject({
      status: 400,
      body: { error: { code: -32601 } },
    })
    expect(await handleMcpMessage({ id: 1, method: 'ping' })).toMatchObject({
      status: 400,
      body: { error: { code: -32600 } },
    })
    expect(await handleMcpMessage([rpc('ping')])).toMatchObject({
      status: 400,
      body: { error: { code: -32600 } },
    })
    expect(await handleMcpMessage(null)).toMatchObject({ status: 400 })
  })

  it('answers ping with an empty result', async () => {
    expect(await handleMcpMessage(rpc('ping'))).toEqual({
      status: 200,
      body: { jsonrpc: '2.0', id: 1, result: {} },
    })
  })
})

describe('mcpServerCard', () => {
  const card = mcpServerCard()

  it('follows the server card rules: schema, reverse-DNS name, semver, short description', () => {
    expect(card.$schema).toBe(
      'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    )
    expect(card.name).toMatch(/^[a-z0-9.-]+\/[a-z0-9.-]+$/)
    expect(String(card.version)).toMatch(/^\d+\.\d+\.\d+$/)
    expect(String(card.description).length).toBeLessThanOrEqual(100)
  })

  it('points remotes at the streamable HTTP endpoint', () => {
    expect(card.remotes).toEqual([
      { type: 'streamable-http', url: 'https://www.cediwise.app/mcp' },
    ])
  })
})
