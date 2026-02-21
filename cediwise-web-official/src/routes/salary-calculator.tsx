import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { CreditCardIcon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/salary-calculator')({
  component: SalaryCalculatorPage,
  head: () => ({
    meta: [
      { title: 'Salary Calculator — CediWise' },
      {
        name: 'description',
        content:
          'Calculate SSNIT, PAYE, and net take-home for Ghana. Know exactly what stays in your pocket after all deductions.',
      },
    ],
  }),
})

const highlights = [
  {
    title: 'SSNIT & PAYE',
    description:
      'Automatic calculation of SSNIT contributions and PAYE tax based on current Ghana Revenue Authority (GRA) rates.',
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
    <FeatureInsightLayout
      title="Salary Calculator"
      tagline="Salary & Tax"
      description="Calculate SSNIT, PAYE, and net take-home for Ghana 2026. Know exactly what stays in your pocket after all deductions."
      icon={CreditCardIcon}
      iconBgColor="bg-emerald-500/20"
      image="/assets/img_1.png"
      highlights={highlights}
    >
      <h2>How it works</h2>
      <p>
        Enter your gross monthly salary and the CediWise salary calculator
        applies the correct SSNIT (tier 1 & 2) and PAYE rates according to GRA
        guidelines. You get an instant breakdown showing exactly how much goes
        to tax, pension, and your pocket.
      </p>

      <h2>Built for Ghana</h2>
      <p>
        Our calculator uses the latest Ghana Revenue Authority tax tables and
        SSNIT contribution rates. Whether you&apos;re a first-time earner or
        managing a growing income, you&apos;ll have clarity on your finances.
      </p>

      <h2>Why it matters</h2>
      <p>
        Understanding your take-home pay is the first step to budgeting and
        saving. Many Ghanaians are surprised by the gap between gross and net
        salary. With CediWise, there are no surprises — just clarity and
        control.
      </p>
    </FeatureInsightLayout>
  )
}
