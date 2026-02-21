'use client'

import { cn } from '@/lib/utils'
import {
  Book04Icon,
  ChartLineDataIcon,
  CreditCardIcon,
  Invoice02Icon,
  SmartPhone01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { motion, useInView } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'

const features = [
  {
    id: 1,
    icon: CreditCardIcon,
    title: 'Salary & Tax',
    description:
      'Calculate SSNIT, PAYE, and net take-home for Ghana 2026. Know exactly what stays in your pocket after all deductions.',
    image: '/assets/img_1.png',
    color: 'bg-emerald-500',
  },
  {
    id: 2,
    icon: ChartLineDataIcon,
    title: 'Smart Budgeting',
    description:
      'Category-based budgets with spent vs. remaining progress. Stay on track without the headache of spreadsheets.',
    image: '/assets/img_2.png',
    color: 'bg-primary',
  },
  {
    id: 3,
    icon: Invoice02Icon,
    title: 'SME Ledger',
    description:
      'Sales and expenses with automatic 20% VAT calculations. Get alerted as you approach the GHS 750K VAT threshold.',
    image: '/assets/img_3.png',
    color: 'bg-blue-500',
  },
  {
    id: 4,
    icon: Book04Icon,
    title: 'Financial Literacy',
    description:
      'Level up your money game with curated tips and insights. Built to help every Ghanaian worker build wealth.',
    image: '/assets/img_4.png',
    color: 'bg-orange-500',
  },
  {
    id: 5,
    icon: ChartLineDataIcon,
    title: 'Market Insights',
    description:
      'Stay updated with GSE stocks and performance charts. Make informed decisions about your investment portfolio.',
    image: '/assets/img_5.png',
    color: 'bg-purple-500',
  },
  {
    id: 6,
    icon: SmartPhone01Icon,
    title: 'T-Bill Rates',
    description:
      'Real-time Treasury Bill rates at your fingertips. Compare terms and maximize your interest returns automatically.',
    image: '/assets/img_6.png',
    color: 'bg-sky-500',
  },
]

export function FeatureSwitcher() {
  const [activeFeature, setActiveFeature] = useState(1)

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
      <div className="mb-20 text-center">
        <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
          Everything you need
        </h2>
        <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
          One app for salary, budgets, business, and learning. Designed for the
          modern Ghanaian experience.
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

      <div className="flex items-center gap-4 text-sm font-bold text-primary">
        <span className="h-px w-8 bg-primary/30" />
        <span>LEARN MORE</span>
      </div>
    </div>
  )
}
