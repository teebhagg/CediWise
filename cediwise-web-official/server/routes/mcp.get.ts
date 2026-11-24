import {
  defineEventHandler,
  setResponseHeader,
  setResponseStatus,
} from 'nitro/h3'

/** The stateless MCP endpoint does not open server-initiated streams. */
export default defineEventHandler((event) => {
  setResponseStatus(event, 405)
  setResponseHeader(event, 'Allow', 'POST')
  return ''
})
