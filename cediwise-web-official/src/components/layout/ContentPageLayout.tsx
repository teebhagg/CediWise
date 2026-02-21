'use client'

import { cn } from '@/lib/utils'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

interface ContentPageLayoutProps {
  title: string
  subtitle?: string
  children: React.ReactNode
  className?: string
  backHref?: string
}

export function ContentPageLayout({
  title,
  subtitle,
  children,
  className,
  backHref = '/',
}: ContentPageLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50">
      {/* Background gradient accent */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 h-[400px] w-[50dvw] rounded-full bg-primary/10 blur-[120px]" />
      </div>

      <main className="relative pt-32 pb-24">
        <div className="container mx-auto px-6 sm:px-12 max-w-4xl">
          {backHref && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4 }}
              className="mb-10"
            >
              <Link
                to={backHref}
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-primary"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                Back
              </Link>
            </motion.div>
          )}

          <motion.header
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-16"
          >
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-4 text-lg text-zinc-400 max-w-2xl">{subtitle}</p>
            )}
          </motion.header>

          <motion.article
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className={cn(
              'content-page space-y-8 text-zinc-300 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary/80',
              className,
            )}
          >
            {children}
          </motion.article>
        </div>
      </main>
    </div>
  )
}
