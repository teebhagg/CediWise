import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { GRA_PAYE_REFERENCE_URL } from '@/lib/ghanaTax'
import { createPageHead, getAppSchema, getFAQSchema } from '@/lib/seo'
import { CreditCardIcon } from '@hugeicons/core-free-icons'
import { createFileRoute, Link } from '@tanstack/react-router'

export const Route = createFileRoute('/salary-calculator/')({
  component: SalaryCalculatorPage,
  head: () =>
    createPageHead({
      path: '/salary-calculator',
      title: 'Understand your salary',
      description:
        'How PAYE, SSNIT, and take-home pay work in Ghana. Check your numbers against 2026 GRA tables. Free web calculator.',
      schemas: [
        getAppSchema(),
        getFAQSchema([
          {
            question: 'How does CediWise calculate PAYE in Ghana?',
            answer:
              'We apply the official GRA monthly tax bands for 2026 to your gross salary, step by step through each bracket, then subtract SSNIT to show net pay.',
          },
          {
            question: 'Does the calculator include SSNIT?',
            answer:
              'Yes. Employee SSNIT (5.5%) and tier 2 pension are included so net pay reflects both tax and statutory deductions.',
          },
          {
            question: 'Can I check my salary for free on the web?',
            answer:
              'Yes. Use the try salary calculator for five free checks per day. The app offers unlimited checks and saved breakdowns.',
          },
        ]),
      ],
    }),
})

const highlights = [
  {
    title: 'PAYE explained',
    description:
      'Pay As You Earn is income tax taken from your salary before you receive it. Bands depend on how much you earn.',
  },
  {
    title: 'SSNIT explained',
    description:
      'Social Security deduction (5.5% from you) plus pension tier 2. Goes to your retirement account.',
  },
  {
    title: 'Net take-home',
    description:
      'What actually hits your bank or MoMo after deductions. The number that matters for budgeting.',
  },
  {
    title: '2026 GRA tables',
    description:
      'Built on current Ghana Revenue Authority rates. Updated when GRA publishes changes.',
  },
  {
    title: 'Compare salaries',
    description:
      'See how deductions change when gross pay goes up. Useful for job offers and negotiations.',
  },
  {
    title: 'Free web check',
    description:
      'Five calculations per day on the website. Unlimited in the app.',
  },
]

function SalaryCalculatorPage() {
  return (
    <>
      <FeatureInsightLayout
        title="Understand your salary."
        tagline="Salary & tax"
        description="Verify PAYE, SSNIT, and take-home pay. See if your payslip matches what GRA expects."
        icon={CreditCardIcon}
        iconBgColor="bg-emerald-500/20"
        image="/assets/ios/img-5.webp"
        highlights={highlights}
      >
        <div className="mb-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 max-w-2xl">
          <p className="text-sm font-medium text-emerald-300 mb-2">
            Try it now (free)
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed mb-4">
            Type your gross monthly salary. The calculator shows SSNIT, PAYE, and net pay using 2026
            GRA tables. Five free runs per day on the web.
          </p>
          <Link
            to="/try-salary-calculator"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            Check my pay
          </Link>
        </div>

        <h2>What PAYE and SSNIT mean</h2>
        <p>
          <strong>Gross salary</strong> is what your employer agrees to pay before deductions.
          <strong> SSNIT</strong> is your mandatory pension contribution (5.5% of gross, within the
          cap GRA sets). <strong>PAYE</strong> is income tax calculated on what is left after SSNIT,
          using progressive bands: lower income pays a lower rate, higher chunks pay more.
        </p>
        <p>
          <strong>Net pay</strong> is what you receive. If HR uses wrong bands or forgets an
          allowance, you can be shortchanged every month without noticing.
        </p>

        <h2>How the calculator works</h2>
        <p>
          Enter gross monthly pay in cedis. CediWise runs the same steps GRA describes: deduct
          employee SSNIT, apply tier 2 pension, calculate PAYE on chargeable income, show net
          take-home. You get a line-by-line breakdown, not just a single number.
        </p>

        <h2>When to double-check your payslip</h2>
        <p>
          New job or raise. First payslip after a promotion. Employer uses an old tax table. You
          have allowances (transport, rent) that should reduce taxable income. Any time the net
          amount feels off compared to last month.
        </p>

        <h2>Official reference</h2>
        <p>
          For the published PAYE bands, see the{' '}
          <a
            href={GRA_PAYE_REFERENCE_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            GRA PAYE reference page
          </a>
          . CediWise is not affiliated with GRA. Use the calculator as a guide and confirm with HR
          or a tax professional for complex cases.
        </p>

        <h2>Next steps</h2>
        <ul>
          <li>
            <Link to="/try-salary-calculator">Run the free calculator</Link>
          </li>
          <li>
            <a href="/budgeting-tool">Plan spending</a> from your real net pay
          </li>
          <li>
            <a href="/financial-literacy">Read lessons</a> on PAYE and saving
          </li>
        </ul>
      </FeatureInsightLayout>
    </>
  )
}
