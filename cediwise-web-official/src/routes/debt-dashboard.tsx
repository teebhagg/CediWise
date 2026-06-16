import { TrendingDown } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { absoluteUrl, createPageHead } from '@/lib/seo'

export const Route = createFileRoute('/debt-dashboard')({
  component: DebtDashboardPage,
  head: () =>
    createPageHead({
      path: '/debt-dashboard',
      title: 'Eliminate debt faster',
      description:
        'Track loans, balances, monthly repayments, and payoff dates in one place. See what extra payments save you.',
    }),
})

const APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CediWise Debt Dashboard',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Android, iOS',
  url: absoluteUrl('/debt-dashboard'),
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
    title: 'Everything in one list',
    description:
      'Bank loan, salary advance, susu, owing a friend. One total instead of five mental notes.',
  },
  {
    title: 'Monthly load',
    description:
      'See how much of your salary goes to debt repayments each month.',
  },
  {
    title: 'Payoff dates',
    description:
      'Know when each loan ends if you keep paying as planned.',
  },
  {
    title: 'Interest in plain GHS',
    description:
      'Total interest over the life of the loan, not just the monthly instalment.',
  },
  {
    title: 'Extra payment math',
    description:
      'See what happens if you add GHS 50 or GHS 200 to one payment.',
  },
  {
    title: 'Tied to your budget',
    description:
      'Debt payments count as spending in your monthly plan.',
  },
]

function DebtDashboardPage() {
  return (
    <>
      <FeatureInsightLayout
        title="Eliminate debt faster."
        tagline="Debt"
        description="Track balances, repayments, and progress. See what you owe, what it costs, and what to pay first."
        icon={TrendingDown}
        iconBgColor="bg-rose-500/20"
        image="/assets/ios/img-12.webp"
        highlights={highlights}
      >
        <h2>What this is</h2>
        <p>
          Most people know they have debt. Few know the full number. The debt dashboard is a single
          screen for every loan, advance, and balance you are paying down. You enter what you owe,
          what you pay monthly, and the app does the rest.
        </p>

        <h2>How it works (step by step)</h2>
        <p>
          <strong>1. Add each debt.</strong> Name it (e.g. &quot;Fidelity personal loan&quot;), enter
          remaining balance, interest if you know it, and monthly payment.
        </p>
        <p>
          <strong>2. See the totals.</strong> Total owed across all debts. Total going out each month.
          That is your real debt load.
        </p>
        <p>
          <strong>3. Watch progress.</strong> Each payment reduces the balance. You see which debts are
          almost done and which are barely moving.
        </p>
        <p>
          <strong>4. Try &quot;what if&quot;.</strong> Add an extra GHS 100 this month. The app shows
          how much interest you skip and how much sooner you finish.
        </p>

        <h2>Debt-to-income (in plain language)</h2>
        <p>
          If half your salary goes to loans, saving and emergencies get hard. CediWise compares your
          debt payments to your income and flags when the ratio is high. It is a simple health check,
          not a lecture.
        </p>

        <h2>Common in Ghana</h2>
        <p>
          Salary advances from work. Mobile money loans. Susu or informal borrowing. Credit from shops.
          Keeping these in your head is stressful. Writing them in one app is how you decide what to
          clear first and when to stop borrowing.
        </p>

        <h2>Works well with</h2>
        <ul>
          <li>
            <a href="/budgeting-tool">Budgeting tool</a> so repayments are part of your monthly plan.
          </li>
          <li>
            <a href="/salary-calculator">Salary calculator</a> to know your real take-home first.
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
