import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { createPageHead, getAppSchema, getFAQSchema } from '@/lib/seo'
import { CreditCardIcon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/salary-calculator/')({
  component: SalaryCalculatorPage,
  head: () =>
    createPageHead({
      path: '/salary-calculator',
      title: 'Salary Calculator — Is Your Employer Deducting the Right Amount?',
      description:
        'Is your employer calculating your PAYE and SSNIT correctly? Verify your deductions against current GRA rates in seconds. Know exactly what your take-home pay is. Free Ghana salary calculator.',
      schemas: [
        getAppSchema(),
        getFAQSchema([
          {
            question: 'How does CediWise calculate PAYE tax in Ghana?',
            answer:
              'CediWise applies the official Ghana Revenue Authority (GRA) tax bands for the selected year to your gross monthly salary, then computes PAYE step-by-step according to each band.',
          },
          {
            question: 'Does the salary calculator include SSNIT contributions?',
            answer:
              'Yes. The calculator includes SSNIT tier 1 and tier 2 pension contributions, so your net take-home reflects both tax and statutory pension deductions.',
          },
          {
            question: 'Can I use the CediWise salary calculator for Ghana 2026 tax rates?',
            answer:
              'Yes. The CediWise salary calculator is built for Ghana 2026 tax brackets and thresholds, using the latest available GRA tables for that year.',
          },
          {
            question: 'Can I export or share my salary breakdown from CediWise?',
            answer:
              'CediWise is designed so that your salary breakdown can be saved or shared, making it useful for personal records, budgeting, and supporting loan or rental applications.',
          },
        ]),
      ],
    }),
})

const highlights = [
  {
    title: 'SSNIT & PAYE',
    description:
      'Automatic calculation of Social Security and National Insurance Trust (SSNIT) contributions and Pay As You Earn (PAYE) tax based on current Ghana Revenue Authority (GRA) rates.',
  },
  {
    title: 'Net take-home',
    description:
      'See your exact take-home pay after all statutory deductions. No surprises on payday.',
  },
  {
    title: 'GHS 2026 rates',
    description:
      'Built for Ghana 2026 tax brackets and thresholds. Stay compliant with the latest regulations.',
  },
  {
    title: 'Salary breakdown',
    description:
      'Clear breakdown of gross salary, SSNIT, tier-2, PAYE, and net salary at a glance.',
  },
  {
    title: 'Multiple scenarios',
    description:
      'Compare different salary levels and understand how deductions change as income grows.',
  },
  {
    title: 'Export & share',
    description:
      'Save or share your salary breakdown for record-keeping or loan applications.',
  },
]

function SalaryCalculatorPage() {
  return (
    <>
      <FeatureInsightLayout
        title="Is Your Employer Deducting the Right Amount?"
        tagline="Salary & Tax"
        description="Verify your PAYE and SSNIT against official GRA rates in seconds. If your employer is over-deducting, you're losing money every single month."
        icon={CreditCardIcon}
        iconBgColor="bg-emerald-500/20"
        image="/assets/ios/img-5.webp"
        highlights={highlights}
      >
        <div className="mb-10 rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-5 max-w-2xl">
          <p className="text-sm font-medium text-emerald-300 mb-2">
            Verify employer deductions (PAYE & SSNIT)
          </p>
          <p className="text-sm text-zinc-300 leading-relaxed mb-4">
            Enter what your employer says they deduct and compare to GRA-mandated amounts — with
            shareable results — in the free CediWise mobile app.
          </p>
          <a
            href="https://play.google.com/store/apps/details?id=com.cediwise.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-500 transition-colors"
          >
            Get CediWise on Android
          </a>
        </div>

        <h2>How it works</h2>
        <p>
          Enter your gross monthly salary and the CediWise salary calculator applies the correct SSNIT
          (Social Security tier 1 & 2) and PAYE (Income Tax) rates according to Ghana Revenue Authority (GRA) guidelines. You
          get an instant breakdown showing exactly how much goes to tax, pension, and your pocket.
        </p>

        <h2>Built for Ghana</h2>
        <p>
          Our calculator uses the latest Ghana Revenue Authority tax tables and SSNIT contribution
          rates. Whether you&apos;re a first-time earner or managing a growing income, you&apos;ll have
          clarity on your finances.
        </p>

        <h2>Why it matters</h2>
        <p>
          Employer PAYE errors are more common than most workers realise. A miscalculated tax band,
          an incorrect SSNIT cap, or a misapplied allowance can cost you hundreds of cedis per month
          — silently, month after month. CediWise applies the exact GRA formula so you can see in
          seconds whether the numbers match.
        </p>

        <h2>Works best with</h2>
        <ul>
          <li>
            <a href="/budgeting-tool">Budgeting Tool</a> to turn your net salary into a clear monthly
            plan.
          </li>
          <li>
            <a href="/sme-ledger">SME Ledger</a> if you run a side business and want a full view of
            income.
          </li>
        </ul>
      </FeatureInsightLayout>
    </>
  )
}
