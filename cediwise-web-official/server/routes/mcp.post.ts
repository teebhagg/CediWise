import {
  defineEventHandler,
  readBody,
  setResponseHeader,
  setResponseStatus,
} from 'nitro/h3'
import { handleMcpMessage } from '../../src/lib/agent/mcp'

/** MCP Streamable HTTP endpoint (stateless JSON-RPC over POST). */
export default defineEventHandler(async (event) => {
  let message: unknown
  try {
    message = await readBody(event)
  } catch {
    message = undefined
  }
  const reply = await handleMcpMessage(message)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  if (reply.status === 202) {
    setResponseStatus(event, 202)
    return ''
  }
  setResponseStatus(event, reply.status)
  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  return reply.body
})
