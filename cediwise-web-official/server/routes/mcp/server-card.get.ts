import { defineEventHandler, setResponseHeader } from 'nitro/h3'
import { mcpServerCard } from '../../../src/lib/agent/mcp'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setResponseHeader(
    event,
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600',
  )
  return mcpServerCard()
})
