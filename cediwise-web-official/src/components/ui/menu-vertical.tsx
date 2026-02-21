'use client'

import { Link } from '@tanstack/react-router'
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
  onNavigate?: () => void
}

export const MenuVertical = ({
  menuItems = [],
  color = 'var(--primary)',
  skew = 0,
  onNavigate,
}: MenuVerticalProps) => {
  return (
    <div className="flex w-fit flex-col gap-6 px-10">
      {menuItems.map((item, index) => {
        const isInternal =
          item.href.startsWith('/') && !item.href.startsWith('//')

        return (
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

            <motion.div
              variants={{
                initial: { x: -40, color: 'inherit' },
                hover: { x: 0, color, skewX: skew },
              }}
              transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="font-bold text-5xl sm:text-6xl no-underline tracking-tight"
            >
              {isInternal ? (
                <Link
                  to={item.href}
                  className="text-inherit no-underline"
                  onClick={onNavigate}
                >
                  {item.label}
                </Link>
              ) : (
                <a href={item.href} className="text-inherit no-underline">
                  {item.label}
                </a>
              )}
            </motion.div>
          </motion.div>
        )
      })}
    </div>
  )
}
