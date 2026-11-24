import {
  defineEventHandler,
  readBody,
  setResponseHeader,
  setResponseStatus,
} from 'nitro/h3'
import { handleAsk } from '../../src/lib/agent/nlweb'

/** NLWeb `POST /ask`: answers questions with the public CediWise pages. */
export default defineEventHandler(async (event) => {
  let input: unknown
  try {
    input = await readBody(event)
  } catch {
    input = undefined
  }
  const reply = handleAsk(input)
  setResponseStatus(event, reply.status)
  setResponseHeader(event, 'Content-Type', reply.contentType)
  setResponseHeader(event, 'Cache-Control', 'no-store')
  return reply.body
})
