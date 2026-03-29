import { motion } from 'framer-motion'
// Removed: JoinBetaButton import (beta CTA deprecated)
import { cn } from '~/lib/utils'
import { HugeiconsIcon } from '@hugeicons/react'
import { SmartPhone01Icon } from '@hugeicons/core-free-icons'
import { GlassCard } from '@/components/ui/glass-card'

export function Hero() {
  return (
    <section className="relative min-h-screen overflow-hidden bg-[#0A0A0A]">
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0">
        <div className="absolute top-0 right-0 h-[600px] w-[50dvw] rounded-full bg-primary/20 blur-[120px]" />
        <div className="block md:hidden absolute bottom-0 left-0 h-[400px] w-[400px] rounded-full bg-primary/10 blur-[100px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col lg:flex-row">
        {/* Left Side: Content (Dark) */}
        <div className="flex flex-1 flex-col justify-center px-6 py-16 pt-40 lg:px-12 lg:py-0">
          <div className="max-w-xl">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary"></span>
              </span>
              Modern Money for Ghana
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
              Smart money for <br />
              <span className="text-primary">CediWise</span>
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-zinc-400">
              Salary calculator, budgeting, small and medium enterprise (SME) ledger, and financial
              literacy — all in one premium platform. Built for the modern Ghanaian worker.
            </p>
            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              {/* <a
                href="https://apps.apple.com/app/cediwise"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-14 gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90',
                )}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-5" />
                Download for iOS
              </a> */}
              <a
                href="https://play.google.com/store/apps/details?id=com.cediwise.app"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex items-center gap-2 h-14 rounded-xl border border-emerald-300/60 bg-emerald-600/70 px-8 text-base font-semibold text-white backdrop-blur-md hover:bg-emerald-600/80 hover:border-emerald-400/60 transition duration-200 transform hover:scale-105 shadow-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/40',
                )}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-5" />
                Get it on Android
              </a>
              <button
                aria-disabled="true"
                disabled
                className={
                  'inline-flex items-center gap-2 h-14 px-8 rounded-xl border border-white/40 bg-white/25 text-white backdrop-blur-md opacity-60 cursor-not-allowed'
                }
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-5" />
                iOS Coming Soon
              </button>
            </div>
          </div>
        </div>

        {/* Right Side: Showcase (Primary Accent) */}
        <div className="relative flex flex-1 items-center justify-center p-6 lg:pt-40 lg:bg-primary/5 lg:p-12 overflow-hidden">
          <div className="relative flex items-center justify-center w-full max-w-2xl h-full">
            {/* Left Image (Behind) */}
            <div className="absolute left-[12%] z-0 w-[28%] transition-transform hover:translate-x-[-10px] hover:-rotate-2">
              <div className="aspect-9/19 overflow-hidden shadow-xl opacity-90">
                <img
                  src="/assets/android/img-3.webp"
                  alt="CediWise SME Ledger and expense tracking screenshot"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Right Image (Behind) */}
            <div className="absolute right-[12%] z-0 w-[28%] transition-transform hover:translate-x-[10px] hover:rotate-2">
              <div className="aspect-9/19 overflow-hidden shadow-xl opacity-90">
                <img
                  src="/assets/android/img-15.webp"
                  alt="CediWise financial literacy and analytics dashboard"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>

            {/* Main Phone (Center) */}
            <div className="relative z-10 w-[38%] transition-transform hover:scale-[1.05]">
              <div className="aspect-9/19 overflow-hidden shadow-2xl">
                <img
                  src="/assets/android/img-14.webp"
                  alt="CediWise salary calculator and budgeting app interface"
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              </div>
            </div>
          </div>

          {/* Glassmorphic Cards Overlay */}
          <div className="absolute inset-0 z-20 hidden lg:block pointer-events-none">
            {/* Income Card - Top Left */}
            <GlassCard
              delay={0.5}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="absolute left-[8%] top-[20%]"
              label="Total Income"
              value="GHS 8,540.00"
              iconBgColor="bg-emerald-500/20"
              iconColor="text-emerald-500"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                  <path d="M12 5v14m-7-7l7 7 7-7" />
                </svg>
              }
            />

            {/* Savings Card - Bottom Right */}
            <GlassCard
              delay={0.7}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute bottom-[8%] right-[15%]"
              label="Monthly Savings"
              value="+GHS 2,450.00"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                  <path d="M12 2v20m10-10H2" />
                </svg>
              }
            />

            {/* Deductions Card - Top Right */}
            <GlassCard
              delay={0.9}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="absolute right-[8%] top-[25%]"
              label="Tax & Social Security (SSNIT)"
              value="-GHS 1,240.00"
              iconBgColor="bg-rose-500/20"
              iconColor="text-rose-500"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                  <path d="M5 12h14" />
                </svg>
              }
            />

            {/* Expenses Card - Bottom Left */}
            <GlassCard
              delay={1.1}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="absolute bottom-[20%] left-[10%]"
              label="Small Business (SME) Expenses"
              value="GHS 3,120.00"
              iconBgColor="bg-orange-500/20"
              iconColor="text-orange-500"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                  <path d="M20 12V8H4v4m16 0v4H4v-4m16 0h2M4 12H2" />
                </svg>
              }
            />

            {/* Budget Planning - Center Right */}
            <GlassCard
              delay={0.5}
              className="absolute right-[4%] top-[55%] shadow-2xl"
              label="Budget Goal"
              value="92.4% Met"
              iconBgColor="bg-sky-500/20"
              iconColor="text-sky-500"
              icon={
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-5">
                  <path d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z" />
                </svg>
              }
            />
          </div>
        </div>
      </div>
    </section>
  )
}
