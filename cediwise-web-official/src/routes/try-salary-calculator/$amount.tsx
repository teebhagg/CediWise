'use client'

import { SalaryCalculatorWidget } from '@/components/calculator/SalaryCalculatorWidget'
import { Footer } from '@/components/layout/Footer'
import { formatGhs } from '@/lib/formatGhs'
import { MAX_GROSS_MONTHLY_SALARY } from '@/lib/ghanaTax'
import { createPageHead } from '@/lib/seo'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'

function parseAmountParam(amount: string): number | null {
  const n = Number(amount.replace(/,/g, ''))
  if (!Number.isFinite(n) || n <= 0 || n > MAX_GROSS_MONTHLY_SALARY) {
    return null
  }
  return Math.round(n)
}

export const Route = createFileRoute('/try-salary-calculator/$amount')({
  component: TrySalaryCalculatorAmountPage,
  head: ({ params }) => {
    const parsed = parseAmountParam(params.amount)
    const label =
      parsed != null
        ? formatGhs(parsed, 0)
        : `GHS ${params.amount}`
    return createPageHead({
      path: `/try-salary-calculator/${params.amount}`,
      title: `${label} Net Salary Calculator Ghana 2026`,
      description: `Calculate net take-home pay for a ${label} gross monthly salary in Ghana. See PAYE, SSNIT, and net salary using 2026 GRA rates.`,
    })
  },
})

function TrySalaryCalculatorAmountPage() {
  const { amount } = Route.useParams()
  const parsed = parseAmountParam(amount)
  const formatted =
    parsed != null ? formatGhs(parsed, 0) : `GHS ${amount}`

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50">
      <div className="pointer-events-none fixed inset-0 -z-10">
        <div className="absolute top-0 right-0 h-[500px] w-[60dvw] rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute bottom-1/4 left-0 h-[300px] w-[40dvw] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <main className="relative px-6 pb-24 pt-32">
        <div className="container mx-auto max-w-3xl">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-10"
          >
            <Link
              to="/salary-calculator/$amount"
              params={{ amount }}
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              About {formatted} salaries
            </Link>
          </motion.div>

          {parsed == null ? (
            <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-8 text-center">
              <p className="text-lg font-semibold text-white">
                Invalid salary amount
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                Enter a monthly gross between GHS 1 and{' '}
                {formatGhs(MAX_GROSS_MONTHLY_SALARY, 0)}.
              </p>
              <Link
                to="/try-salary-calculator"
                className="mt-6 inline-flex rounded-xl bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15"
              >
                Open salary calculator
              </Link>
            </div>
          ) : (
            <SalaryCalculatorWidget initialGross={parsed} autoRun />
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
