'use client'

import { motion } from 'framer-motion'
import { Link } from '@tanstack/react-router'
import { ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'

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
            Pricing that makes sense
          </h2>
          <p className="text-lg text-zinc-400 max-w-2xl mx-auto leading-relaxed">
            Free salary calculator forever.<br />
            <span className="font-semibold text-emerald-400">First 100 users get 60 days full access FREE.</span>
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
            <p className="text-zinc-400 mt-2 text-sm">Salary &amp; Tax Calculator only</p>
            <div className="mt-6 mb-2">
              <span className="text-4xl font-bold text-white">GHS 0</span>
              <span className="text-zinc-500 font-medium">/forever</span>
            </div>
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
            <p className="text-zinc-400 mt-2 text-sm">Budgeting, Debt, Recurring &amp; Insights</p>
            
            <div className="mt-6 mb-2">
              <span className="text-4xl font-bold text-white">GHS 15</span>
              <span className="text-zinc-400 font-medium">/mo</span>
            </div>
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
            <p className="text-zinc-400 mt-2 text-sm">Full business tools &amp; tax prep</p>
            
            <div className="mt-6 mb-2">
              <span className="text-4xl font-bold text-white">GHS 25</span>
              <span className="text-zinc-500 font-medium">/mo</span>
            </div>
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
            See full pricing & features
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
          </Link>
        </motion.div>
      </div>
    </section>
  )
}
