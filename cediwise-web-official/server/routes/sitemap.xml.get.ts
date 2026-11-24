import {
  defineEventHandler,
  getRequestHeader,
  setResponseHeader,
} from 'nitro/h3'
import { buildSitemapXml } from '../lib/sitemap'

export default defineEventHandler((event) => {
  const host = getRequestHeader(event, 'host') || 'cediwise.app'
  const protocol = host.includes('localhost') ? 'http' : 'https'

  setResponseHeader(event, 'Content-Type', 'application/xml')
  setResponseHeader(
    event,
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600',
  )
  return buildSitemapXml(`${protocol}://${host}`)
})
