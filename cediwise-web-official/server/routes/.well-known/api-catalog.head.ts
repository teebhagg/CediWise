import {
  defineEventHandler,
  setResponseHeader,
  setResponseStatus,
} from 'nitro/h3'
import {
  API_CATALOG_CONTENT_TYPE,
  apiCatalogLinkHeader,
} from '../../../src/lib/agent/discovery'

/** HEAD carries the catalog relations in Link headers (RFC 9727 §2). */
export default defineEventHandler((event) => {
  setResponseStatus(event, 200)
  setResponseHeader(event, 'Content-Type', API_CATALOG_CONTENT_TYPE)
  setResponseHeader(event, 'Link', apiCatalogLinkHeader())
  return ''
})
