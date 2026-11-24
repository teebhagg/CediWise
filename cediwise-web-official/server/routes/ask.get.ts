import {
  defineEventHandler,
  setResponseHeader,
  setResponseStatus,
} from 'nitro/h3'

/** The ask endpoint accepts POST only. */
export default defineEventHandler((event) => {
  setResponseStatus(event, 405)
  setResponseHeader(event, 'Allow', 'POST')
  return ''
})
