'use client'

import { DownloadAppDialog } from '@/components/download/DownloadAppDialog'
import { Footer } from '@/components/layout/Footer'
import { PricingPass } from '@/components/landing/PricingPass'
import { createPageHead } from '@/lib/seo'
import { cn } from '@/lib/utils'
import {
  ArrowRight01Icon,
  Cancel01Icon,
  Tick02Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import React, { useState } from 'react'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
  head: () =>
    createPageHead({
      path: '/pricing',
      title: 'Pricing',
      description:
        'Free salary calculator. Smart Budget from GH¢ 15/mo. SME Ledger from GH¢ 25/mo. 30-day free trial on paid plans.',
      extraLinks: [{ rel: 'alternate', type: 'text/markdown', href: '/pricing.md' }],
    }),
})

const comparisonFeatures = [
  {
    category: 'Salary & learning',
    features: [
      { name: '2026 PAYE & SSNIT calculator', free: true, budget: true, sme: true },
      { name: 'Financial literacy lessons', free: true, budget: true, sme: true },
      { name: 'Future GRA tax updates', free: true, budget: true, sme: true },
    ]
  },
  {
    category: 'Personal money',
    features: [
      { name: 'Budgeting & progress bars', free: false, budget: true, sme: true },
      { name: 'Debt dashboard & payoff plans', free: false, budget: true, sme: true },
      { name: 'Recurring bills & spending charts', free: false, budget: true, sme: true },
      { name: 'Offline mode', free: false, budget: true, sme: true },
    ]
  },
  {
    category: 'Business',
    features: [
      { name: 'Sales & expenses ledger', free: false, budget: false, sme: true },
      { name: 'Auto 20% VAT + GH¢ 750K alert', free: false, budget: false, sme: true },
      { name: 'CSV export for accountant', free: false, budget: false, sme: true },
      { name: 'Monthly profit summary', free: false, budget: false, sme: true },
    ]
  }
]

function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly'>('monthly')
  const [downloadPickerOpen, setDownloadPickerOpen] = useState(false)

  return (
    <div data-pricing-page className="min-h-screen bg-zinc-950 text-zinc-50">
      <main className="relative pb-24 pt-32">
        <div className="mx-auto max-w-[1120px] px-6 md:px-0">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-10 flex flex-col gap-7 text-left md:flex-row md:items-end md:justify-between"
          >
            <div className="max-w-[620px]">
              <h1 className="mb-4 text-[48px] font-medium leading-[1.04] tracking-[-0.055em] sm:text-[56px]">
                Simple pricing
              </h1>
              <p className="max-w-[520px] text-base leading-relaxed text-zinc-400">
                Salary calculator stays free forever.
                <br />
                Smart Budget and SME Ledger include a <span className="font-semibold text-emerald-400">30-day free trial</span>.
              </p>
            </div>

            <div className="flex shrink-0 md:pb-1">
              <div className="relative flex items-center rounded-full border border-white/10 bg-white/5 p-1">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    'relative z-10 w-32 py-2.5 text-sm font-medium transition-colors duration-200',
                    billingCycle === 'monthly' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('quarterly')}
                  className={cn(
                    'relative z-10 w-32 py-2.5 text-sm font-medium transition-colors duration-200',
                    billingCycle === 'quarterly' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  Quarterly
                  <span className="absolute right-1 -top-3 rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2 py-0.5 text-[10px] text-emerald-300">Save 13%</span>
                </button>
                <motion.div
                  className="absolute bottom-1 top-1 w-32 rounded-full bg-white/10 shadow-[0_1px_3px_rgba(0,0,0,0.24)]"
                  animate={{ left: billingCycle === 'monthly' ? 4 : 132 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              </div>
            </div>
          </motion.div>

          <div className="mx-auto grid max-w-[1120px] gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* FREE TIER */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="flex min-h-[760px] flex-col rounded-[28px] border border-white/10 bg-[#101613] p-[30px] pt-9 text-white shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
            >
              <PricingPass name="Free" variant="free" />
              <div className="mt-10 flex flex-1 flex-col">
                <h2 className="text-[22px] font-medium tracking-[-0.035em]">Free</h2>
                <div className="mt-5 flex items-baseline gap-2">
                  <span className="text-5xl font-medium leading-none tracking-[-0.065em]">GH¢ 0</span>
                  <span className="text-sm text-zinc-400">/forever</span>
                </div>
                <p className="mt-3 text-sm text-zinc-300">PAYE &amp; SSNIT calculator + lessons</p>
                <ul className="mt-8 space-y-4 text-sm text-zinc-300">
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> 2026 PAYE &amp; SSNIT calculator</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Financial literacy lessons</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> GRA rate updates</li>
                  <li className="flex items-center gap-3 text-zinc-500"><HugeiconsIcon icon={Cancel01Icon} className="size-5 shrink-0 text-zinc-600" /> Budget, debt, SME ledger</li>
                </ul>
              </div>
              <Link
                to="/try-salary-calculator"
                className="mt-auto inline-flex w-full items-center justify-between rounded-full border border-white/10 bg-white/5 px-5 py-4 font-semibold text-white transition-colors hover:bg-white/10"
              >
                Try free calculator
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
              </Link>
            </motion.div>

            {/* BUDGET TIER */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
                  className="flex min-h-[760px] flex-col rounded-[28px] border border-emerald-500/25 bg-[#0b2118] p-[30px] pt-9 text-white shadow-[0_14px_44px_rgba(5,150,105,0.16)]"
            >
              <PricingPass name="Smart Budget" variant="budget" />
              <div className="mt-10 flex flex-1 flex-col">
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-[22px] font-medium tracking-[-0.035em]">Smart Budget</h2>
                  <span className="rounded-full border border-emerald-400/25 bg-emerald-500/15 px-2.5 py-1 text-[9px] font-semibold tracking-[0.11em] text-emerald-300">MOST POPULAR</span>
                </div>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-5xl font-medium leading-none tracking-[-0.065em]">
                    {billingCycle === 'monthly' ? 'GH¢ 15' : 'GH¢ 39'}
                  </span>
                  <span className="text-sm font-medium text-zinc-400">
                    {billingCycle === 'monthly' ? '/month' : '/quarter'}
                  </span>
                </div>
                <div className="mt-2 min-h-[20px] text-sm text-zinc-400">
                  {billingCycle === 'monthly' ? (
                    <>or <span className="font-medium text-emerald-800">GH¢ 39/quarter</span> (save 13%)</>
                  ) : (
                    <>Billed every 3 months</>
                  )}
                </div>
                <p className="mt-3 text-sm text-zinc-300">Budget, debt, charts, offline</p>
                <p className="mt-1 text-xs text-emerald-200/75">One caught payslip error can cover a year.</p>

                <ul className="mt-8 space-y-4 text-sm text-zinc-300">
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Everything in Free</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Budgeting &amp; safe-to-spend</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Debt dashboard</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Spending charts</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Offline mode</li>
                </ul>
              </div>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={downloadPickerOpen}
                onClick={() => setDownloadPickerOpen(true)}
                className="mt-auto inline-flex w-full items-center justify-between rounded-full bg-emerald-600 px-5 py-4 font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Start 30-day trial
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
              </button>
            </motion.div>

            {/* SME TIER */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex min-h-[760px] flex-col rounded-[28px] border border-white/10 bg-[#101613] p-[30px] pt-9 text-white shadow-[0_16px_40px_rgba(0,0,0,0.25)] md:col-span-2 md:mx-auto md:w-1/2 lg:col-span-1 lg:mx-0 lg:w-full"
            >
              <PricingPass name="SME Ledger" variant="sme" />
              <div className="mt-10 flex flex-1 flex-col">
                <h2 className="text-[22px] font-medium tracking-[-0.035em]">SME Ledger</h2>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-5xl font-medium leading-none tracking-[-0.065em]">
                    {billingCycle === 'monthly' ? 'GH¢ 25' : 'GH¢ 65'}
                  </span>
                  <span className="text-sm font-medium text-zinc-400">
                    {billingCycle === 'monthly' ? '/month' : '/quarter'}
                  </span>
                </div>
                <div className="mt-2 min-h-[20px] text-sm text-zinc-400">
                  {billingCycle === 'monthly' ? (
                    <>or <span className="font-medium text-emerald-800">GH¢ 65/quarter</span> (save 13%)</>
                  ) : (
                    <>Billed every 3 months</>
                  )}
                </div>
                <p className="mt-3 text-sm text-zinc-300">Business ledger + everything above</p>
                <p className="mt-1 text-xs text-emerald-200/75">One GRA penalty costs more than years of this.</p>

                <ul className="mt-8 space-y-4 text-sm text-zinc-300">
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Everything in Budget tier</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Sales &amp; expenses ledger</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Auto 20% VAT + GH¢ 750k alert</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> CSV export for accountant</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-emerald-400" /> Monthly P&amp;L summary</li>
                  <li className="flex items-center gap-3 text-zinc-500"><HugeiconsIcon icon={Tick02Icon} className="size-5 shrink-0 text-zinc-600" /> Invoices &amp; GRA Export <span className="ml-auto rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-zinc-400">Coming Q2</span></li>
                </ul>
              </div>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={downloadPickerOpen}
                onClick={() => setDownloadPickerOpen(true)}
                className="mt-auto inline-flex w-full items-center justify-between rounded-full bg-emerald-600 px-5 py-4 font-semibold text-white transition-colors hover:bg-emerald-500"
              >
                Start 30-day trial
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
              </button>
            </motion.div>
          </div>

          <div className="mx-auto mt-5 flex max-w-[1120px] flex-col gap-2 text-sm leading-relaxed text-zinc-400 md:flex-row md:justify-between">
            <p>Cancel anytime · Prices in GH¢ only</p>
            <p>
              <span className="font-semibold text-emerald-400">Worth it?</span> Smart Budget is GH¢ 180/year. Catching one wrong PAYE deduction often saves more than that.
            </p>
          </div>

          <DownloadAppDialog
            open={downloadPickerOpen}
            onOpenChange={setDownloadPickerOpen}
          />

          {/* DETAILED COMPARISON TABLE */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="mb-16 mt-20 overflow-hidden rounded-[28px] border border-white/10 bg-[#101613] text-white shadow-[0_16px_40px_rgba(0,0,0,0.25)]"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-white/5">
                    <th className="w-2/5 py-6 px-8 text-sm font-semibold uppercase tracking-wider text-zinc-400">Features</th>
                    <th className="w-1/5 py-6 px-6 text-center text-lg font-semibold text-white">Free</th>
                    <th className="w-1/5 bg-emerald-500/15 py-6 px-6 text-center text-lg font-semibold text-emerald-300">Budget</th>
                    <th className="w-1/5 py-6 px-6 text-center text-lg font-semibold text-white">SME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/10">
                  {comparisonFeatures.map((section, idx) => (
                    <React.Fragment key={idx}>
                      <tr className="bg-white/5">
                        <td colSpan={4} className="py-4 px-8 text-xs font-bold uppercase tracking-widest text-emerald-300">
                          {section.category}
                        </td>
                      </tr>
                      {section.features.map((feature, fIdx) => (
                        <tr key={fIdx} className="transition-colors duration-200 hover:bg-white/5">
                          <td className="py-5 px-8 text-sm font-medium text-zinc-300">
                            {feature.name}
                          </td>
                          <td className="py-5 px-6 text-center">
                            {feature.free ? (
                              <HugeiconsIcon icon={Tick02Icon} className="mx-auto size-5 text-emerald-400" />
                            ) : (
                              <HugeiconsIcon icon={Cancel01Icon} className="mx-auto size-5 text-zinc-600" />
                            )}
                          </td>
                          <td className="bg-emerald-500/10 py-5 px-6 text-center">
                            {feature.budget ? (
                              <HugeiconsIcon icon={Tick02Icon} className="mx-auto size-5 text-emerald-400" />
                            ) : (
                              <HugeiconsIcon icon={Cancel01Icon} className="mx-auto size-5 text-zinc-600" />
                            )}
                          </td>
                          <td className="py-5 px-6 text-center">
                            {feature.sme ? (
                              <HugeiconsIcon icon={Tick02Icon} className="mx-auto size-5 text-emerald-400" />
                            ) : (
                              <HugeiconsIcon icon={Cancel01Icon} className="mx-auto size-5 text-zinc-600" />
                            )}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>

          {/* TRIAL TERMS BAR */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative"
          >
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="max-w-xl bg-zinc-950 px-4 text-center text-sm text-zinc-400">
                <strong className="text-emerald-400">30-day free trial</strong> on Smart Budget and SME Ledger.
                <br />
                After that, pay only if you want to keep premium tools. Cancel anytime.
              </span>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
