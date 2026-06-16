'use client'

import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useState } from 'react'
import { TextAnimate } from '@/components/ui/text-animate'
import { cn } from '@/lib/utils'

const HERO_HEADLINES = [
  'See your pay before payday',
  'Budget with clarity',
  'Know where every cedi goes',
] as const

const ROTATE_MS = 4500

export function HeroRotatingTitle({ className }: { className?: string }) {
  const [index, setIndex] = useState(0)
  const [reduceMotion, setReduceMotion] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const update = () => setReduceMotion(mq.matches)
    update()
    mq.addEventListener('change', update)
    return () => mq.removeEventListener('change', update)
  }, [])

  useEffect(() => {
    if (reduceMotion) return
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HERO_HEADLINES.length)
    }, ROTATE_MS)
    return () => clearInterval(id)
  }, [reduceMotion])

  const headline = HERO_HEADLINES[index]

  if (reduceMotion) {
    return <span className={className}>{HERO_HEADLINES[0]}</span>
  }

  return (
    <span className={cn('relative block min-h-[2.6em] sm:min-h-[2.2em]', className)} aria-live="polite">
      <AnimatePresence mode="wait">
        <motion.span
          key={headline}
          className="block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25, ease: 'easeOut' }}
        >
          <TextAnimate
            as="span"
            animation="blurInUp"
            by="word"
            startOnView={false}
            duration={0.5}
            delay={0.05}
            accessible={false}
            className="inline"
          >
            {headline}
          </TextAnimate>
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
