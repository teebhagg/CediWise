'use client'

import { DownloadAppDialog } from '@/components/download/DownloadAppDialog'
import { Footer } from '@/components/layout/Footer'
import { createPageHead } from '@/lib/seo'
import { cn } from '@/lib/utils'
import { ArrowLeft01Icon, Cancel01Icon, Tick02Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import React, { useState } from 'react'

export const Route = createFileRoute('/pricing')({
  component: PricingPage,
  head: () =>
    createPageHead({
      path: '/pricing',
      title: 'Pricing — CediWise',
      description: 'Pricing that makes sense. Full breakdown of Free, Budget, and SME Ledger tiers.',
    }),
})

const comparisonFeatures = [
  {
    category: 'Calculators & Education',
    features: [
      { name: '2026 PAYE & SSNIT (incl. NHIS)', free: true, budget: true, sme: true },
      { name: 'Free Financial Education Modules', free: true, budget: true, sme: true },
      { name: 'Future GRA Tax Updates', free: true, budget: true, sme: true },
    ]
  },
  {
    category: 'Wealth Management',
    features: [
      { name: 'Smart Budgeting & Progress Bars', free: false, budget: true, sme: true },
      { name: 'Debt Dashboard & Payoff Plans', free: false, budget: true, sme: true },
      { name: 'Recurring Expenses & Insights', free: false, budget: true, sme: true },
      { name: 'Offline Mode + Charts', free: false, budget: true, sme: true },
    ]
  },
  {
    category: 'Business & Accounting',
    features: [
      { name: 'Sales & Expenses Ledger', free: false, budget: false, sme: true },
      { name: 'Auto 20% VAT + GHS 750k Alert', free: false, budget: false, sme: true },
      { name: 'CSV Export for Accountant', free: false, budget: false, sme: true },
      { name: 'Monthly P&L Summary', free: false, budget: false, sme: true },
    ]
  }
]

function PricingPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly'>('monthly')
  const [downloadPickerOpen, setDownloadPickerOpen] = useState(false)

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50">
      {/* Background Glows */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 h-[500px] w-[60dvw] rounded-full bg-emerald-500/10 blur-[140px]" />
        <div className="absolute bottom-1/3 left-0 h-[300px] w-[40dvw] rounded-full bg-emerald-500/5 blur-[100px]" />
      </div>

      <main className="relative pt-32 pb-24">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-8"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-white"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              Back to home
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center mb-16"
          >
            <h1 className="text-4xl font-bold tracking-tight text-white mb-6 sm:text-5xl">
              Pricing that makes sense
            </h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
              Free salary calculator forever.<br />
              <span className="font-semibold text-emerald-400">First 100 users get 60 days full access FREE.</span><br />
              Everyone else gets 30 days free.
            </p>

            <div className="mt-8 flex items-center justify-center">
              <div className="inline-flex items-center gap-3 backdrop-blur-md bg-white/5 border border-white/10 text-zinc-300 text-sm px-4 py-2 rounded-full">
                <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold px-3 py-1 rounded-full">LAUNCH PROMO</span>
                Cancel anytime • No hidden fees • Ghana cedi only
              </div>
            </div>

            <div className="mt-10 flex justify-center">
              <div className="relative flex items-center p-1 bg-white/5 backdrop-blur-md border border-white/10 rounded-full">
                <button
                  onClick={() => setBillingCycle('monthly')}
                  className={cn(
                    'relative z-10 w-32 py-2 text-sm font-medium transition-colors duration-300',
                    billingCycle === 'monthly' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle('quarterly')}
                  className={cn(
                    'relative z-10 w-32 py-2 text-sm font-medium transition-colors duration-300',
                    billingCycle === 'quarterly' ? 'text-white' : 'text-zinc-400 hover:text-white'
                  )}
                >
                  Quarterly
                  <span className="absolute -top-3 -right-2 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 text-[10px] text-emerald-400">Save 13%</span>
                </button>
                <motion.div
                  className="absolute top-1 bottom-1 w-32 bg-white/10 rounded-full"
                  animate={{ left: billingCycle === 'monthly' ? 4 : 132 }}
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              </div>
            </div>
          </motion.div>

          {/* ROI Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.15 }}
            className="max-w-2xl mx-auto mb-12 text-center"
          >
            <div className="inline-flex flex-wrap items-center justify-center gap-x-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 px-6 py-4 text-sm text-zinc-300 leading-relaxed">
              <span className="text-emerald-400 font-semibold">ROI check:</span>
              Smart Budget costs GHS 180/year. Estimated PAYE recovery from common employer errors: GHS 1,800+/year.
              That&apos;s a potential <span className="text-emerald-400 font-bold">10× return.</span>
            </div>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {/* FREE TIER */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white">Free</h3>
                <p className="text-zinc-400 mt-2 text-sm">Salary &amp; Tax Calculator only</p>
                <div className="mt-8">
                  <span className="text-5xl font-bold text-white">GHS 0</span>
                  <span className="text-zinc-500 font-medium">/forever</span>
                </div>
                <ul className="mt-8 space-y-4 text-zinc-300 text-sm">
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> 2026 PAYE &amp; SSNIT (incl. NHIS)</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Free Financial Education modules</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Future GRA tax updates</li>
                  <li className="flex items-center gap-3 text-zinc-500 opacity-60"><HugeiconsIcon icon={Cancel01Icon} className="size-5 text-zinc-600 shrink-0" /> Smart budget, debt, SME ledger</li>
                </ul>
              </div>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={downloadPickerOpen}
                onClick={() => setDownloadPickerOpen(true)}
                className="mt-10 block w-full cursor-pointer text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-4 rounded-2xl transition-colors"
              >
                Use Free Calculator
              </button>
            </motion.div>

            {/* BUDGET TIER */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="relative backdrop-blur-xl bg-white/10 border border-emerald-500/30 rounded-3xl p-8 flex flex-col shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)] md:-translate-y-4 hover:-translate-y-6 hover:border-emerald-500/50 transition-all duration-300"
            >
              <div className="absolute -top-4 right-6 bg-linear-to-r from-emerald-500 to-emerald-400 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
                MOST POPULAR
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white">Smart Budget</h3>
                <p className="text-zinc-400 mt-2 text-sm">Budgeting • Debt • Recurring • Insights</p>
                <p className="text-emerald-400/80 mt-1 text-xs italic">If you find one salary error, this pays for itself 10× over.</p>

                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white">
                    {billingCycle === 'monthly' ? 'GHS 15' : 'GHS 39'}
                  </span>
                  <span className="text-zinc-400 font-medium">
                    {billingCycle === 'monthly' ? '/month' : '/quarter'}
                  </span>
                </div>
                <div className="text-zinc-400 text-sm mt-1 min-h-[20px]">
                  {billingCycle === 'monthly' ? (
                    <>or <span className="text-emerald-400 font-medium">GHS 39/quarter</span> (save 13%)</>
                  ) : (
                    <>Billed every 3 months</>
                  )}
                </div>

                <ul className="mt-8 space-y-4 text-zinc-300 text-sm">
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Everything in Free</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Smart budgeting &amp; progress bars</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Debt dashboard + payoff plans</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Recurring expenses &amp; insights</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Offline mode + charts</li>
                </ul>
              </div>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={downloadPickerOpen}
                onClick={() => setDownloadPickerOpen(true)}
                className="mt-10 block w-full cursor-pointer text-center bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-4 rounded-2xl transition-colors shadow-lg shadow-emerald-500/25"
              >
                Start 30-Day Free Trial
              </button>
            </motion.div>

            {/* SME TIER */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col hover:bg-white/10 hover:border-white/20 transition-all duration-300"
            >
              <div className="flex-1">
                <h3 className="text-2xl font-semibold text-white">SME Ledger</h3>
                <p className="text-zinc-400 mt-2 text-sm">Full business tools + everything above</p>
                <p className="text-emerald-400/80 mt-1 text-xs italic">One GRA penalty costs more than 3 years of this tier.</p>

                <div className="mt-8 flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-white">
                    {billingCycle === 'monthly' ? 'GHS 25' : 'GHS 65'}
                  </span>
                  <span className="text-zinc-500 font-medium">
                    {billingCycle === 'monthly' ? '/month' : '/quarter'}
                  </span>
                </div>
                <div className="text-zinc-400 text-sm mt-1 min-h-[20px]">
                  {billingCycle === 'monthly' ? (
                    <>or <span className="text-emerald-400 font-medium">GHS 65/quarter</span> (save 13%)</>
                  ) : (
                    <>Billed every 3 months</>
                  )}
                </div>

                <ul className="mt-8 space-y-4 text-zinc-300 text-sm">
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Everything in Budget tier</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Sales &amp; expenses ledger</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Auto 20% VAT + GHS 750k alert</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> CSV export for accountant</li>
                  <li className="flex items-center gap-3"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 shrink-0" /> Monthly P&amp;L summary</li>
                  <li className="flex items-center gap-3 opacity-60"><HugeiconsIcon icon={Tick02Icon} className="size-5 text-zinc-600 shrink-0" /> Invoices &amp; GRA Export <span className="ml-auto text-[10px] bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">Coming Q2</span></li>
                </ul>
              </div>
              <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={downloadPickerOpen}
                onClick={() => setDownloadPickerOpen(true)}
                className="mt-10 block w-full cursor-pointer text-center bg-white/10 hover:bg-white/20 text-white font-semibold py-4 rounded-2xl transition-colors"
              >
                Start 30-Day Free Trial
              </button>
            </motion.div>
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
            className="mt-24 mb-16 overflow-hidden rounded-3xl border border-white/10 bg-white/5 backdrop-blur-md shadow-2xl"
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-white/10 bg-black/40">
                    <th className="py-6 px-8 text-sm font-semibold text-zinc-400 uppercase tracking-wider w-2/5">Features</th>
                    <th className="py-6 px-6 text-center text-lg font-semibold text-white w-1/5">Free</th>
                    <th className="py-6 px-6 text-center text-lg font-semibold text-emerald-400 w-1/5 bg-emerald-500/5">Budget</th>
                    <th className="py-6 px-6 text-center text-lg font-semibold text-white w-1/5">SME</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {comparisonFeatures.map((section, idx) => (
                    <React.Fragment key={idx}>
                      <tr className="bg-white/5">
                        <td colSpan={4} className="py-4 px-8 text-xs font-bold tracking-widest text-emerald-500 uppercase">
                          {section.category}
                        </td>
                      </tr>
                      {section.features.map((feature, fIdx) => (
                        <tr key={fIdx} className="hover:bg-white/5 transition-colors duration-200">
                          <td className="py-5 px-8 text-sm font-medium text-zinc-300">
                            {feature.name}
                          </td>
                          <td className="py-5 px-6 text-center">
                            {feature.free ? (
                              <HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 mx-auto" />
                            ) : (
                              <HugeiconsIcon icon={Cancel01Icon} className="size-5 text-zinc-600 mx-auto" />
                            )}
                          </td>
                          <td className="py-5 px-6 text-center bg-emerald-500/5">
                            {feature.budget ? (
                              <HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 mx-auto" />
                            ) : (
                              <HugeiconsIcon icon={Cancel01Icon} className="size-5 text-zinc-600 mx-auto" />
                            )}
                          </td>
                          <td className="py-5 px-6 text-center">
                            {feature.sme ? (
                              <HugeiconsIcon icon={Tick02Icon} className="size-5 text-emerald-500 mx-auto" />
                            ) : (
                              <HugeiconsIcon icon={Cancel01Icon} className="size-5 text-zinc-600 mx-auto" />
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
              <div className="w-full border-t border-white/5"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-[#0A0A0A] px-4 text-sm text-zinc-500 text-center max-w-xl">
                First 100 sign-ups (tracked automatically) get <strong className="text-white">60 days FREE full access</strong>.<br />
                All new users after that get 30 days free.<br />
                After trial you only pay if you want to keep the premium features. Cancel anytime. No questions.
              </span>
            </div>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
