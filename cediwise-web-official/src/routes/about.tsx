'use client'

import { ArrowLeft01Icon, ArrowRight01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Footer } from '@/components/layout/Footer'
import { buttonVariants } from '@/components/ui/button'
import { createPageHead } from '@/lib/seo'
import { cn } from '@/lib/utils'

export const Route = createFileRoute('/about')({
  component: AboutPage,
  head: () =>
    createPageHead({
      path: '/about',
      title: 'About CediWise',
      description:
        'CediWise helps Ghanaians check PAYE, budget in cedis, and run a small business ledger. Built by Joshua Ansah.',
    }),
})

function AboutPage() {
  return (
    <>
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
                A finance app for Ghana. Check your pay, plan spending, keep SME records tidy.
              </p>
            </motion.header>

            <motion.article
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="space-y-10 text-zinc-300 leading-relaxed"
            >
              <p className="text-lg">
                Joshua Ansah built CediWise after seeing friends struggle with payslips they didn&apos;t
                understand, budgets that broke by mid-month, and side businesses with no proper records.
              </p>

              <p>
                The idea was one app: run your salary through GRA tables, see what&apos;s left to spend,
                track MoMo and cash, and keep VAT straight if you sell something on the side. No
                imported categories. No spreadsheet gymnastics.
              </p>

              <p>
                We ship slowly and test with real users. If something&apos;s wrong with a PAYE calc or a
                VAT rule, we fix it. Money in Ghana is serious enough to get right.
              </p>

              <div className="rounded-2xl border border-white/10 bg-white/2 p-8 mt-12">
                <h2 className="text-xl font-bold text-white mb-4">Meet the creator</h2>
                <p className="text-zinc-400 mb-6">
                  Joshua is a software engineer based in Ghana. CediWise is the product he wished
                  existed when he started earning a salary.
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
            </motion.article>
          </div>
        </main>

        <Footer />
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'Person',
            name: 'Joshua Ansah',
            jobTitle: 'Software Engineer',
            description:
              'Creator of CediWise, a Ghana finance app for PAYE checks, budgeting, and SME records.',
            url: 'https://joshua-ansah.vercel.app',
            affiliation: {
              '@type': 'Organization',
              name: 'CediWise',
            },
          }),
        }}
      />
    </>
  )
}
