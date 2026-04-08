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
      title: 'SME Ledger — One GRA Audit Costs More Than 3 Years of CediWise',
      description:
        'Stay VAT-compliant and audit-ready without hiring an accountant. Automatic 20% VAT, GHS 750K threshold tracking, and GRA-ready records for Ghana SMEs.',
      schemas: [
        getAppSchema(),
        getFAQSchema([
          {
            question: 'What is the VAT threshold for small businesses in Ghana?',
            answer:
              'Under Act 1151, the mandatory VAT registration threshold for businesses dealing in goods is GHS 750,000 in annual turnover. Service providers are generally required to register regardless of turnover.',
          },
          {
            question: 'How does CediWise help with VAT calculations?',
            answer:
              'CediWise automatically calculates the 20% VAT (including NHIL, GETFund, and COVID-19 levies) for both inclusive and exclusive amounts, ensuring your SME records are compliant.',
          },
        ]),
      ],
    }),
})

const highlights = [
  {
    title: 'Sales & expenses',
    description:
      'Log all business income and expenses in one place. Categorize transactions for clear reporting.',
  },
  {
    title: 'Automatic 20% VAT',
    description:
      'VAT-inclusive and VAT-exclusive amounts calculated automatically under Act 1151. No manual math.',
  },
  {
    title: 'VAT threshold alert',
    description:
      'Get notified as you approach the GHS 750,000 annual turnover threshold for VAT registration.',
  },
  {
    title: 'Monthly P&L summary',
    description:
      'See total revenue, expenses, and profit at a glance. Export CSV for your accountant.',
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
    <FeatureInsightLayout
      title="One GRA Audit Costs More Than 3 Years of CediWise."
      tagline="Business Finance"
      description="Stay VAT-compliant, audit-ready, and ahead of your GHS 750K threshold — without hiring an accountant. Automatic 20% VAT calculations under Act 1151."
      icon={Invoice02Icon}
      iconBgColor="bg-blue-500/30"
      image="/assets/android/img-6.webp"
      highlights={highlights}
    >
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <GlassCard
          label="VAT Rate (Act 1151)"
          value="20.0% Automatic"
          icon={<HugeIcon icon={PercentIcon} size={20} />}
          iconBgColor="bg-blue-500/20"
          iconColor="text-blue-400"
        />
        <GlassCard
          label="Registration Threshold"
          value="GHS 750K Turnover"
          icon={<HugeIcon icon={Target02Icon} size={20} />}
          iconBgColor="bg-orange-500/20"
          iconColor="text-orange-400"
        />
      </div>

      <div className="mt-12 space-y-6">
        <h2>How it works</h2>
        <p>
          Add your sales and expenses with date, amount, and category. CediWise automatically applies
          20% VAT where relevant and keeps a running total of your turnover. As you approach GHS
          750,000 in annual turnover (for goods businesses), you&apos;ll get a heads-up — so you can plan for VAT registration
          if needed. Service providers are always required to register regardless of turnover under Act 1151.
        </p>

        <h2>Built for Ghanaian small &amp; medium enterprises (SMEs)</h2>
        <p>
          Many small business owners in Ghana manage money in notebooks or scattered spreadsheets. The
          SME Ledger gives you a digital record that is professional and accountant-ready.
        </p>

        <h2>Why it matters</h2>
        <p>
          A GRA audit without proper records can cost far more than any subscription — in penalties,
          back taxes, and accountant fees. Under Act 915, late filing alone carries a GHS 500
          initial penalty plus GHS 10 per day. The SME Ledger keeps you compliant from day one,
          so an audit is never a crisis.
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
      </div>
    </FeatureInsightLayout>
  )
}
