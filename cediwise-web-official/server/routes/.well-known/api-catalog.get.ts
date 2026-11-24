import { defineEventHandler, setResponseHeader } from 'nitro/h3'
import {
  API_CATALOG_CONTENT_TYPE,
  apiCatalogLinkset,
} from '../../../src/lib/agent/discovery'

export default defineEventHandler((event) => {
  setResponseHeader(event, 'Content-Type', API_CATALOG_CONTENT_TYPE)
  setResponseHeader(
    event,
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600',
  )
  return apiCatalogLinkset()
})
