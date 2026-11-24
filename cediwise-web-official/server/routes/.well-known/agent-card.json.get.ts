import { defineEventHandler, setResponseHeader } from 'nitro/h3'
import { a2aAgentCard } from '../../../src/lib/agent/a2a'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', 'application/json; charset=utf-8')
  setResponseHeader(
    event,
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600',
  )
  return a2aAgentCard()
})
