'use client'

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'
import { ReactNode, useEffect, useState, type CSSProperties } from 'react'
import { AndroidIcon, AppleIcon } from '@/components/icons/StoreBrandIcons'
import { GlassCard, floatingCardEnterTransition, floatingCardExitTransition } from '@/components/ui/glass-card'
import { HeroRotatingTitle } from '@/components/landing/HeroRotatingTitle'
import {
  CEDIWISE_ANDROID_PLAY_STORE_URL,
  CEDIWISE_IOS_APP_STORE_URL,
} from '@/lib/storeLinks'
import { cn } from '~/lib/utils'
import { HERO_LCP_IMAGE_SRC } from '@/lib/heroAssets'

const MOBILE_CARD_CYCLE_MS = 3000
const MOBILE_LG_QUERY = '(max-width: 1023px)'
const NARROW_MOBILE_QUERY = '(max-width: 599px)'
const CARD_COUNT = 5
const VISIBLE_CARD_WINDOW = 3

/** Distinct anchor points around the phone cluster (mobile) */
const MOBILE_SLOT_CLASSES = [
  'left-0 right-auto top-[2%]',
  'right-0 left-auto top-[18%]',
  'left-0 right-auto bottom-[16%]',
  'right-0 left-auto bottom-[4%]',
  'left-[10%] right-auto top-[44%]',
] as const

function getVisibleCardIndices(step: number): number[] {
  const activeIndex = step % CARD_COUNT
  const visibleCount = Math.min(VISIBLE_CARD_WINDOW, step + 1)
  const indices: number[] = []

  for (let offset = visibleCount - 1; offset >= 0; offset -= 1) {
    indices.push((activeIndex - offset + CARD_COUNT * 10) % CARD_COUNT)
  }

  return indices
}

type HeroFloatingCardConfig = {
  id: string
  className: string
  delay: number
  initial?: Record<string, unknown>
  animate?: Record<string, unknown>
  label: string
  value: string
  insight: string
  iconBgColor?: string
  iconColor?: string
  icon: ReactNode
}

const DESKTOP_CARD_CLASS: Record<string, string> = {
  income: 'lg:absolute lg:left-[8%] lg:right-auto lg:top-[20%] lg:mx-0 lg:max-w-none',
  savings: 'lg:absolute lg:bottom-[8%] lg:left-auto lg:right-[15%] lg:top-auto lg:mx-0 lg:max-w-none',
  tax: 'lg:absolute lg:left-auto lg:right-[8%] lg:top-[25%] lg:mx-0 lg:max-w-none',
  sme: 'lg:absolute lg:bottom-[20%] lg:left-[10%] lg:right-auto lg:top-auto lg:mx-0 lg:max-w-none',
  budget: 'lg:absolute lg:left-auto lg:right-[4%] lg:top-[55%] lg:mx-0 lg:max-w-none',
}

const HERO_FLOATING_CARDS: HeroFloatingCardConfig[] = [
  {
    id: 'income',
    className: DESKTOP_CARD_CLASS.income,
    delay: 0.5,
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    label: 'Total Income',
    value: 'GHS 8,540.00',
    insight:
      'Net salary plus side income from your Vitals setup - the number your budget actually starts from.',
    iconBgColor: 'bg-emerald-500/20',
    iconColor: 'text-emerald-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4 lg:size-5">
        <path d="M12 5v14m-7-7l7 7 7-7" />
      </svg>
    ),
  },
  {
    id: 'savings',
    className: DESKTOP_CARD_CLASS.savings,
    delay: 0.7,
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    label: 'Monthly Savings',
    value: '+GHS 2,450.00',
    insight:
      "Tracked in your Savings Vault. At this pace you're on track for a 3-month emergency fund.",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4 lg:size-5">
        <path d="M12 2v20m10-10H2" />
      </svg>
    ),
  },
  {
    id: 'tax',
    className: DESKTOP_CARD_CLASS.tax,
    delay: 0.9,
    initial: { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    label: 'Tax & Social Security (SSNIT)',
    value: '-GHS 1,240.00',
    insight:
      "2026 GRA bands applied. Cross-check HR's figure against the same tables in our free salary calculator.",
    iconBgColor: 'bg-rose-500/20',
    iconColor: 'text-rose-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4 lg:size-5">
        <path d="M5 12h14" />
      </svg>
    ),
  },
  {
    id: 'sme',
    className: DESKTOP_CARD_CLASS.sme,
    delay: 1.1,
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    label: 'Small Business (SME) Expenses',
    value: 'GHS 3,120.00',
    insight:
      'Pulled from your Business ledger with VAT-ready totals as turnover nears the GHS 750K threshold.',
    iconBgColor: 'bg-orange-500/20',
    iconColor: 'text-orange-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4 lg:size-5">
        <path d="M20 12V8H4v4m16 0v4H4v-4m16 0h2M4 12H2" />
      </svg>
    ),
  },
  {
    id: 'budget',
    className: DESKTOP_CARD_CLASS.budget,
    delay: 0.5,
    label: 'Budget Goal',
    value: '92.4% Met',
    insight:
      "Your Needs/Wants/Savings split from Vitals. 92.4% means you're still GHS 180 under your safe-to-spend limit.",
    iconBgColor: 'bg-sky-500/20',
    iconColor: 'text-sky-500',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="size-4 lg:size-5">
        <path d="M21.21 15.89A10 10 0 118 2.83M22 12A10 10 0 0012 2v10z" />
      </svg>
    ),
  },
]

function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && window.matchMedia(query).matches,
  )

  useEffect(() => {
    const mq = window.matchMedia(query)
    const update = () => setMatches(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [query])

  return matches
}

function useIsBelowLg() {
  return useMediaQuery(MOBILE_LG_QUERY)
}

function HeroFloatingCards() {
  const isNarrowMobile = useMediaQuery(NARROW_MOBILE_QUERY)
  const isMobile = useIsBelowLg()
  const prefersReducedMotion = useReducedMotion()
  const [step, setStep] = useState(0)

  const activeIndex = step % CARD_COUNT
  const visibleIndices = getVisibleCardIndices(step)

  useEffect(() => {
    if (!isMobile || isNarrowMobile || prefersReducedMotion) return

    const timer = window.setInterval(() => {
      setStep((current) => current + 1)
    }, MOBILE_CARD_CYCLE_MS)

    return () => window.clearInterval(timer)
  }, [isMobile, isNarrowMobile, prefersReducedMotion])

  if (isNarrowMobile) return null

  if (isMobile) {
    const mobileVisible = prefersReducedMotion ? [0, 1, 2] : visibleIndices
    const mobileActive = prefersReducedMotion ? 0 : activeIndex

    return (
      <div className="pointer-events-none absolute inset-x-4 top-2 z-20 max-lg:bottom-4 lg:inset-0">
        <AnimatePresence mode="popLayout">
          {mobileVisible.map((cardIndex) => {
            const card = HERO_FLOATING_CARDS[cardIndex]
            const slotClass = MOBILE_SLOT_CLASSES[cardIndex % MOBILE_SLOT_CLASSES.length]

            return (
              <motion.div
                key={card.id}
                layout
                initial={
                  prefersReducedMotion
                    ? false
                    : { opacity: 0, y: 10, scale: 0.98 }
                }
                animate={{
                  opacity: 1,
                  y: 0,
                  scale: 1,
                  transition: floatingCardEnterTransition,
                }}
                exit={{
                  opacity: 0,
                  y: -6,
                  scale: 0.98,
                  transition: floatingCardExitTransition,
                }}
                className={cn('absolute w-[min(17.5rem,calc(100%-0px))]', slotClass)}
              >
                <GlassCard
                  label={card.label}
                  value={card.value}
                  insight={card.insight}
                  iconBgColor={card.iconBgColor}
                  iconColor={card.iconColor}
                  icon={card.icon}
                  expanded={cardIndex === mobileActive}
                  enableHoverExpand={false}
                />
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    )
  }

  return (
    <div className="pointer-events-none absolute inset-0 z-20">
      {HERO_FLOATING_CARDS.map((card) => (
        <GlassCard
          key={card.id}
          delay={card.delay}
          initial={card.initial}
          animate={card.animate}
          className={card.className}
          label={card.label}
          value={card.value}
          insight={card.insight}
          iconBgColor={card.iconBgColor}
          iconColor={card.iconColor}
          icon={card.icon}
          enableHoverExpand
        />
      ))}
    </div>
  )
}

function HeroPhone({
  src,
  alt,
  delay,
  className,
  hoverClassName,
  imageClassName,
  revealVariant = 'side',
}: {
  src: string
  alt: string
  delay: number
  className?: string
  hoverClassName?: string
  imageClassName?: string
  revealVariant?: 'primary' | 'side'
}) {
  const revealStyle = { '--hero-phone-delay': `${delay}s` } as CSSProperties

  return (
    <div className={className}>
      <div
        className={cn(
          'hero-phone-reveal-animate h-full w-full',
          revealVariant === 'primary' && 'hero-phone-reveal-animate--primary',
        )}
        style={revealStyle}
      >
        <div
          className={cn(
            'aspect-9/19 overflow-hidden shadow-xl transition-transform duration-300 motion-reduce:transition-none',
            imageClassName,
            hoverClassName,
          )}
        >
          <img
            src={src}
            alt={alt}
            className="h-full w-full object-cover"
            loading="eager"
            fetchPriority={revealVariant === 'primary' ? 'high' : 'auto'}
            decoding="async"
          />
        </div>
      </div>
    </div>
  )
}

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
              Built for Ghana
            </div>
            <h1 className="text-3xl font-bold tracking-tight text-white sm:text-5xl">
              <HeroRotatingTitle />
            </h1>
            <p className="mt-8 text-lg leading-relaxed text-zinc-400">
              Run your salary through GRA&apos;s 2026 PAYE and SSNIT tables. Check if HR got the
              deductions right. See what you can actually spend this month.
            </p>
            <p className="mt-4 text-sm text-zinc-500">
              Free on the web · 200+ users · Side hustle? VAT tracking included
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
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
        <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4 pb-8 pt-6 sm:px-6 lg:bg-primary/5 lg:p-12 lg:pt-40">
          <div className="relative flex min-h-[24rem] w-full max-w-2xl items-center justify-center sm:min-h-[28rem] lg:min-h-0 lg:h-full">
            <HeroPhone
              src="/assets/ios/img-4.webp"
              alt="CediWise SME Ledger and expense tracking screenshot"
              delay={0.15}
              className="absolute left-[12%] z-0 w-[28%] opacity-90"
              hoverClassName="lg:hover:translate-x-[-10px] lg:hover:-rotate-2"
            />

            <HeroPhone
              src="/assets/ios/img-3.webp"
              alt="CediWise financial literacy and analytics dashboard"
              delay={0.55}
              className="absolute right-[12%] z-0 w-[28%] opacity-90"
              hoverClassName="lg:hover:translate-x-[10px] lg:hover:rotate-2"
            />

            <HeroPhone
              src={HERO_LCP_IMAGE_SRC}
              alt="CediWise salary calculator and budgeting app interface"
              delay={0.35}
              className="relative z-10 w-[38%]"
              hoverClassName="lg:hover:scale-[1.05]"
              imageClassName="shadow-2xl"
              revealVariant="primary"
            />
          </div>

          <HeroFloatingCards />
        </div>
      </div>
    </section>
  )
}
