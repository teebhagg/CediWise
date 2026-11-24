import {
  defineEventHandler,
  readBody,
  setResponseHeader,
  setResponseStatus,
} from 'nitro/h3'
import { a2aSendMessageReply } from '../../src/lib/agent/a2a'

/** A2A JSON-RPC endpoint. Supports `SendMessage`, read-only. */
export default defineEventHandler(async (event) => {
  let message: unknown
  try {
    message = await readBody(event)
  } catch {
    message = undefined
  }
  const reply = a2aSendMessageReply(message, () => crypto.randomUUID())
  setResponseStatus(event, reply.status)
  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return reply.body
})
