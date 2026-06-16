import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/components/landing/LandingPage'
import { HERO_LCP_IMAGE_SRC } from '@/lib/heroAssets'
import { createPageHead, getAppSchema } from '@/lib/seo'

export const Route = createFileRoute('/')({
  component: App,
  head: () => {
    const pageHead = createPageHead({
      path: '/',
      title: 'CediWise — PAYE Calculator & Budget App for Ghana',
      description:
        'Check PAYE and SSNIT against GRA 2026 tables, budget in cedis, and track SME VAT. Free salary calculator on the web. Android and iOS app.',
      schemas: [getAppSchema()],
    })

    return {
      ...pageHead,
      links: [
        ...pageHead.links,
        {
          rel: 'preload',
          href: HERO_LCP_IMAGE_SRC,
          as: 'image',
          type: 'image/webp',
          fetchPriority: 'high',
        },
      ],
    }
  },
})

function App() {
  return <LandingPage />
}
