export interface SitemapEntry {
  path: string
  /** W3C date of the last content change. Update when the page changes. */
  lastmod: string
  priority: string
}

/**
 * Public pages in the sitemap. Dates come from the git history of each page
 * (last commit that changed its route or the components it renders).
 */
export const SITEMAP_ENTRIES: ReadonlyArray<SitemapEntry> = [
  { path: '/', lastmod: '2026-11-24', priority: '1.0' },
  { path: '/about', lastmod: '2026-06-16', priority: '0.8' },
  { path: '/contact', lastmod: '2026-06-16', priority: '0.8' },
  { path: '/pricing', lastmod: '2026-11-24', priority: '0.8' },
  { path: '/privacy', lastmod: '2026-11-20', priority: '0.8' },
  { path: '/terms', lastmod: '2026-07-07', priority: '0.8' },
  { path: '/salary-calculator', lastmod: '2026-11-24', priority: '0.8' },
  { path: '/try-salary-calculator', lastmod: '2026-11-24', priority: '0.8' },
  { path: '/budgeting-tool', lastmod: '2026-06-16', priority: '0.8' },
  { path: '/sme-ledger', lastmod: '2026-06-16', priority: '0.8' },
  { path: '/financial-literacy', lastmod: '2026-06-16', priority: '0.8' },
]

/** Builds a sitemap XML document whose URLs are rooted at `base`. */
export function buildSitemapXml(
  base: string,
  entries: ReadonlyArray<SitemapEntry> = SITEMAP_ENTRIES,
): string {
  const urls = entries
    .map(
      (entry) => `  <url>
    <loc>${base}${entry.path}</loc>
    <lastmod>${entry.lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>${entry.priority}</priority>
  </url>`,
    )
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>`
}
