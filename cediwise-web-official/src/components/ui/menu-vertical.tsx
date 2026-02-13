'use client'

import { motion } from 'framer-motion'
import { ArrowRight } from 'lucide-react'

type MenuItem = {
  label: string
  href: string
}

interface MenuVerticalProps {
  menuItems: Array<MenuItem>
  color?: string
  skew?: number
}

export const MenuVertical = ({
  menuItems = [],
  color = 'var(--primary)',
  skew = 0,
}: MenuVerticalProps) => {
  return (
    <div className="flex w-fit flex-col gap-6 px-10">
      {menuItems.map((item, index) => (
        <motion.div
          key={`${item.href}-${index}`}
          className="group/nav flex items-center gap-4 cursor-pointer text-zinc-900 dark:text-zinc-50"
          initial="initial"
          whileHover="hover"
        >
          <motion.div
            variants={{
              initial: { x: '-100%', color: 'inherit', opacity: 0 },
              hover: { x: 0, color, opacity: 1 },
            }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="z-0"
          >
            <ArrowRight strokeWidth={4} className="size-8" />
          </motion.div>

          <motion.a
            href={item.href}
            variants={{
              initial: { x: -40, color: 'inherit' },
              hover: { x: 0, color, skewX: skew },
            }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="font-bold text-5xl sm:text-6xl no-underline tracking-tight"
          >
            {item.label}
          </motion.a>
        </motion.div>
      ))}
    </div>
  )
}
