import { WEBMCP_TOOLS } from './webmcp'

/** MCP protocol revisions this server speaks. Stateless servers use `server/discover`. */
export const MCP_PROTOCOL_VERSION = '2026-07-28'
export const MCP_LEGACY_PROTOCOL_VERSION = '2025-11-25'
export const MCP_SERVER_INFO = { name: 'CediWise', version: '1.0.0' } as const

const JSON_RPC_ERRORS = {
  invalidRequest: -32600,
  methodNotFound: -32601,
  invalidParams: -32602,
} as const

export interface McpReply {
  status: 200 | 202 | 400
  body?: unknown
}

function rpcError(id: unknown, code: number, message: string): McpReply {
  return {
    status: 400,
    body: { jsonrpc: '2.0', id: id ?? null, error: { code, message } },
  }
}

function rpcResult(id: unknown, result: unknown): McpReply {
  return { status: 200, body: { jsonrpc: '2.0', id, result } }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

/** Read-only tools exposed over MCP: the same tools WebMCP registers in the browser. */
function listTools() {
  return WEBMCP_TOOLS.map((tool) => ({
    name: tool.name,
    title: tool.title,
    description: tool.description,
    inputSchema: tool.inputSchema ?? { type: 'object', properties: {} },
    annotations: tool.annotations,
  }))
}

async function callTool(
  id: unknown,
  params: Record<string, unknown>,
): Promise<McpReply> {
  const name = typeof params.name === 'string' ? params.name : ''
  const tool = WEBMCP_TOOLS.find((candidate) => candidate.name === name)
  if (!tool)
    return rpcError(id, JSON_RPC_ERRORS.invalidParams, `Unknown tool: ${name}`)

  try {
    const value = await tool.execute(params.arguments ?? {}, {
      signal: new AbortController().signal,
    })
    return rpcResult(id, {
      resultType: 'complete',
      content: [{ type: 'text', text: JSON.stringify(value) }],
      isError: false,
    })
  } catch (error) {
    // Tool failures are reported inside the result, as MCP specifies.
    const message = error instanceof Error ? error.message : 'Tool failed.'
    return rpcResult(id, {
      resultType: 'complete',
      content: [{ type: 'text', text: message }],
      isError: true,
    })
  }
}

/** Handles one JSON-RPC message from a `POST /mcp` request. */
export async function handleMcpMessage(message: unknown): Promise<McpReply> {
  if (Array.isArray(message)) {
    return rpcError(
      null,
      JSON_RPC_ERRORS.invalidRequest,
      'Batch requests are not supported.',
    )
  }
  if (
    !isObject(message) ||
    message.jsonrpc !== '2.0' ||
    typeof message.method !== 'string'
  ) {
    return rpcError(
      null,
      JSON_RPC_ERRORS.invalidRequest,
      'Invalid JSON-RPC request.',
    )
  }

  const hasId = 'id' in message
  // Notifications have no id and get no JSON-RPC response (HTTP 202).
  if (!hasId) return { status: 202 }

  const id = message.id
  const params = isObject(message.params) ? message.params : {}

  switch (message.method) {
    case 'server/discover':
      return rpcResult(id, {
        resultType: 'complete',
        supportedVersions: [MCP_PROTOCOL_VERSION, MCP_LEGACY_PROTOCOL_VERSION],
        capabilities: { tools: {} },
        _meta: { 'io.modelcontextprotocol/serverInfo': MCP_SERVER_INFO },
      })
    case 'initialize':
      return rpcResult(id, {
        protocolVersion: MCP_LEGACY_PROTOCOL_VERSION,
        capabilities: { tools: {} },
        serverInfo: MCP_SERVER_INFO,
      })
    case 'ping':
      return rpcResult(id, {})
    case 'tools/list':
      return rpcResult(id, { resultType: 'complete', tools: listTools() })
    case 'tools/call':
      return callTool(id, params)
    default:
      return rpcError(
        id,
        JSON_RPC_ERRORS.methodNotFound,
        `Method not found: ${message.method}`,
      )
  }
}

/** MCP server card (SEP-2127). Served at `/mcp/server-card`. */
export function mcpServerCard(): Record<string, unknown> {
  return {
    $schema:
      'https://static.modelcontextprotocol.io/schemas/v1/server-card.schema.json',
    name: 'app.cediwise/web',
    version: '1.0.0',
    description:
      'Read-only CediWise tools: estimate Ghana take-home pay and search public pages.',
    title: 'CediWise',
    websiteUrl: 'https://www.cediwise.app',
    repository: {
      url: 'https://github.com/teebhagg/CediWise',
      source: 'github',
    },
    remotes: [{ type: 'streamable-http', url: 'https://www.cediwise.app/mcp' }],
  }
}
