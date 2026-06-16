import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { Header } from '@/components/layout/Header'
import { SalaryCalculatorBanner } from '@/components/layout/SalaryCalculatorBanner'
import { OG_IMAGE, SITE_URL } from '@/lib/seo'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: 'CediWise — Finance App for Ghana',
      },
      {
        name: 'description',
        content:
          'Check PAYE and SSNIT, budget in cedis, track SME VAT. Free web salary calculator. App on Android and iOS.',
      },
      {
        name: 'keywords',
        content:
          'CediWise, Ghana financial operating system, Ghana salary calculator, PAYE calculator Ghana, SSNIT, net salary Ghana, SME ledger, budgeting Ghana, debt tracker, financial literacy Ghana, PAYE verification, GRA tax calculator 2026',
      },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:site_name', content: 'CediWise' },
      { property: 'og:locale', content: 'en_GH' },
      {
        property: 'og:title',
        content: 'CediWise — Finance App for Ghana',
      },
      {
        property: 'og:description',
        content:
          'Check PAYE and SSNIT, budget in cedis, track SME VAT. Free salary calculator on the web.',
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
        content: 'CediWise — Finance App for Ghana',
      },
      {
        name: 'twitter:description',
        content:
          'PAYE checks, budgeting, SME ledger. Built for Ghana.',
      },
      { name: 'twitter:image', content: OG_IMAGE },
      {
        name: 'author',
        content:
          'Joshua Ansah, khalijonez777@gmail.com, mr.joshua.ansah@gmail.com',
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
    'CediWise is a finance app for Ghana: PAYE and SSNIT checks, budgeting, SME ledger, debt tracking, and money lessons.',
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
        <SalaryCalculatorBanner />
        <Header />
        {children}
        <Scripts />
        <script src="//code.tidio.co/m4zgi8lwubbj3tbwxk6ketesara9be0m.js" async></script>
      </body>
    </html>
  )
}
