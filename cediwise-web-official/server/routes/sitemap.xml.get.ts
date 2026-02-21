import {
  defineEventHandler,
  getRequestHeader,
  setResponseHeader,
} from 'nitro/h3'

const ROUTES = [
  '',
  '/about',
  '/contact',
  '/privacy',
  '/terms',
  '/salary-calculator',
  '/budgeting-tool',
  '/sme-ledger',
  '/financial-literacy',
]

export default defineEventHandler((event) => {
  const host = getRequestHeader(event, 'host') || 'cediwise.app'
  const protocol = host.includes('localhost') ? 'http' : 'https'
  const base = `${protocol}://${host}`

  const urls = ROUTES.map(
    (path) =>
      `  <url>
    <loc>${base}${path || '/'}</loc>
    <changefreq>weekly</changefreq>
    <priority>${path ? '0.8' : '1.0'}</priority>
  </url>`,
  ).join('\n')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`

  setResponseHeader(event, 'Content-Type', 'application/xml')
  setResponseHeader(
    event,
    'Cache-Control',
    'public, max-age=3600, s-maxage=3600',
  )
  return xml
})
