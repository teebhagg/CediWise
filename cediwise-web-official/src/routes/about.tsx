'use client'

import { Footer } from '@/components/layout/Footer'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowLeft01Icon,
  ArrowRight01Icon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/about')({
  component: AboutPage,
  head: () => ({
    meta: [
      { title: 'About Us — CediWise' },
      {
        name: 'description',
        content:
          'CediWise is a project by Joshua Ansah to address financial illiteracy in Ghana and help Ghanaians save, plan, and invest for a rainy day.',
      },
    ],
  }),
})

function AboutPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 h-[500px] w-[60dvw] rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute bottom-1/3 left-0 h-[300px] w-[40dvw] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <main className="relative pt-32 pb-24">
        <div className="container mx-auto px-6 sm:px-12 max-w-4xl">
          <motion.div
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="mb-12"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-primary"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              Back to home
            </Link>
          </motion.div>

          <motion.header
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-16"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
              Built for Ghana
            </span>
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
              About CediWise
            </h1>
            <p className="mt-6 text-xl text-zinc-400 leading-relaxed max-w-2xl">
              A passion project by a sole software engineer wanting to address
              the lack of financial literacy in Ghana.
            </p>
          </motion.header>

          <motion.article
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-10 text-zinc-300 leading-relaxed"
          >
            <p className="text-lg">
              CediWise was created by <strong className="text-white">Joshua Ansah</strong> —
              a software engineer who saw a gap: many Ghanaians lack the tools
              and knowledge to plan their finances, save consistently, and invest
              for the future.
            </p>

            <p>
              The goal is simple: teach and help Ghanaians to prepare and plan a
              better way to save, keep, and invest money for a rainy day. Not
              through complex spreadsheets or expensive courses, but through a
              single, accessible app that combines salary calculation,
              budgeting, SME ledger, and financial literacy — all tailored to
              Ghana.
            </p>

            <p>
              CediWise is built with care, one feature at a time. No big
              corporate backing — just a developer who believes every Ghanaian
              deserves clarity over their money.
            </p>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 mt-12">
              <h2 className="text-xl font-bold text-white mb-4">
                Meet the creator
              </h2>
              <p className="text-zinc-400 mb-6">
                Joshua Ansah is a software engineer with a focus on building
                products that make a difference. CediWise is his contribution to
                financial empowerment in Ghana.
              </p>
              <motion.a
                href="https://joshua-ansah.vercel.app"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  buttonVariants({ variant: 'outline' }),
                  'inline-flex h-12 gap-2 rounded-xl border-white/10 bg-white/5 text-white hover:bg-white/10',
                )}
              >
                View portfolio
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-4" />
              </motion.a>
            </div>

            <div className="pt-8">
              <motion.a
                href="/api/download-latest-apk"
                target="_blank"
                rel="noopener noreferrer"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'inline-flex h-14 gap-2 rounded-xl bg-primary px-8 text-base font-bold text-black',
                )}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-5" />
                Download CediWise
              </motion.a>
            </div>
          </motion.article>
        </div>
      </main>

      <Footer />
    </div>
  )
}
