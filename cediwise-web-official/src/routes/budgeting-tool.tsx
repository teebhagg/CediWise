import { ChartLineDataIcon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { absoluteUrl, createPageHead } from '@/lib/seo'

export const Route = createFileRoute('/budgeting-tool')({
  component: BudgetingToolPage,
  head: () =>
    createPageHead({
      path: '/budgeting-tool',
      title: 'Budget with clarity',
      description:
        'See where your money goes, how much you can spend today, and when cash might run low. Ghana budgeting app in cedis.',
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
    title: 'Categories that make sense',
    description:
      'Food, transport, rent, MoMo, savings. Set a limit per category instead of guessing.',
  },
  {
    title: 'Spent vs left',
    description:
      'A simple bar shows what you have used and what is still available this month.',
  },
  {
    title: 'Safe to spend today',
    description:
      'The app tells you how much you can spend today without breaking the month.',
  },
  {
    title: 'Run-out date',
    description:
      'If you keep spending at this pace, you see roughly when money might finish.',
  },
  {
    title: 'Spending charts',
    description:
      'Bar, line, and donut views so you can spot what ate your salary.',
  },
  {
    title: 'Works offline',
    description:
      'Log expenses on the go. Sync when you are back online.',
  },
]

function BudgetingToolPage() {
  return (
    <>
      <FeatureInsightLayout
        title="Budget with clarity."
        tagline="Budgeting"
        description="See where your money goes and plan the month ahead. Built for cedis, MoMo, and real Ghana spending."
        icon={ChartLineDataIcon}
        iconBgColor="bg-primary/30"
        image="/assets/ios/img-2.webp"
        highlights={highlights}
      >
        <h2>What this is</h2>
        <p>
          A budget is just a plan for your money. You decide how much goes to rent, food, transport,
          church, family support, savings, and everything else. Then you log what you actually spend.
          CediWise shows the gap between the plan and reality before you are surprised on the 25th.
        </p>

        <h2>How it works (step by step)</h2>
        <p>
          <strong>1. Start with your take-home pay.</strong> Use the salary calculator or type your net
          income. That is the pot you are working with this month.
        </p>
        <p>
          <strong>2. Split it into categories.</strong> Needs (rent, utilities, food), wants (eating out,
          data bundles), and savings. You can use the 50/30/20 idea as a starting point or set your own
          numbers.
        </p>
        <p>
          <strong>3. Log spending as it happens.</strong> GHS 45 on trotro, GHS 200 MoMo transfer, GHS 80
          at the market. Each entry updates your progress bars.
        </p>
        <p>
          <strong>4. Check safe-to-spend.</strong> The app answers: &quot;If I keep going like this, when
          does money run out?&quot; and &quot;How much can I spend today?&quot;
        </p>

        <h2>Spending insights (built in)</h2>
        <p>
          Charts break down spending by category and by week or month. That is how you catch the small
          leaks: daily food, ride fares, subscriptions you forgot, repeated MoMo charges. No separate
          tool to learn. It lives inside your budget.
        </p>

        <h2>Who this helps</h2>
        <p>
          Salaried workers who earn okay but still run dry before month end. People paid in cash and
          MoMo who never see a bank statement. Anyone tired of opening Notes or Excel every evening.
        </p>

        <h2>Works well with</h2>
        <ul>
          <li>
            <a href="/salary-calculator">Salary calculator</a> to start from the right net pay.
          </li>
          <li>
            <a href="/debt-dashboard">Debt dashboard</a> so loan repayments sit inside your budget.
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
