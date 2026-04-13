import { motion } from 'framer-motion'
import { AndroidIcon, AppleIcon } from '@/components/icons/StoreBrandIcons'
import { GlassCard } from '@/components/ui/glass-card'
import {
  CEDIWISE_ANDROID_PLAY_STORE_URL,
  CEDIWISE_IOS_APP_STORE_URL,
} from '@/lib/storeLinks'
import { cn } from '~/lib/utils'

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
              Personal Finance Companion for Ghana
            </div>
            <h1 className="text-5xl font-bold tracking-tight text-white sm:text-7xl">
              Smart money <br />
              <span className="text-primary">for Ghana</span>
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-zinc-400">
              CediWise is your personal finance companion for Ghana. Salary calculator, budgeting,
              small and medium enterprise (SME) ledger, debt tracking, and financial literacy — all in
              one platform built for the modern Ghanaian worker.
            </p>
            <div className="mt-12 flex flex-col gap-4 sm:flex-row">
              <a
                href={CEDIWISE_ANDROID_PLAY_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex cursor-pointer items-center justify-center gap-2 h-14 rounded-full border border-white/20 bg-white/10 px-8 text-base font-semibold text-white backdrop-blur-md transition-colors duration-200 hover:border-white/30 hover:bg-white/[0.14] focus:outline-none focus:ring-2 focus:ring-white/40 motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100',
                )}
              >
                <AndroidIcon className="size-5 shrink-0" />
                Get it on Android
              </a>
              <a
                href={CEDIWISE_IOS_APP_STORE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  'inline-flex cursor-pointer items-center justify-center gap-2 h-14 rounded-full border border-emerald-300/60 bg-emerald-600/70 px-8 text-base font-semibold text-white backdrop-blur-md shadow-sm transition-colors duration-200 hover:border-emerald-400/60 hover:bg-emerald-600/80 focus:outline-none focus:ring-2 focus:ring-emerald-300/40 motion-safe:hover:scale-[1.02] motion-reduce:hover:scale-100',
                )}
              >
                <AppleIcon className="size-[1.15rem] shrink-0" />
                Download on iOS
              </a>
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
                  src="/assets/ios/img-4.webp"
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
                  src="/assets/ios/img-3.webp"
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
                  src="/assets/ios/img-13.webp"
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
