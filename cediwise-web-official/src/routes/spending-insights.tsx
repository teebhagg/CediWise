import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { absoluteUrl, createPageHead } from '@/lib/seo'
import { ChartLineDataIcon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/spending-insights')({
  component: SpendingInsightsPage,
  head: () =>
    createPageHead({
      path: '/spending-insights',
      title: 'Spending Insights',
      description:
        'Visualize your spending with bar, line, and donut charts. See trends, averages, and category breakdowns across weeks and months.',
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
    title: 'Multiple chart types',
    description:
      'Switch between bar, line, and donut charts to understand your spending from different angles.',
  },
  {
    title: 'Smart time ranges',
    description:
      'View insights over 1 week, 1 month, 6 months, or 1 year to spot short-term spikes and long-term trends.',
  },
  {
    title: 'Category breakdown',
    description:
      'See exactly how much each category contributes to your total spend and what percentage it represents.',
  },
  {
    title: 'Average per period',
    description:
      'Track your average spending per week or per month with clear reference lines and labels.',
  },
  {
    title: 'Built on your real data',
    description:
      'Insights are powered by the same budget cycles and transactions you log in CediWise.',
  },
  {
    title: 'Designed for Ghana',
    description:
      'Spending insights tuned to Ghanaian spending patterns, from food and transport to bills and mobile money.',
  },
]

function SpendingInsightsPage() {
  return (
    <>
      <FeatureInsightLayout
        title="Spending Insights"
        tagline="See Where Your Money Goes"
        description="Visualize your spending with charts, trends, and category breakdowns. Understand your habits so you can change them."
        icon={ChartLineDataIcon}
        iconBgColor="bg-primary/30"
        image="/assets/android/img-3.webp"
        highlights={highlights}
      >
        <h2>How it works</h2>
        <p>
          The Spending Insights dashboard turns your raw transactions into clear visuals. Each time you
          log an expense in CediWise, it feeds into your charts and category breakdowns — so you always
          have an up-to-date view of where your money is going.
        </p>
        <p>
          Choose between bar, line, and donut views. Bar charts show how much you spent in each period,
          line charts highlight trends over time, and donut charts show how your spending is split
          across categories.
        </p>

        <h2>Time ranges that match real life</h2>
        <p>
          Switch between 1 week, 1 month, 6 months, and 1 year. Short ranges help you catch recent
          spikes — like an expensive week of transport or food — while longer ranges reveal patterns in
          your lifestyle. The average per period line makes it easy to see when you are above or below
          your usual spend.
        </p>

        <h2>By category, at a glance</h2>
        <p>
          Every cedi you spend is assigned to a category. The insights view shows how much you spent in
          each category, plus what percentage of your total it represents. That way, you can quickly see
          if food, transport, subscriptions, or another category is quietly taking over your budget.
        </p>

        <h2>Why it matters</h2>
        <p>
          Most people know they are overspending — they just don&apos;t know exactly where. Spending
          Insights gives you the clarity to act. Once you can see your patterns, you can set better
          limits, adjust categories, and build habits that support your goals instead of fighting them.
        </p>

        <h2>Works best with</h2>
        <ul>
          <li>
            <a href="/budgeting-tool">Budgeting Tool</a> to set the plans that power your insights.
          </li>
          <li>
            <a href="/debt-dashboard">Debt Dashboard</a> to see how debt payments sit alongside your
            everyday spending.
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

