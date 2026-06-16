import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { absoluteUrl, createPageHead } from '@/lib/seo'
import { ChartLineDataIcon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/spending-insights')({
  component: SpendingInsightsPage,
  head: () =>
    createPageHead({
      path: '/spending-insights',
      title: 'Spending insights',
      description:
        'Charts that show where your cedis went: by category, week, or month. Part of CediWise budgeting. Built for Ghana spending patterns.',
    }),
})

const APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CediWise Spending Insights',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Android, iOS',
  url: absoluteUrl('/spending-insights'),
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
    title: 'Bar, line, and donut charts',
    description:
      'Same data, different views. Pick whichever makes your spending obvious.',
  },
  {
    title: 'Pick your time range',
    description:
      'Last week, month, six months, or year. Good for spotting a bad week vs a bad habit.',
  },
  {
    title: 'By category',
    description:
      'Food, transport, bills, subscriptions. See which slice of the pie grew.',
  },
  {
    title: 'Average spend',
    description:
      'Your typical week or month, with a line when you are above or below normal.',
  },
  {
    title: 'From real entries',
    description:
      'Charts use expenses you logged in CediWise. No bank sync required to start.',
  },
  {
    title: 'Ghana categories',
    description:
      'Food, trotro, MoMo, church, family. Categories that match local life.',
  },
]

function SpendingInsightsPage() {
  return (
    <>
      <FeatureInsightLayout
        title="See where the cedis went."
        tagline="Spending insights"
        description="Charts from your real transactions. Handy when you are broke by the 20th and cannot tell why."
        icon={ChartLineDataIcon}
        iconBgColor="bg-primary/30"
        image="/assets/ios/img-9.webp"
        highlights={highlights}
      >
        <h2>What this is</h2>
        <p>
          Spending insights turn your expense list into pictures. Instead of scrolling through dozens
          of MoMo and cash entries, you see bars and charts: how much went to food, transport, data,
          rent, and the rest. It is included with the{' '}
          <a href="/budgeting-tool">budgeting tool</a>, not a separate product.
        </p>

        <h2>How it works</h2>
        <p>
          Every time you log spending in CediWise, it feeds the charts. Open insights, choose a time
          range, and switch between chart types. Bar charts compare periods. Line charts show trends.
          Donut charts show what share each category took.
        </p>

        <h2>Example</h2>
        <p>
          You earn GHS 4,500 net. By the 18th you have GHS 200 left. The donut chart shows transport
          at 28% and food at 35%. That is your answer: not mystery spending, specific categories. You
          can trim trotro or eating out next month instead of guessing.
        </p>

        <h2>Who this helps</h2>
        <p>
          Anyone who asks &quot;where did my salary go?&quot; People who use MoMo for everything and
          lose track. Budgeters who want proof that a category is out of control.
        </p>

        <h2>Works well with</h2>
        <ul>
          <li>
            <a href="/budgeting-tool">Budgeting tool</a> to set limits after you see the pattern.
          </li>
          <li>
            <a href="/debt-dashboard">Debt dashboard</a> to compare loan payments with daily spending.
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
