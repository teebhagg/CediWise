import { TrendingDown } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'
import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { absoluteUrl, createPageHead } from '@/lib/seo'

export const Route = createFileRoute('/debt-dashboard')({
  component: DebtDashboardPage,
  head: () =>
    createPageHead({
      path: '/debt-dashboard',
      title: 'Debt Dashboard',
      description:
        'Track your loans and debts in one place. See total debt, monthly payments, payoff timelines, and your debt-to-income ratio.',
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
    title: 'Total debt overview',
    description:
      'See all your active debts in one place, with a single total so you always know what you owe.',
  },
  {
    title: 'Monthly payment load',
    description:
      'Understand how much of your income is going into debt each month, across all loans and cards.',
  },
  {
    title: 'Payoff timeline',
    description:
      'Get a projected payoff date for each debt based on your current payment plan, so you can plan ahead.',
  },
  {
    title: 'Debt-to-income ratio',
    description:
      'Track your debt-to-income ratio and get warned when it goes above healthy levels.',
  },
  {
    title: 'Per-debt progress',
    description:
      'Each debt shows how much you have paid off, how much is left, and how your payments are moving you forward.',
  },
  {
    title: 'Integrated with your budget',
    description:
      'Debt payments flow into your CediWise budget categories, so your plan reflects your real obligations.',
  },
]

function DebtDashboardPage() {
  return (
    <>
      <FeatureInsightLayout
        title="Debt Dashboard"
        tagline="Stay Ahead of Your Debts"
        description="Track loans, credit, and other debts with clarity. See totals, monthly payments, payoff dates, and debt-to-income ratio in one dashboard."
        icon={TrendingDown}
        iconBgColor="bg-rose-500/20"
        image="/assets/android/img-1.webp"
        highlights={highlights}
      >
        <h2>How it works</h2>
        <p>
          Add each of your debts — personal loans, salary advances, credit accounts, or any other
          borrowing. For each one, you define the total amount, remaining balance, and monthly payment.
          The dashboard then calculates how much you owe in total and how much you are paying every
          month.
        </p>
        <p>
          As you record payments, CediWise updates the remaining balance and progress for each debt. You
          can quickly see which debts are almost done and which ones are barely moving.
        </p>

        <h2>See the real impact on your income</h2>
        <p>
          The Debt Dashboard calculates your debt-to-income ratio — how much of your monthly income is
          tied up in debt payments. When that ratio goes too high, it becomes harder to save, invest, or
          handle emergencies. CediWise highlights when you are above healthy thresholds so you can take
          action.
        </p>

        <h2>Connected to your budget</h2>
        <p>
          Debt payments are automatically treated as part of your budget, so your monthly plan reflects
          your real obligations. When you pay down debt, the app records it as spending in the right
          category, keeping your budget and debt picture in sync.
        </p>

        <h2>Why it matters</h2>
        <p>
          Many Ghanaians manage debt informally — in notebooks, scattered messages, or just in their
          heads. That makes it easy to lose track and hard to see the total picture. The Debt Dashboard
          gives you a clear, honest view so you can decide what to pay off first, how much you can
          safely borrow, and when it&apos;s time to slow down and rebuild.
        </p>

        <h2>Works best with</h2>
        <ul>
          <li>
            <a href="/budgeting-tool">Budgeting Tool</a> to plan how much you can safely allocate to
            debt each month.
          </li>
          <li>
            <a href="/spending-insights">Spending Insights</a> to see how debt payments sit beside your
            other expenses.
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

