import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { createPageHead, getAppSchema, getFAQSchema } from '@/lib/seo'
import { CreditCardIcon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'
import { GlassCard } from '@/components/ui/glass-card'
import { HugeiconsIcon as HugeIcon } from '@hugeicons/react'

export const Route = createFileRoute('/salary-calculator/$amount')({
  component: DynamicSalaryPage,
  head: ({ params }) => {
    const amount = params.amount
    const formattedAmount = `GHS ${amount}`
    return createPageHead({
      path: `/salary-calculator/${amount}`,
      title: `Salary Calculator for ${formattedAmount} — Ghana 2026 PAYE/SSNIT`,
      description: `Calculate the exact take-home pay for a gross salary of ${formattedAmount} in Ghana. See SSNIT, PAYE tax, and net salary breakdown using 2026 rates.`,
      schemas: [
        getAppSchema(),
        getFAQSchema([
          {
            question: `What is the PAYE tax on ${formattedAmount} in Ghana?`,
            answer: `The PAYE tax on ${formattedAmount} is calculated based on the 2026 GRA tax bands. CediWise provides the exact step-by-step breakdown of these deductions.`,
          },
          {
            question: `How much SSNIT is deducted from ${formattedAmount}?`,
            answer: `SSNIT deductions (Tier 1 & Tier 2) are automatically calculated for a ${formattedAmount} gross salary to ensure you know your statutory pension contributions.`,
          },
        ]),
      ],
    })
  },
})

function DynamicSalaryPage() {
  const { amount } = Route.useParams()
  const formattedAmount = `GHS ${Number(amount).toLocaleString()}`

  return (
    <FeatureInsightLayout
      title={`Salary: ${formattedAmount}`}
      tagline="Custom Breakdown"
      description={`Detailed 2026 tax and pension breakdown for a monthly gross salary of ${formattedAmount}.`}
      icon={CreditCardIcon}
      iconBgColor="bg-emerald-500/20"
      image="/assets/android/img-11.webp"
      highlights={[
        {
          title: 'Precision Taxing',
          description: `Exact PAYE calculations for the ${formattedAmount} bracket based on current GRA laws.`,
        },
        {
          title: 'Pension Security',
          description: 'Tier 1 and Tier 2 contributions clearly separated for your future planning.',
        },
      ]}
    >
      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <GlassCard
          label="Estimated Net Pay"
          value="Calculated in App"
          icon={<HugeIcon icon={CreditCardIcon} size={20} />}
          iconBgColor="bg-emerald-500/20"
          iconColor="text-emerald-500"
        />
        <GlassCard
          label="Statutory Deductions"
          value="See Breakdown"
          icon={<HugeIcon icon={CreditCardIcon} size={20} />}
          iconBgColor="bg-rose-500/20"
          iconColor="text-rose-500"
        />
      </div>

      <div className="mt-12 space-y-6">
        <h2>Why check {formattedAmount}?</h2>
        <p>
          Moving into the {formattedAmount} salary bracket often triggers higher tax bands in Ghana. 
          It's essential to know how much of this increase translates into actual spending power versus 
          statutory deductions like SSNIT and PAYE.
        </p>
        
        <h2>Optimizing your budget</h2>
        <p>
          With a net income derived from {formattedAmount}, you can effectively use the 
          <a href="/budgeting-tool" className="text-primary hover:underline ml-1">CediWise Budgeting Tool</a> 
          to allocate funds for rent, utilities, and savings without overstretching.
        </p>
      </div>
    </FeatureInsightLayout>
  )
}
