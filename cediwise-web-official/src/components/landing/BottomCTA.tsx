'use client'

import { buttonVariants } from '@/components/ui/button'
import { useLatestApkUrl } from '@/hooks/useLatestApkUrl'
import { cn } from '@/lib/utils'
import { ArrowRight01Icon, SmartPhone01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion } from 'framer-motion'

export function BottomCTA() {
  const { url } = useLatestApkUrl()

  return (
    <section className="relative overflow-hidden py-24 lg:py-40">
      {/* Background Glows */}
      <div className="absolute left-1/2 top-1/2 -z-10 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />

      <div className="container mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          className="relative overflow-hidden rounded-[3rem] border border-white/10 bg-zinc-900/50 p-12 text-center backdrop-blur-2xl lg:p-24"
        >
          {/* Decorative Elements */}
          <div className="absolute -left-10 -top-10 size-40 rounded-full bg-primary/10 blur-3xl" />
          <div className="absolute -right-10 -bottom-10 size-40 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-3xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="mb-8 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary"
            >
              Start Your Journey
            </motion.div>

            <h2 className="text-4xl font-bold tracking-tight text-white sm:text-6xl">
              Ready to master your <br />
              <span className="text-primary italic">financial future?</span>
            </h2>

            <p className="mx-auto mt-8 max-w-xl text-lg text-zinc-400">
              Join thousands of Ghanaians using CediWise to track salaries,
              manage SME budgets, and grow their wealth with confidence.
            </p>

            <div className="mt-12 flex flex-col items-center justify-center gap-4 sm:flex-row">
              {/* <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://apps.apple.com/app/cediwise"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-16 gap-3 rounded-2xl bg-white px-8 text-lg font-bold text-black transition-all hover:bg-zinc-200',
                )}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-6" />
                iOS App
              </motion.a>

              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href="https://play.google.com/store/apps/details?id=com.cediwise"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-16 gap-3 rounded-2xl border-white/10 bg-white/5 px-8 text-lg font-bold text-white backdrop-blur-sm transition-all hover:bg-white/10',
                )}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-6" />
                Android App
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
              </motion.a> */}

              <motion.a
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                href={url ?? '#'}
                target={url ? '_blank' : undefined}
                rel={url ? 'noopener noreferrer' : undefined}
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-16 gap-3 rounded-2xl bg-primary px-8 text-lg font-bold text-black transition-all hover:bg-primary/90',
                )}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-6" />
                Download android app
                <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
              </motion.a>
            </div>
          </div>

          {/* Floating Minimal Elements */}
          <motion.div
            animate={{
              y: [0, -20, 0],
              rotate: [0, 5, 0],
            }}
            transition={{
              duration: 5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
            className="absolute right-12 top-20 hidden lg:block"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-500 flex items-center justify-center">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="3"
                    className="size-4"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    Goal Met
                  </p>
                  <p className="text-sm font-bold text-white">
                    Budget Complete
                  </p>
                </div>
              </div>
            </div>
          </motion.div>

          <motion.div
            animate={{
              y: [0, 20, 0],
              rotate: [0, -5, 0],
            }}
            transition={{
              duration: 6,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: 1,
            }}
            className="absolute left-12 bottom-20 hidden lg:block"
          >
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-full bg-primary/20 text-primary flex items-center justify-center">
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    className="size-4 -rotate-45"
                  />
                </div>
                <div className="text-left">
                  <p className="text-[10px] text-zinc-500 uppercase font-bold tracking-wider">
                    Growth
                  </p>
                  <p className="text-sm font-bold text-white">+12.4% Yield</p>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  )
}
