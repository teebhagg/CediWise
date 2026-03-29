import { motion } from 'framer-motion'
import { ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface GlassCardProps {
  icon: ReactNode
  label: string
  value: string
  iconBgColor?: string
  iconColor?: string
  className?: string
  delay?: number
  initial?: Record<string, any>
  animate?: Record<string, any>
}

export function GlassCard({
  icon,
  label,
  value,
  iconBgColor = 'bg-primary/20',
  iconColor = 'text-primary',
  className,
  delay = 0,
  initial = { opacity: 0, y: 20 },
  animate = { opacity: 1, y: 0 },
}: GlassCardProps) {
  return (
    <motion.div
      initial={initial}
      animate={animate}
      transition={{ delay, duration: 0.8 }}
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5 p-4 backdrop-blur-md",
        className
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn(
          "flex h-10 w-10 items-center justify-center rounded-full",
          iconBgColor,
          iconColor
        )}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-medium uppercase tracking-wider text-zinc-400">
            {label}
          </p>
          <p className="text-sm font-bold text-white">{value}</p>
        </div>
      </div>
    </motion.div>
  )
}
