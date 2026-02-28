import { motion } from 'framer-motion'
import { JoinBetaButton } from './JoinBetaButton'

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
              Salary calculator, budgeting, SME ledger, and financial literacy —
              all in one premium platform. Built for the modern Ghanaian worker.
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
              {/* <a
                href="https://play.google.com/store/apps/details?id=com.cediwise"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: 'outline', size: 'lg' }),
                  'h-14 gap-2 rounded-xl border-zinc-800 bg-white/5 px-8 text-base font-semibold text-white backdrop-blur-sm hover:bg-white/10',
                )}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-5" />
                Get it on Android
              </a> */}
              <div className="flex flex-col items-start gap-2">
                <span className="text-amber-500 font-medium text-sm">
                  The application is currently in beta.
                </span>
                <JoinBetaButton className="cursor-pointer">
                  Join Beta Test
                </JoinBetaButton>
              </div>
              {/* <a
                href="/api/download-latest-apk"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ size: 'lg' }),
                  'h-14 gap-2 rounded-xl bg-primary px-8 text-base font-semibold text-primary-foreground hover:bg-primary/90',
                )}
              >
                <HugeiconsIcon icon={SmartPhone01Icon} className="size-5" />
                Download APK
              </a> */}
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
                  src="/assets/img_3.png"
                  alt="CediWise SME Ledger and expense tracking screenshot"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Right Image (Behind) */}
            <div className="absolute right-[12%] z-0 w-[28%] transition-transform hover:translate-x-[10px] hover:rotate-2">
              <div className="aspect-9/19 overflow-hidden shadow-xl opacity-90">
                <img
                  src="/assets/img_4.png"
                  alt="CediWise financial literacy and analytics dashboard"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>

            {/* Main Phone (Center) */}
            <div className="relative z-10 w-[38%] transition-transform hover:scale-[1.05]">
              <div className="aspect-9/19 overflow-hidden shadow-2xl">
                <img
                  src="/assets/img_1.png"
                  alt="CediWise salary calculator and budgeting app interface"
                  className="h-full w-full object-cover"
                />
              </div>
            </div>
          </div>

          {/* Glassmorphic Cards Overlay */}
          <div className="absolute inset-0 z-20 hidden lg:block pointer-events-none">
            {/* Income Card - Top Left */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              className="absolute left-[8%] top-[20%] rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-500">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="size-5"
                  >
                    <path d="M12 5v14m-7-7l7 7 7-7" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    Total Income
                  </p>
                  <p className="text-sm font-bold text-white">GHS 8,540.00</p>
                </div>
              </div>
            </motion.div>

            {/* Savings Card - Bottom Right */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.7, duration: 0.8 }}
              className="absolute bottom-[8%] right-[15%] rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-primary">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="size-5"
                  >
                    <path d="M12 2v20m10-10H2" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    Monthly Savings
                  </p>
                  <p className="text-sm font-bold text-white">+GHS 2,450.00</p>
                </div>
              </div>
            </motion.div>

            {/* Deductions Card - Top Right */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.9, duration: 0.8 }}
              className="absolute right-[8%] top-[25%] rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-rose-500/20 text-rose-500">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="size-5"
                  >
                    <path d="M5 12h14" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    Tax & SSNIT
                  </p>
                  <p className="text-sm font-bold text-white">-GHS 1,240.00</p>
                </div>
              </div>
            </motion.div>

            {/* Expenses Card - Bottom Left */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 1.1, duration: 0.8 }}
              className="absolute bottom-[20%] left-[10%] rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-500/20 text-orange-500">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="size-5"
                  >
                    <path d="M20 12V8H4v4m16 0v4H4v-4m16 0h2M4 12H2" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    SME Expenses
                  </p>
                  <p className="text-sm font-bold text-white">GHS 3,120.00</p>
                </div>
              </div>
            </motion.div>

            {/* Budget Planning - Center Right bit higher */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.8 }}
              // animate={{
              //   y: [0, -10, 0],
              // }}
              // transition={{
              //   duration: 4,
              //   repeat: Infinity,
              //   ease: 'easeInOut',
              // }}
              className="absolute right-[4%] top-[55%] rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md shadow-2xl"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-500/20 text-sky-500">
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="size-5"
                  >
                    <path d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
                    Budget Goal
                  </p>
                  <p className="text-sm font-bold text-white">92.4% Met</p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  )
}
