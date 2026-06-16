'use client'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import {
  ArrowUpRight01Icon,
  Book04Icon,
  ChartLineDataIcon,
  CreditCardIcon,
  Invoice02Icon,
  TrendingDown,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, useRouter } from '@tanstack/react-router'
import { motion, useReducedMotion, useScroll, useTransform } from 'framer-motion'
import { useCallback, useEffect, useRef, useState, type CSSProperties } from 'react'
// import { TUTORIALS } from '~/routes/tutorials' // Re-enable for homepage tutorial promo / YouTube embeds

const features = [
  {
    id: 1,
    icon: CreditCardIcon,
    title: 'Understand your salary.',
    description: 'Check PAYE, SSNIT, and what actually lands in your account.',
    image: '/assets/ios/img-5.webp',
    color: 'bg-emerald-500',
    to: '/salary-calculator',
    tryTo: '/try-salary-calculator',
  },
  {
    id: 2,
    icon: ChartLineDataIcon,
    title: 'Budget with clarity.',
    description: 'See where your money goes and plan the month ahead.',
    image: '/assets/ios/img-2.webp',
    color: 'bg-primary',
    to: '/budgeting-tool',
  },
  {
    id: 3,
    icon: TrendingDown,
    title: 'Eliminate debt faster.',
    description: 'Track balances, repayments, and how far you have left to go.',
    image: '/assets/ios/img-12.webp',
    color: 'bg-rose-500',
    to: '/debt-dashboard',
  },
  {
    id: 4,
    icon: Invoice02Icon,
    title: 'Run your business smarter.',
    description: 'Keep expenses and cash flow in one place, not scattered notes.',
    image: '/assets/ios/img-4.webp',
    color: 'bg-blue-500',
    to: '/sme-ledger',
  },
  {
    id: 5,
    icon: Book04Icon,
    title: 'Learn while you grow.',
    description: 'Short money lessons for everyday decisions. Ghana-specific.',
    image: '/assets/ios/img-3.webp',
    color: 'bg-orange-500',
    to: '/financial-literacy',
  },
]

const FEATURE_RING: Record<string, string> = {
  'bg-emerald-500': 'ring-emerald-500/35',
  'bg-primary': 'ring-primary/35',
  'bg-rose-500': 'ring-rose-500/35',
  'bg-blue-500': 'ring-blue-500/35',
  'bg-orange-500': 'ring-orange-500/35',
}

const DESKTOP_IMAGE_EASE = [0.4, 0, 0.2, 1] as const

function useClosestFeatureOnScroll(itemRefs: React.RefObject<(HTMLDivElement | null)[]>) {
  const [activeFeature, setActiveFeature] = useState(1)

  useEffect(() => {
    let raf = 0

    const update = () => {
      const viewportCenter = window.innerHeight / 2
      let closestId = 1
      let closestDistance = Infinity

      for (const feature of features) {
        const el = itemRefs.current?.[feature.id - 1]
        if (!el) continue

        const rect = el.getBoundingClientRect()
        const center = rect.top + rect.height / 2
        const distance = Math.abs(center - viewportCenter)

        if (distance < closestDistance) {
          closestDistance = distance
          closestId = feature.id
        }
      }

      setActiveFeature((prev) => (prev === closestId ? prev : closestId))
    }

    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(update)
    }

    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule, { passive: true })
    schedule()

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
    }
  }, [itemRefs])

  return activeFeature
}

export function FeatureSwitcher() {
  const itemRefs = useRef<(HTMLDivElement | null)[]>([])
  const activeFeature = useClosestFeatureOnScroll(itemRefs)
  // const featuredTutorial = TUTORIALS[0]
  // const tutorialThumb = features[0]?.image

  return (
    <section className="relative mx-auto max-w-7xl px-6 py-24 lg:py-32">
      <div className="mb-20">
        <div className="text-center">
          <h2 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
            Five things. One app.
          </h2>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-zinc-400">
            Salary, budget, debt, business, lessons.{' '}
            <Link to="/try-salary-calculator" className="text-primary hover:underline">
              Start with the free salary check
            </Link>{' '}
            if you want to try before downloading.
          </p>
        </div>

        {/* Homepage tutorial promo — hidden while short clips live on social; restore with YouTube embeds later */}
        {/* {featuredTutorial && tutorialThumb ? (
          <div className="mx-auto mt-10 max-w-3xl">
            <Link
              to="/tutorials"
              className={cn(
                'group flex flex-col gap-5 rounded-2xl border border-primary/25 bg-primary/6 p-4 backdrop-blur-sm transition-colors duration-200',
                'hover:border-primary/40 hover:bg-primary/10',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0A0A0A]',
                'sm:flex-row sm:items-stretch sm:gap-6 sm:p-5',
              )}
            >
              <div className="relative aspect-video w-full shrink-0 overflow-hidden rounded-xl sm:w-52 sm:self-center">
                <img
                  src={tutorialThumb}
                  alt={`${featuredTutorial.title} preview`}
                  className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-[1.03]"
                  loading="lazy"
                />
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/35 transition-colors duration-200 group-hover:bg-black/25"
                  aria-hidden
                >
                  <span className="flex size-14 items-center justify-center rounded-full bg-white/15 text-white shadow-lg ring-2 ring-white/30 backdrop-blur-sm">
                    <svg viewBox="0 0 24 24" className="ml-0.5 size-7 fill-current" aria-hidden>
                      <path d="M8 5v14l11-7L8 5z" />
                    </svg>
                  </span>
                </div>
              </div>

              <div className="flex min-w-0 flex-1 flex-col justify-center text-center sm:text-left">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-primary">
                  Watch & learn
                </span>
                <h3 className="mt-1.5 text-xl font-bold tracking-tight text-white sm:text-2xl">
                  {featuredTutorial.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-zinc-400 sm:text-base">
                  {featuredTutorial.description}
                </p>
                <span className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-semibold text-primary sm:justify-start">
                  Watch tutorial
                  <HugeiconsIcon
                    icon={ArrowUpRight01Icon}
                    className="size-4 transition-transform duration-200 motion-safe:group-hover:translate-x-0.5 motion-safe:group-hover:-translate-y-0.5"
                  />
                </span>
              </div>
            </Link>
          </div>
        ) : null} */}
      </div>

      <div className="flex flex-col gap-12 lg:flex-row lg:items-start lg:gap-24">
        {/* Sticky Image Section */}
        <div className="hidden lg:block sticky top-32 order-1 h-[400px] w-full overflow-hidden rounded-3xl backdrop-blur-sm sm:h-[600px] lg:order-2 lg:flex-1">
          <div className="relative h-full w-full">
            {features.map((feature) => (
              <motion.div
                key={feature.id}
                initial={false}
                animate={{ opacity: activeFeature === feature.id ? 1 : 0 }}
                transition={{ duration: 0.35, ease: DESKTOP_IMAGE_EASE }}
                className="absolute inset-0 p-4 sm:p-8"
                aria-hidden={activeFeature !== feature.id}
              >
                <div className="relative h-full w-full overflow-hidden rounded-2xl">
                  <img
                    src={feature.image}
                    alt={`CediWise ${feature.title} feature screenshot`}
                    className="h-full mx-auto object-cover"
                    loading="lazy"
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Scrollable Content Section */}
        <div className="order-2 flex-1 lg:order-1 lg:py-[12vh]">
          {features.map((feature) => (
            <FeatureItem
              key={feature.id}
              feature={feature}
              isActive={activeFeature === feature.id}
              registerRef={(el) => {
                itemRefs.current[feature.id - 1] = el
              }}
            />
          ))}
        </div>
      </div>
    </section>
  )
}

function FeatureItem({
  feature,
  isActive,
  registerRef,
}: {
  feature: (typeof features)[0] & { tryTo?: string }
  isActive: boolean
  registerRef: (el: HTMLDivElement | null) => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  const shouldReduceMotion = useReducedMotion()
  const router = useRouter()

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start 0.85', 'center center', 'end 0.15'],
  })
  const opacity = useTransform(scrollYProgress, [0, 0.35, 0.65, 1], [0.35, 1, 1, 0.35])

  const setRef = useCallback(
    (el: HTMLDivElement | null) => {
      ref.current = el
      registerRef(el)
    },
    [registerRef],
  )

  return (
    <motion.div
      ref={setRef}
      style={shouldReduceMotion ? undefined : { opacity }}
      className={cn(
        'mb-12 flex min-h-[50vh] flex-col justify-center gap-6 last:mb-0 lg:mb-16 lg:min-h-[60vh]',
        shouldReduceMotion && (isActive ? 'opacity-100' : 'opacity-35'),
      )}
    >
      <FeatureIconBlob
        colorClass={feature.color}
        icon={feature.icon}
        isActive={isActive}
        index={feature.id - 1}
      />

      <FeatureMobileScreenshot
        image={feature.image}
        title={feature.title}
        colorClass={feature.color}
      />

      <div className="space-y-4">
        <h3 className="text-3xl font-bold text-white tracking-tight">
          {feature.title}
        </h3>
        <p className="text-xl leading-relaxed text-zinc-400 max-w-md">
          {feature.description}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <span className="h-px w-8 bg-primary/30" />
        <Button
          variant="secondary"
          size="lg"
          className="group rounded-full p-5 bg-primary/10 hover:bg-primary/20"
          onClick={() => {
            router.navigate({ to: feature.to })
          }}
        >
          <span>Learn more</span>
          <FeatureLinkArrow />
        </Button>
        {feature.tryTo ? (
          <Button
            variant="secondary"
            size="lg"
            className="group rounded-full p-5 border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300"
            onClick={() => {
              router.navigate({ to: feature.tryTo! })
            }}
          >
            <span>Try free</span>
            <FeatureLinkArrow />
          </Button>
        ) : null}
      </div>
    </motion.div>
  )
}

function FeatureMobileScreenshot({
  image,
  title,
  colorClass,
}: {
  image: string
  title: string
  colorClass: string
}) {
  return (
    <div className="mx-auto w-[48%] max-w-[220px] lg:hidden">
      <div
        className={cn(
          'relative aspect-9/19 overflow-hidden rounded-[1.75rem] shadow-2xl shadow-black/50',
        )}
      >
        <img
          src={image}
          alt={`CediWise ${title} feature screenshot`}
          className="h-full w-full object-cover object-top"
          loading="lazy"
        />
      </div>
    </div>
  )
}

const BLOB_DURATION_S = 7 / 1.7
const BLOB_RING_DURATION_S = BLOB_DURATION_S * 1.2

function FeatureLinkArrow() {
  return (
    <HugeiconsIcon
      icon={ArrowUpRight01Icon}
      className="size-3.5 shrink-0 transition-transform duration-200 ease-out motion-safe:group-hover:rotate-45 motion-reduce:transition-none"
      aria-hidden
    />
  )
}

function FeatureIconBlob({
  colorClass,
  icon,
  isActive,
  index,
}: {
  colorClass: string
  icon: (typeof features)[0]['icon']
  isActive: boolean
  index: number
}) {
  return (
    <div
      className={cn(
        'relative size-16 shrink-0 transition-transform duration-500 motion-reduce:transition-none',
        isActive ? 'scale-110' : 'scale-95',
      )}
      style={
        {
          '--blob-index': index,
          '--blob-duration': `${BLOB_DURATION_S}s`,
          '--blob-ring-duration': `${BLOB_RING_DURATION_S}s`,
        } as CSSProperties
      }
    >
      <div
        aria-hidden
        className={cn(
          'feature-icon-blob-ring absolute -inset-1 opacity-35 blur-[1px]',
          colorClass,
        )}
      />
      <div
        className={cn(
          'feature-icon-blob relative flex size-full items-center justify-center text-white shadow-lg shadow-black/25',
          colorClass,
        )}
      >
        <HugeiconsIcon icon={icon} className="relative z-10 size-7" />
      </div>
    </div>
  )
}
