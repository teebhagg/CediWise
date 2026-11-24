import { defineEventHandler, setResponseHeader } from 'nitro/h3'
import { schemaFeedJsonl } from '../../../src/lib/agent/feed'

export default defineEventHandler((event) => {
  setResponseHeader(
    event,
    'Content-Type',
    'application/x-ndjson; charset=utf-8',
  )
  setResponseHeader(
    event,
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600',
  )
  return schemaFeedJsonl()
})
