import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { absoluteUrl, createPageHead } from '@/lib/seo'
import { Invoice02Icon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/sme-ledger')({
  component: SMELedgerPage,
  head: () =>
    createPageHead({
      path: '/sme-ledger',
      title: 'Small & Medium Enterprise (SME) Ledger',
      description:
        'Sales and expenses with automatic 20% VAT calculations. Get alerted as you approach the GHS 750K VAT threshold.',
    }),
})

const APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CediWise Small & Medium Enterprise (SME) Ledger',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Android, iOS',
  url: absoluteUrl('/sme-ledger'),
  offers: {
    '@type': 'Offer',
    price: '0.00',
    priceCurrency: 'GHS',
  },
  areaServed: {
    '@type': 'Country',
    name: 'Ghana',
  },
} as const

const highlights = [
  {
    title: 'Sales & expenses',
    description:
      'Log all business income and expenses in one place. Categorize transactions for clear reporting.',
  },
  {
    title: 'Automatic 20% VAT',
    description:
      'VAT-inclusive and VAT-exclusive amounts calculated automatically. No manual math.',
  },
  {
    title: 'VAT threshold alert',
    description:
      'Get notified as you approach the GHS 750,000 annual turnover threshold for VAT registration.',
  },
  {
    title: 'Simple reports',
    description:
      'See total revenue, expenses, and profit at a glance. Export for your accountant or the Ghana Revenue Authority (GRA).',
  },
  {
    title: 'Business-ready',
    description:
      'Designed for small businesses, traders, and side hustles. No accounting degree required.',
  },
  {
    title: 'All-in-one',
    description:
      'Track your business finances alongside personal budgets. One app, full visibility.',
  },
]

function SMELedgerPage() {
  return (
    <>
      <FeatureInsightLayout
        title="Small & Medium Enterprise (SME) Ledger"
        tagline="Business Finance"
        description="Sales and expenses for small and medium enterprises (SMEs), with automatic 20% VAT calculations. Get alerted as you approach the GHS 750K VAT threshold."
        icon={Invoice02Icon}
        iconBgColor="bg-blue-500/30"
        image="/assets/android/img-6.webp"
        highlights={highlights}
      >
        <h2>How it works</h2>
        <p>
          Add your sales and expenses with date, amount, and category. CediWise automatically applies
          20% VAT where relevant and keeps a running total of your turnover. As you approach GHS
          750,000 in annual turnover, you&apos;ll get a heads-up — so you can plan for VAT registration
          if needed.
        </p>

        <h2>Built for Ghanaian small & medium enterprises (SMEs)</h2>
        <p>
          Many small business owners in Ghana manage money in notebooks or scattered spreadsheets. The
          SME Ledger gives you a clean, digital record. When it&apos;s time to file taxes or talk to an
          accountant, you&apos;re ready.
        </p>

        <h2>Why it matters</h2>
        <p>
          Good record-keeping is the foundation of business growth. You can&apos;t improve what you
          don&apos;t measure. The SME Ledger helps you see where money comes from, where it goes, and
          how much stays as profit.
        </p>

        <h2>Works best with</h2>
        <ul>
          <li>
            <a href="/salary-calculator">Salary Calculator</a> to understand staff costs alongside your
            SME revenue.
          </li>
          <li>
            <a href="/budgeting-tool">Budgeting Tool</a> to connect your business finances to your
            personal plan.
          </li>
        </ul>
      </FeatureInsightLayout>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSON_LD) }}
      />
    </>
  )
}
