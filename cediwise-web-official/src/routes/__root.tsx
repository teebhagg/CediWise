import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import appCss from '../styles.css?url'
import { Header } from '@/components/layout/Header'

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
      {
        property: 'og:title',
        content: 'CediWise — Smart Money for Ghana',
      },
      {
        property: 'og:description',
        content:
          'Empowering Ghanaians with smart financial tools. Manage your salary, track your SME expenses, and build wealth with confidence.',
      },
      {
        property: 'og:image',
        content: '/cediwise-smooth-light-logo.png',
      },
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
      {
        name: 'twitter:image',
        content: '/cediwise-smooth-light-logo.png',
      },
    ],
    links: [
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

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <HeadContent />
      </head>
      <body>
        <Header />
        {children}
        <Scripts />
      </body>
    </html>
  )
}
