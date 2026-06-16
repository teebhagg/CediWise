'use client'

import { motion, type Transition } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

const glassSurfaceClass =
  'border border-white/10 bg-white/5 backdrop-blur-md'

export const floatingCardEnterTransition: Transition = {
  duration: 0.42,
  ease: [0.4, 0, 1, 1],
}

export const floatingCardExitTransition: Transition = {
  duration: 0.38,
  ease: [0, 0, 0.2, 1],
}

interface GlassCardProps {
  icon: ReactNode
  label: string
  value: string
  insight?: string
  iconBgColor?: string
  iconColor?: string
  className?: string
  delay?: number
  initial?: Record<string, unknown>
  animate?: Record<string, unknown>
  /** Controlled expand (mobile carousel) */
  expanded?: boolean
  /** Desktop hover expand; disabled on mobile */
  enableHoverExpand?: boolean
}

export function GlassCard({
  icon,
  label,
  value,
  insight,
  iconBgColor = 'bg-primary/20',
  iconColor = 'text-primary',
  className,
  delay = 0,
  initial = { opacity: 0, y: 20 },
  animate = { opacity: 1, y: 0 },
  expanded = false,
  enableHoverExpand = true,
}: GlassCardProps) {
  const hoverExpand = enableHoverExpand && Boolean(insight)
  const isMobileCarousel = !enableHoverExpand

  return (
    <motion.div
      initial={enableHoverExpand ? initial : false}
      animate={enableHoverExpand ? animate : undefined}
      transition={{ delay, duration: 0.8 }}
      layout={isMobileCarousel}
      className={cn(
        'pointer-events-auto overflow-hidden rounded-2xl',
        glassSurfaceClass,
        isMobileCarousel
          ? cn(
              'p-3 transition-[width] duration-300',
              expanded ? 'z-30 w-full' : 'z-20 w-[10.5rem]',
            )
          : cn(
              'p-4 transition-[width] duration-300',
              expanded ? 'z-30 w-full lg:w-[17.5rem]' : 'z-10 w-[11.5rem]',
              hoverExpand && !expanded && 'group lg:hover:w-[17.5rem]',
            ),
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            iconBgColor,
            iconColor,
          )}
        >
          {icon}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            {label}
          </p>
          <p
            className={cn(
              'text-sm font-bold text-white',
              !expanded && !isMobileCarousel && 'truncate',
              !expanded && isMobileCarousel && 'text-xs',
            )}
          >
            {value}
          </p>
        </div>
      </div>

      {insight ? (
        <div
          className={cn(
            'grid transition-[grid-template-rows,opacity,margin] duration-300 ease-out',
            expanded
              ? 'mt-2.5 grid-rows-[1fr] opacity-100 lg:mt-3'
              : hoverExpand
                ? 'mt-0 grid-rows-[0fr] opacity-0 lg:group-hover:mt-3 lg:group-hover:grid-rows-[1fr] lg:group-hover:opacity-100'
                : 'mt-0 grid-rows-[0fr] opacity-0',
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <p className="border-t border-white/10 pt-2.5 text-xs leading-relaxed text-zinc-400 lg:pt-3">
              {insight}
            </p>
          </div>
        </div>
      ) : null}
    </motion.div>
  )
}
