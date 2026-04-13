'use client'

import {
  ArrowUpRight01Icon,
  Book04Icon,
  ChartLineDataIcon,
  CreditCardIcon,
  Invoice02Icon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useRouter } from '@tanstack/react-router'
import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const features = [
  {
    id: 1,
    icon: CreditCardIcon,
    title: 'Salary & Tax',
    description:
      'Is your employer calculating your PAYE and SSNIT correctly? Verify your deductions against GRA rates in seconds — and see if you\'re owed money back.',
    image: '/assets/ios/img-5.webp',
    color: 'bg-emerald-500',
    to: '/salary-calculator',
  },
  {
    id: 2,
    icon: ChartLineDataIcon,
    title: 'Smart Budgeting',
    description:
      'Never run out of money before month end. See the exact date your money runs out and your safe-to-spend figure — updated daily.',
    image: '/assets/ios/img-2.webp',
    color: 'bg-primary',
    to: '/budgeting-tool',
  },
  {
    id: 3,
    icon: Invoice02Icon,
    title: 'Small & Medium Enterprise (SME) Ledger',
    description:
      'One GRA audit costs more than 3 years of CediWise. Stay VAT-compliant, audit-ready, and ahead of your threshold — without hiring an accountant.',
    image: '/assets/ios/img-4.webp',
    color: 'bg-blue-500',
    to: '/sme-ledger',
  },
  {
    id: 4,
    icon: Book04Icon,
    title: 'Financial Literacy',
    description:
      'Know your rights before your next salary negotiation or GRA filing. 34 lessons built for the Ghanaian financial context.',
    image: '/assets/ios/img-3.webp',
    color: 'bg-orange-500',
    to: '/financial-literacy',
  },
  {
    id: 5,
    icon: ChartLineDataIcon,
    title: 'Spending Insights',
    description:
      'Visualize your spending with charts, trends, and category breakdowns so you always know where your money is going.',
    image: '/assets/ios/img-9.webp',
    color: 'bg-purple-500',
    to: '/spending-insights',
  },
  {
    id: 6,
    icon: SmartPhone01Icon,
    title: 'Debt Dashboard',
    description:
      'How much is your debt actually costing you in total? See the real interest you\'ll pay over the loan term — and the exact savings from one extra payment.',
    image: '/assets/ios/img-12.webp',
    color: 'bg-rose-500',
    to: '/debt-dashboard',
  },
]

export function FeatureSwitcher() {
  const [activeFeature, setActiveFeature] = useState(1)
  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
      <div className="mb-20 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Stop losing money you don&apos;t know you&apos;re losing.
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          CediWise finds the gaps — from incorrect PAYE deductions to invisible MoMo fees — and puts the money back where it belongs.
        </p>
      </div>

      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-24">
        {/* Sticky Image Section */}
        <div className="hidden lg:block sticky top-32 order-1 h-[400px] w-full overflow-hidden rounded-3xl backdrop-blur-sm sm:h-[600px] lg:order-2 lg:flex-1">
          <div className="relative h-full w-full">
            {features.map((feature) => (
              <motion.div
                key={feature.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: activeFeature === feature.id ? 1 : 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                className="absolute inset-0 p-4 sm:p-8"
              >
                <div className="relative h-full w-full overflow-hidden rounded-2xl">
                  <img
                    src={feature.image}
                    alt={`CediWise ${feature.title} feature screenshot`}
                    className="h-full mx-auto object-cover"
                    loading="lazy"
                  />
                  {/* <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent" /> */}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="order-2 flex-1 lg:order-1 lg:py-[20vh]">
          {features.map((feature) => (
            <FeatureItem
              key={feature.id}
              feature={feature}
              setActiveFeature={setActiveFeature}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureItem({
  feature,
  setActiveFeature,
}: {
  feature: (typeof features)[0]
  setActiveFeature: (id: number) => void
}) {
  const ref = useRef(null)
  const isInView = useInView(ref, {
    margin: '-45% 0px -45% 0px',
    once: false,
  })
  const router = useRouter()

  useEffect(() => {
    if (isInView) {
      setActiveFeature(feature.id)
    }
  }, [isInView, feature.id, setActiveFeature])

  return (
    <div
      ref={ref}
      className={cn(
        'mb-24 flex flex-col gap-6 transition-opacity duration-500 last:mb-0',
        isInView ? 'opacity-100' : 'opacity-30',
      )}
    >
      <div
        className={cn(
          'flex size-14 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-500',
          feature.color,
          isInView ? 'scale-110 rotate-0' : 'scale-100 -rotate-6 opacity-50',
        )}
      >
        <HugeiconsIcon icon={feature.icon} className="size-7" />
      </div>

      <div className="space-y-4">
        <h3 className="text-3xl font-bold text-white tracking-tight">
          {feature.title}
        </h3>
        <p className="text-xl leading-relaxed text-zinc-400 max-w-md">
          {feature.description}
        </p>
      </div>

      <div className="flex items-center gap-3">
        <span className="h-px w-8 bg-primary/30" />
        <Button
          variant="secondary"
          size="lg"
          className="rounded-full p-5 bg-primary/10 hover:bg-primary/20"
          onClick={() => {
            router.navigate({ to: feature.to })
          }}
        >
          <span>Learn more</span>
          <HugeiconsIcon icon={ArrowUpRight01Icon} className="size-3.5 -rotate-12" />
        </Button>
      </div>
    </div>
  )
}
