import { ChartLineDataIcon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { absoluteUrl, createPageHead } from '@/lib/seo'

export const Route = createFileRoute('/budgeting-tool')({
  component: BudgetingToolPage,
  head: () =>
    createPageHead({
      path: '/budgeting-tool',
      title: 'Budgeting Tool — Never Run Out of Money Before Month End',
      description:
        'See the exact date your money runs out if current spending continues, and your safe-to-spend figure updated daily. Ghana budgeting app built for real life.',
    }),
})

const APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CediWise Budgeting Tool',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Android, iOS',
  url: absoluteUrl('/budgeting-tool'),
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
    title: 'Category-based budgets',
    description:
      'Set budgets for Needs, Wants, Savings, and custom categories. Aligned with the 50/30/20 rule.',
  },
  {
    title: 'Real-time progress',
    description:
      'See spent vs. remaining at a glance. Visual progress bars keep you on track throughout the month.',
  },
  {
    title: 'Smart rollovers',
    description:
      'Unspent amounts can roll over to next month. Build savings momentum without extra effort.',
  },
  {
    title: 'No spreadsheets',
    description:
      'Simple, focused UI. No formulas, no confusion. Just set your budget and track it.',
  },
  {
    title: 'Sync across devices',
    description:
      'Your budget follows you. Update on mobile, check on web — stay consistent.',
  },
  {
    title: 'Personalized guidance',
    description:
      'Get tailored tips based on your spending patterns and goals.',
  },
]

function BudgetingToolPage() {
  return (
    <>
      <FeatureInsightLayout
        title="Never Run Out of Money Before Month End"
        tagline="Smart Budgeting"
        description="See the exact date your money runs out if current spending continues. Your safe-to-spend figure, updated daily — so you always know where you stand."
        icon={ChartLineDataIcon}
        iconBgColor="bg-primary/30"
        image="/assets/android/img-2.webp"
        highlights={highlights}
      >
        <h2>How it works</h2>
        <p>
          Create a budget for each spending category — food, transport, utilities, savings, and more.
          As you log transactions, CediWise shows you how much you&apos;ve spent versus your limit.
          Simple progress bars and alerts help you stay within your plan.
        </p>

        <h2>The 50/30/20 approach</h2>
        <p>
          We guide you toward a balanced allocation: 50% Needs, 30% Wants, 20% Savings. You can
          customize these ratios to fit your situation. The goal is clarity, not rigidity.
        </p>

        <h2>Why it matters</h2>
        <p>
          Most people don&apos;t run out of money because they spend too much on one big thing —
          they run out because small daily spending adds up invisibly. Knowing the exact date your
          money runs out, days in advance, changes the decision you make today. Not after the fact.
        </p>

        <h2>Works best with</h2>
        <ul>
          <li>
            <a href="/spending-insights">Spending Insights dashboard</a> to see trends and category
            breakdowns for your budget.
          </li>
          <li>
            <a href="/debt-dashboard">Debt Dashboard</a> to understand how loans and debt payments
            affect your monthly plan.
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
