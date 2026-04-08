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
        title: 'CediWise — Personal Finance Companion for Ghana',
      },
      {
        name: 'description',
        content:
          'Stop losing hundreds of cedis each month to untracked expenses and incorrect PAYE deductions. CediWise verifies your salary deductions, tracks your spending, and protects your business from GRA penalties.',
      },
      {
        name: 'keywords',
        content:
          'CediWise, Ghana personal finance companion app, Ghana salary calculator, PAYE, SSNIT, SME ledger, budgeting, debt, SME expenses, financial literacy, PAYE verification Ghana, salary deduction checker, employer PAYE check, never run out of money Ghana, GRA audit protection, Ghana budgeting app, SME ledger Ghana, VAT threshold Ghana, PAYE calculator 2026, SSNIT calculator Ghana',
      },
      { property: 'og:url', content: SITE_URL },
      { property: 'og:site_name', content: 'CediWise' },
      { property: 'og:locale', content: 'en_GH' },
      {
        property: 'og:title',
        content: 'CediWise — Personal Finance Companion for Ghana',
      },
      {
        property: 'og:description',
        content:
          'Stop losing hundreds of cedis each month to untracked expenses and incorrect PAYE deductions. CediWise verifies your salary deductions, tracks your spending, and protects your business from GRA penalties.',
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
        content: 'CediWise — Personal Finance Companion for Ghana',
      },
      {
        name: 'twitter:description',
        content:
          'CediWise is a personal finance companion for Ghana. Manage salary, PAYE, SSNIT, budgeting, debt, SME expenses, and financial literacy in one app.',
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
    'CediWise is a personal finance companion for Ghana. Salary calculator, budgeting, small and medium enterprise (SME) ledger, debt tracking, and financial literacy tools.',
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
        <script src="//code.tidio.co/m4zgi8lwubbj3tbwxk6ketesara9be0m.js" async></script>
      </body>
    </html>
  )
}
