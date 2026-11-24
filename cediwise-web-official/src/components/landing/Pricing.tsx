'use client'

import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { CEDIWISE_ANDROID_PLAY_STORE_URL } from '@/lib/storeLinks'
import { PricingPass } from './PricingPass'

const cardClassName =
  'flex min-h-[560px] flex-col rounded-[28px] border border-white/10 bg-[#101613] p-[30px] pt-9 text-white shadow-[0_16px_40px_rgba(0,0,0,0.25)]'

const actionClassName =
  'mt-auto inline-flex w-full items-center justify-between rounded-full bg-emerald-600 px-5 py-3.5 text-sm font-semibold text-white transition-colors duration-200 hover:bg-emerald-500'

export function Pricing() {
  return (
    <section className="relative isolate overflow-hidden bg-background py-24 text-zinc-50 lg:py-32">
      <div className="mx-auto max-w-[1120px] px-6 md:px-0">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-left"
        >
          <h2 className="mb-4 text-4xl font-medium tracking-[-0.055em] sm:text-[56px] sm:leading-[1.04]">
            Simple pricing
          </h2>
          <p className="max-w-[430px] text-base leading-relaxed text-zinc-400">
            Salary calculator stays free. Budgeting and business tools live in the app.
          </p>
        </motion.div>

        <div className="mx-auto mb-14 grid max-w-[1120px] gap-6 md:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className={cardClassName}
          >
            <PricingPass name="Free" variant="free" />
            <div className="mt-11 flex flex-1 flex-col">
              <h3 className="text-[22px] font-medium tracking-[-0.035em]">Free</h3>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-medium leading-none tracking-[-0.065em]">GH¢ 0</span>
                <span className="text-sm text-zinc-400">/forever</span>
              </div>
              <p className="mt-3 text-sm text-zinc-300">PAYE &amp; SSNIT calculator only</p>
              <Link to="/try-salary-calculator" className={actionClassName}>
                Try the calculator
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
              </Link>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.16 }}
            className="flex min-h-[560px] flex-col rounded-[28px] border border-emerald-500/25 bg-[#0b2118] p-[30px] pt-9 text-white shadow-[0_14px_44px_rgba(5,150,105,0.16)]"
          >
            <PricingPass name="Smart Budget" variant="budget" />
            <div className="mt-11 flex flex-1 flex-col">
              <div className="flex flex-wrap items-center gap-3">
                <h3 className="text-[22px] font-medium tracking-[-0.035em]">Smart Budget</h3>
                <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[9px] font-semibold tracking-[0.11em] text-emerald-800">
                  MOST POPULAR
                </span>
              </div>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-medium leading-none tracking-[-0.065em]">GH¢ 15</span>
                <span className="text-sm text-zinc-400">/mo</span>
              </div>
              <p className="mt-3 text-sm text-zinc-300">Budget, debt, recurring bills, insights</p>
              <a
                href={CEDIWISE_ANDROID_PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={actionClassName}
              >
                Start free trial
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
              </a>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.24 }}
            className={cardClassName}
          >
            <PricingPass name="SME Ledger" variant="sme" />
            <div className="mt-11 flex flex-1 flex-col">
              <h3 className="text-[22px] font-medium tracking-[-0.035em]">SME Ledger</h3>
              <div className="mt-5 flex items-baseline gap-2">
                <span className="text-5xl font-medium leading-none tracking-[-0.065em]">GH¢ 25</span>
                <span className="text-sm text-zinc-400">/mo</span>
              </div>
              <p className="mt-3 text-sm text-zinc-300">Business sales, expenses, tax prep</p>
              <a
                href={CEDIWISE_ANDROID_PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={actionClassName}
              >
                Get SME Ledger
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
              </a>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex justify-start"
        >
          <Link
            to="/pricing"
            className="inline-flex items-center gap-3 rounded-full border border-emerald-400/25 bg-white/5 px-6 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500/15"
          >
            See pricing details
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
