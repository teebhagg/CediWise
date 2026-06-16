import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { createPageHead } from '@/lib/seo'
import { Book04Icon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financial-literacy')({
  component: FinancialLiteracyPage,
  head: () =>
    createPageHead({
      path: '/financial-literacy',
      title: 'Learn while you grow',
      description:
        'Short money lessons for Ghana: budgeting, MoMo fees, savings, scams, and PAYE basics. Most under five minutes. Free.',
    }),
})

const highlights = [
  {
    title: 'Short lessons',
    description:
      'Most take under five minutes. Read on the bus, between meetings, or before bed.',
  },
  {
    title: 'Ghana-first topics',
    description:
      'MTN MoMo, Vodafone Cash, Treasury Bills, GSE, local banks, PAYE, SSNIT.',
  },
  {
    title: 'No finance degree',
    description:
      'Plain language. We explain terms when we use them.',
  },
  {
    title: 'One small action',
    description:
      'Each lesson ends with something you can do today, not just theory.',
  },
  {
    title: 'Growing library',
    description:
      'New lessons added over time. Budgeting, saving, fraud, investing basics.',
  },
  {
    title: 'Free',
    description:
      'Learning about money should not cost money. All lessons are free in the app.',
  },
]

function FinancialLiteracyPage() {
  return (
    <FeatureInsightLayout
      title="Learn while you grow."
      tagline="Lessons"
      description="Practical financial education for everyday decisions. Written for Ghana, not copied from abroad."
      icon={Book04Icon}
      iconBgColor="bg-orange-500/30"
      image="/assets/ios/img-3.webp"
      highlights={highlights}
    >
      <h2>What this is</h2>
      <p>
        A library of bite-sized lessons inside CediWise. Not a course you need weeks to finish. Pick a
        topic, read for a few minutes, try one action. Topics match how people actually handle money
        here: mobile money, salary deductions, saving in cedis, avoiding scams.
      </p>

      <h2>What you will learn</h2>
      <p>
        <strong>Budgeting.</strong> How to build a first monthly plan, track spending, and adapt the
        50/30/20 rule for Ghanaian incomes.
      </p>
      <p>
        <strong>Savings.</strong> Emergency funds, bank savings vs Treasury Bills, why a buffer matters
        before you invest.
      </p>
      <p>
        <strong>Mobile money.</strong> How MoMo works, typical fees, daily limits, and how to avoid
        paying more than you need to.
      </p>
      <p>
        <strong>Fraud and safety.</strong> Common scams, phishing, fake investment pitches, and how to
        protect your MoMo PIN.
      </p>

      <h2>How it fits the app</h2>
      <p>
        Lessons connect to the tools. Read about PAYE, then run your salary through the calculator.
        Learn about VAT, then open the SME ledger. Education and action in one place.
      </p>

      <h2>Who this helps</h2>
      <p>
        First job earners who never got formal money education. Side hustlers who need VAT and record
        basics. Anyone who wants clear answers without paying for a seminar.
      </p>
    </FeatureInsightLayout>
  )
}
