import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { absoluteUrl, createPageHead } from '@/lib/seo'
import { CreditCardIcon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/salary-calculator')({
  component: SalaryCalculatorPage,
  head: () =>
    createPageHead({
      path: '/salary-calculator',
      title: 'Salary Calculator',
      description:
        'Calculate SSNIT (Social Security), PAYE (Income Tax), and net take-home for Ghana. Know exactly what stays in your pocket after all deductions.',
    }),
})

const FAQ_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: [
    {
      '@type': 'Question',
      name: 'How does CediWise calculate PAYE tax in Ghana?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CediWise applies the official Ghana Revenue Authority (GRA) tax bands for the selected year to your gross monthly salary, then computes PAYE step-by-step according to each band.',
      },
    },
    {
      '@type': 'Question',
      name: 'Does the salary calculator include SSNIT contributions?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The calculator includes SSNIT tier 1 and tier 2 pension contributions, so your net take-home reflects both tax and statutory pension deductions.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I use the CediWise salary calculator for Ghana 2026 tax rates?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'Yes. The CediWise salary calculator is built for Ghana 2026 tax brackets and thresholds, using the latest available GRA tables for that year.',
      },
    },
    {
      '@type': 'Question',
      name: 'Can I export or share my salary breakdown from CediWise?',
      acceptedAnswer: {
        '@type': 'Answer',
        text: 'CediWise is designed so that your salary breakdown can be saved or shared, making it useful for personal records, budgeting, and supporting loan or rental applications.',
      },
    },
  ],
} as const

const APP_JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'CediWise Salary Calculator',
  applicationCategory: 'FinanceApplication',
  operatingSystem: 'Android, iOS',
  url: absoluteUrl('/salary-calculator'),
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
        title="Salary Calculator"
        tagline="Salary & Tax"
        description="Calculate SSNIT (Social Security), PAYE (Income Tax), and net take-home for Ghana 2026. Know exactly what stays in your pocket after all deductions."
        icon={CreditCardIcon}
        iconBgColor="bg-emerald-500/20"
        image="/assets/android/img-11.webp"
        highlights={highlights}
      >
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
          Understanding your take-home pay is the first step to budgeting and saving. Many Ghanaians
          are surprised by the gap between gross and net salary. With CediWise, there are no surprises —
          just clarity and control.
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

      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSON_LD) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(APP_JSON_LD) }}
      />
    </>
  )
}
