import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { formatGhs } from '@/lib/formatGhs'
import { GRA_PAYE_REFERENCE_URL } from '@/lib/ghanaTax'
import { createPageHead, getAppSchema, getFAQSchema } from '@/lib/seo'
import { CreditCardIcon } from '@hugeicons/core-free-icons'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/salary-calculator/$amount')({
  component: DynamicSalaryPage,
  head: ({ params }) => {
    const amount = params.amount
    const formattedAmount = `GHS ${Number(amount).toLocaleString()}`
    return createPageHead({
      path: `/salary-calculator/${amount}`,
      title: `${formattedAmount} salary in Ghana — PAYE & SSNIT 2026`,
      description: `What is take-home pay on a ${formattedAmount} gross monthly salary in Ghana? SSNIT, PAYE, and net explained with 2026 GRA rates.`,
      schemas: [
        getAppSchema(),
        getFAQSchema([
          {
            question: `What is the PAYE on ${formattedAmount} in Ghana?`,
            answer: `PAYE on ${formattedAmount} depends on 2026 GRA tax bands after SSNIT is deducted. Use the free CediWise calculator for the exact breakdown.`,
          },
          {
            question: `How much SSNIT is taken from ${formattedAmount}?`,
            answer: `Employee SSNIT is 5.5% of gross salary up to the statutory cap. Tier 2 pension also applies. The calculator shows both amounts.`,
          },
        ]),
      ],
    })
  },
})

function DynamicSalaryPage() {
  const { amount } = Route.useParams()
  const numericAmount = Number(amount.replace(/,/g, ''))
  const formattedAmount = Number.isFinite(numericAmount)
    ? formatGhs(numericAmount, 0)
    : `GHS ${amount}`

  return (
    <FeatureInsightLayout
      title={`${formattedAmount} gross salary`}
      tagline="Salary breakdown"
      description={`What PAYE and SSNIT look like on a ${formattedAmount} monthly gross salary in Ghana (2026 rates).`}
      icon={CreditCardIcon}
      iconBgColor="bg-emerald-500/20"
      image="/assets/ios/img-5.webp"
      highlights={[
        {
          title: '2026 GRA rates',
          description: `Tax bands and SSNIT rules applied to ${formattedAmount} gross.`,
        },
        {
          title: 'Net pay estimate',
          description: 'Run the free calculator for your exact take-home figure.',
        },
        {
          title: 'Compare payslip',
          description: 'Match these numbers against what HR deducts each month.',
        },
      ]}
    >
      <div className="mb-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 max-w-2xl">
        <p className="text-sm font-medium text-emerald-300 mb-2">
          Calculate {formattedAmount} take-home
        </p>
        <p className="text-sm text-zinc-300 leading-relaxed mb-4">
          Instant breakdown: SSNIT, PAYE, net salary. Five free checks per day on the web.
        </p>
        <Link
          to="/try-salary-calculator/$amount"
          params={{ amount }}
          className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
        >
          Calculate net pay
        </Link>
      </div>

      <h2>What happens to {formattedAmount}?</h2>
      <p>
        Your employer pays {formattedAmount} gross. Before money reaches you, two big deductions
        usually apply: <strong>SSNIT</strong> (pension) and <strong>PAYE</strong> (income tax). What
        is left is your net salary. That is the amount you should budget with.
      </p>
      <p>
        Higher gross pay can push more of your income into higher tax bands. A raise does not always
        mean the same percentage increase in take-home. Running the numbers avoids surprises.
      </p>

      <h2>Check against GRA</h2>
      <p>
        Compare your result with the{' '}
        <a
          href={GRA_PAYE_REFERENCE_URL}
          target="_blank"
          rel="noopener noreferrer"
        >
          official GRA PAYE tables
        </a>
        . If your payslip deducts more than the calculator shows, ask HR which tax table they use and
        whether allowances are coded correctly.
      </p>

      <h2>Plan from net pay</h2>
      <p>
        Once you know take-home from {formattedAmount}, use the{' '}
        <a href="/budgeting-tool">budgeting tool</a> for rent, food, transport, and savings. Net
        pay is the real starting point, not the gross on your offer letter.
      </p>
    </FeatureInsightLayout>
  )
}
