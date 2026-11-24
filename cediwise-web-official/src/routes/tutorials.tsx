'use client'

import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Footer } from '@/components/layout/Footer'
import { IosStyleVideoPlayer } from '@/components/tutorials/IosStyleVideoPlayer'
import { r2PublicObjectUrl } from '@/lib/r2Public'
import { createPageHead } from '@/lib/seo'

export interface TutorialEntry {
  id: string
  title: string
  description: string
  /** R2 object key (slashes OK; special chars encoded when built into URL) */
  objectKey: string
}

export const TUTORIALS: ReadonlyArray<TutorialEntry> = [
  {
    id: 'salary-tax-calculator',
    title: 'Salary & tax calculator',
    description:
      'How to open the calculator, enter gross pay, and read your PAYE and SSNIT breakdown.',
    objectKey: 'cediwise-tutorials/salary&tax-calculator.mp4',
  },
]

export const Route = createFileRoute('/tutorials')({
  component: TutorialsPage,
  head: () => {
    const page = createPageHead({
      path: '/tutorials',
      title: 'Tutorials',
      description:
        'Short videos showing how to use CediWise. Salary calculator walkthrough available now.',
    })
    return {
      ...page,
      meta: [...page.meta, { name: 'robots', content: 'noindex, follow' }],
    }
  },
})

function TutorialsPage() {
  const featured = TUTORIALS[0]
  const videoSrc = featured
    ? r2PublicObjectUrl(featured.objectKey)
    : null

  return (
    <>
      <div className="min-h-screen bg-[#0A0A0A] text-zinc-50">
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <div className="absolute top-0 right-0 h-[500px] w-[60dvw] rounded-full bg-primary/15 blur-[140px]" />
          <div className="absolute bottom-1/3 left-0 h-[300px] w-[40dvw] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        <main className="relative pb-20 pt-[clamp(6.5rem,14vw,8rem)] md:pb-24 md:pt-32">
          <div className="mx-auto max-w-4xl px-4 sm:px-8 lg:px-12">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-8 md:mb-12"
            >
              <Link
                to="/"
                className="inline-flex min-h-11 min-w-[44px] items-center gap-2 py-2 text-sm font-medium text-zinc-400 transition-colors [-webkit-tap-highlight-color:transparent] hover:text-primary"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                Back to home
              </Link>
            </motion.div>

            <motion.header
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="mb-8 md:mb-12"
            >
              <span className="mb-3 inline-block rounded-full border border-primary/25 bg-primary/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-primary sm:mb-4 sm:px-4 sm:text-xs">
                Watch & learn
              </span>
              <h1 className="text-[1.7rem] font-bold leading-tight tracking-tight text-white sm:text-4xl md:text-5xl">
                Tutorials
              </h1>
              <p className="mt-3 max-w-2xl text-[15px] leading-relaxed text-zinc-400 sm:mt-4 sm:text-lg">
                Watch how the tools work before you download. More videos coming for budgeting and
                SME ledger.
              </p>
            </motion.header>

            <motion.section
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.55, delay: 0.08 }}
              className="space-y-8"
              aria-labelledby="featured-tutorial-heading"
            >
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.03] p-4 backdrop-blur-sm sm:rounded-3xl sm:p-8">
                <h2
                  id="featured-tutorial-heading"
                  className="text-lg font-semibold tracking-tight text-white sm:text-xl md:text-2xl"
                >
                  {featured?.title}
                </h2>
                <p className="mt-2 text-[15px] leading-relaxed text-zinc-400 sm:text-base">
                  {featured?.description}
                </p>

                <div className="mt-6 sm:mt-8">
                  {featured ? (
                    <IosStyleVideoPlayer
                      src={videoSrc}
                      title={featured.title}
                    />
                  ) : null}
                </div>
              </div>

              <div className="rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center sm:px-6 sm:py-10">
                <p className="text-sm font-medium text-zinc-300">
                  More tutorials coming soon
                </p>
                <p className="mt-2 text-sm text-zinc-500">
                  Budgeting, debt, business records — next up.
                </p>
              </div>
            </motion.section>
          </div>
        </main>

        <Footer />
      </div>
    </>
  )
}
