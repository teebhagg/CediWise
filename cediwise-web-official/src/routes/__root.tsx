import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { Header } from '@/components/layout/Header'
import { OG_IMAGE, SITE_URL } from '@/lib/seo'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      {
        title: 'CediWise — Smart Money for Ghana',
      },
      {
        name: 'description',
        content:
          'Empowering Ghanaians with smart financial tools. Manage your salary, track your SME expenses, and build wealth with confidence.',
      },
      {
        name: 'keywords',
        content:
          'CediWise, Ghana, finance, salary calculator, budgeting, SME ledger, financial literacy, wealth management, money tracker',
      },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:site_name', content: 'CediWise' },
      { property: 'og:locale', content: 'en_GH' },
      {
        property: 'og:title',
        content: 'CediWise — Smart Money for Ghana',
      },
      {
        property: 'og:description',
        content:
          'Empowering Ghanaians with smart financial tools. Manage your salary, track your SME expenses, and build wealth with confidence.',
      },
      { property: 'og:image', content: OG_IMAGE },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
      {
        name: 'twitter:title',
        content: 'CediWise — Smart Money for Ghana',
      },
      {
        name: 'twitter:description',
        content:
          'Empowering Ghanaians with smart financial tools. Manage your salary, track your SME expenses, and build wealth with confidence.',
      },
      { name: 'twitter:image', content: OG_IMAGE },
      {
        name: 'author',
        content: 'Joshua Ansah, khalijonez777@gmail.com, joshua.albert.ansah@gmail.com',
      },
      {
        name: 'publisher',
        content: 'CediWise',
      },
      {
        name: 'copyright',
        content: 'CediWise',
      },
    ],
    links: [
      { rel: 'canonical', href: SITE_URL },
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'icon',
        type: 'image/png',
        href: '/cediwise-smooth-light-logo.png',
      },
      {
        rel: 'apple-touch-icon',
        href: '/cediwise-smooth-light-logo.png',
      },
    ],
  }),

  shellComponent: RootDocument,
})

const ORGANIZATION_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'CediWise',
  url: SITE_URL,
  description:
    'Smart finance for Ghana. Salary calculator, budgeting, SME ledger, and financial literacy tools.',
  areaServed: { '@type': 'Country', name: 'Ghana' },
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(ORGANIZATION_JSON_LD),
          }}
        />
      </head>
      <body>
        <Header />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
