'use client'

import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { CEDIWISE_ANDROID_PLAY_STORE_URL } from '@/lib/storeLinks'

export function Pricing() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden border-t border-white/5">
      {/* Background Glows */}
      <div className="pointer-events-none absolute left-1/2 top-0 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-emerald-500/10 blur-[120px] rounded-full" />
      
      <div className="relative max-w-7xl mx-auto px-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <h2 className="text-4xl font-bold tracking-tight text-white mb-6 sm:text-5xl">
            Simple pricing
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Salary calculator stays free. Budgeting and business tools live in the app.
          </p>
        </motion.div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          {/* FREE TIER */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/10 transition-all duration-300"
          >
            <h3 className="text-2xl font-semibold text-white">Free</h3>
            <p className="text-zinc-400 mt-2 text-sm">PAYE &amp; SSNIT calculator only</p>
            <div className="mt-6 mb-2">
              <span className="text-4xl font-bold text-white">GHS 0</span>
              <span className="text-zinc-500 font-medium">/forever</span>
            </div>
            <Link
              to="/try-salary-calculator"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              Try the calculator
            </Link>
          </motion.div>

          {/* BUDGET TIER */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="relative backdrop-blur-xl bg-emerald-500/10 border border-emerald-500/30 rounded-3xl p-8 flex flex-col items-center text-center shadow-[0_0_40px_-10px_rgba(16,185,129,0.2)] md:-translate-y-4 hover:-translate-y-5 transition-all duration-300"
          >
            <div className="absolute -top-4 bg-linear-to-r from-emerald-500 to-emerald-400 text-white text-xs font-bold px-4 py-1.5 rounded-full shadow-lg">
              MOST POPULAR
            </div>
            <h3 className="text-2xl font-semibold text-white">Smart Budget</h3>
            <p className="text-zinc-400 mt-2 text-sm">Budget, debt, recurring bills, insights</p>
            
            <div className="mt-6 mb-2">
              <span className="text-4xl font-bold text-white">GHS 15</span>
              <span className="text-zinc-400 font-medium">/mo</span>
            </div>
            <a
              href={CEDIWISE_ANDROID_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-emerald-500"
            >
              Start free trial
            </a>
          </motion.div>

          {/* SME TIER */}
          <motion.div 
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.3 }}
            className="backdrop-blur-md bg-white/5 border border-white/10 rounded-3xl p-8 flex flex-col items-center text-center hover:bg-white/10 transition-all duration-300"
          >
            <h3 className="text-2xl font-semibold text-white">SME Ledger</h3>
            <p className="text-zinc-400 mt-2 text-sm">Business sales, expenses, tax prep</p>
            
            <div className="mt-6 mb-2">
              <span className="text-4xl font-bold text-white">GHS 25</span>
              <span className="text-zinc-500 font-medium">/mo</span>
            </div>
            <a
              href={CEDIWISE_ANDROID_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex items-center justify-center rounded-full border border-white/20 bg-white/10 px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/15"
            >
              Get SME Ledger
            </a>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="flex justify-center"
        >
          <Link
            to="/pricing"
            className="inline-flex items-center gap-2 rounded-xl bg-white text-zinc-950 px-8 py-4 font-semibold hover:bg-zinc-200 transition-colors shadow-lg shadow-white/10"
          >
            See pricing details
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
