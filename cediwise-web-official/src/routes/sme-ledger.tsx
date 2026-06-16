import { Invoice02Icon, Target02Icon, PercentIcon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon as HugeIcon } from '@hugeicons/react'
import { createFileRoute } from '@tanstack/react-router'
import { GlassCard } from '@/components/ui/glass-card'
import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { createPageHead, getAppSchema, getFAQSchema } from '@/lib/seo'

export const Route = createFileRoute('/sme-ledger')({
  component: SMELedgerPage,
  head: () =>
    createPageHead({
      path: '/sme-ledger',
      title: 'Run your business smarter',
      description:
        'Sales, expenses, VAT, and cash flow in one ledger for Ghana SMEs. Threshold alerts at GHS 750K turnover. CSV export for your accountant.',
      schemas: [
        getAppSchema(),
        getFAQSchema([
          {
            question: 'What is the VAT threshold for small businesses in Ghana?',
            answer:
              'Under Act 1151, many goods businesses must register for VAT when annual turnover reaches GHS 750,000. Service businesses often register regardless of turnover. CediWise tracks your running total and warns you as you approach the limit.',
          },
          {
            question: 'How does CediWise calculate VAT?',
            answer:
              'You log sales and expenses. The app applies 20% VAT rules (including NHIL, GETFund, and COVID-19 levies where relevant) for inclusive or exclusive amounts so you do not have to do it on a calculator each time.',
          },
        ]),
      ],
    }),
})

const highlights = [
  {
    title: 'Sales and expenses',
    description:
      'Record money in and money out. Tag by category so reports make sense later.',
  },
  {
    title: 'VAT handled for you',
    description:
      '20% VAT calculated on eligible amounts. Less manual math, fewer mistakes.',
  },
  {
    title: 'GHS 750K alert',
    description:
      'Running turnover total with a heads-up before you cross VAT registration territory.',
  },
  {
    title: 'Monthly profit snapshot',
    description:
      'Revenue minus expenses for the month. See if the business actually made money.',
  },
  {
    title: 'CSV for your accountant',
    description:
      'Export records instead of handing over a worn notebook.',
  },
  {
    title: 'Side hustle friendly',
    description:
      'For traders, freelancers, and small shops. No accounting degree required.',
  },
]

function SMELedgerPage() {
  return (
    <FeatureInsightLayout
      title="Run your business smarter."
      tagline="SME Ledger"
      description="Stay on top of expenses and cash flow. Sales, costs, VAT, and records in one place."
      icon={Invoice02Icon}
      iconBgColor="bg-blue-500/30"
      image="/assets/ios/img-4.webp"
      highlights={highlights}
    >
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <GlassCard
          label="VAT rate (Act 1151)"
          value="20% automatic"
          icon={<HugeIcon icon={PercentIcon} size={20} />}
          iconBgColor="bg-blue-500/20"
          iconColor="text-blue-400"
        />
        <GlassCard
          label="Turnover watch"
          value="GHS 750K alert"
          icon={<HugeIcon icon={Target02Icon} size={20} />}
          iconBgColor="bg-orange-500/20"
          iconColor="text-orange-400"
        />
      </div>

      <div className="mt-12 space-y-6">
        <h2>What this is</h2>
        <p>
          A simple business notebook inside your phone. You record sales (money coming in) and
          expenses (money going out). CediWise adds up totals, applies VAT where needed, and shows
          whether the month was profitable. Built for market women, online sellers, freelancers, and
          anyone running a side business alongside a salary.
        </p>

        <h2>How it works (step by step)</h2>
        <p>
          <strong>1. Log a sale.</strong> Amount, date, what you sold. Mark if VAT applies.
        </p>
        <p>
          <strong>2. Log an expense.</strong> Stock, delivery, airtime, packaging, transport. Same
          idea.
        </p>
        <p>
          <strong>3. Check your dashboard.</strong> Total sales, total costs, estimated profit. VAT
          collected or owed where relevant.
        </p>
        <p>
          <strong>4. Watch turnover.</strong> If you sell goods and approach GHS 750,000 in annual
          turnover, the app warns you. Service businesses often need VAT registration earlier; the
          ledger still keeps your records straight.
        </p>

        <h2>VAT in plain language</h2>
        <p>
          VAT is a tax on sales. Registered businesses charge it, file returns, and pay GRA. Getting
          the maths wrong or missing registration can mean penalties. The ledger does the 20%
          calculation on each entry so your notebook matches what an auditor would expect.
        </p>

        <h2>Why records matter</h2>
        <p>
          GRA can ask for proof of income and expenses. A fine for late filing or poor records costs
          more than years of app subscription. Digital records also help when you apply for a loan or
          need to show a partner how the business is doing.
        </p>

        <h2>Works well with</h2>
        <ul>
          <li>
            <a href="/salary-calculator">Salary calculator</a> if you also earn a wage.
          </li>
          <li>
            <a href="/budgeting-tool">Budgeting tool</a> to separate personal spending from business
            cash.
          </li>
          <li>
            <a href="/financial-literacy">Financial literacy</a> for VAT and MoMo basics.
          </li>
        </ul>
      </div>
    </FeatureInsightLayout>
  )
}
