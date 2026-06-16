'use client'

import { SalaryCalculatorWidget } from '@/components/calculator/SalaryCalculatorWidget'
import { Footer } from '@/components/layout/Footer'
import { createPageHead } from '@/lib/seo'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/try-salary-calculator/')({
  component: TrySalaryCalculatorPage,
  head: () =>
    createPageHead({
      path: '/try-salary-calculator',
      title: 'Try free salary calculator — Ghana 2026',
      description:
        'Enter gross pay, see SSNIT, PAYE, and net take-home. 2026 GRA rates. Five free checks per day on the web.',
    }),
})

function TrySalaryCalculatorPage() {
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
              to="/salary-calculator"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              Salary &amp; tax guide
            </Link>
          </motion.div>

          <SalaryCalculatorWidget />
        </div>
      </main>

      <Footer />
    </div>
  )
}
