'use client'

import { Footer } from '@/components/layout/Footer'
import { cn } from '@/lib/utils'
import { ArrowLeft01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'
interface FeatureInsightLayoutProps {
  title: string
  tagline: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  iconBgColor: string
  children: React.ReactNode
  highlights?: { title: string; description: string }[]
  image?: string
}

export function FeatureInsightLayout({
  title,
  tagline,
  description,
  icon,
  iconBgColor,
  children,
  highlights = [],
  image,
}: FeatureInsightLayoutProps) {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 h-[500px] w-[60dvw] rounded-full bg-primary/15 blur-[140px]" />
        <div className="absolute bottom-1/4 left-0 h-[300px] w-[40dvw] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <main className="relative">
        {/* Back + Hero */}
        <section className="pt-32 pb-20 px-6 sm:px-12">
          <div className="container mx-auto max-w-6xl">
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className="mb-12"
            >
              <Link
                to="/"
                className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-primary"
              >
                <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
                Back to home
              </Link>
            </motion.div>

            <div className="grid lg:grid-cols-2 gap-16 items-center">
              <motion.div
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary mb-6">
                  {tagline}
                </span>
                <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl lg:text-6xl">
                  {title}
                </h1>
                <p className="mt-6 text-lg text-zinc-400 leading-relaxed max-w-xl">
                  {description}
                </p>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                className="relative"
              >
                {image ? (
                  <div className="relative mx-auto max-w-sm">
                    <div className="aspect-[9/19] overflow-hidden rounded-[2.5rem] border border-white/10 bg-zinc-900/50 shadow-2xl">
                      <img
                        src={image}
                        alt={title}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="absolute -inset-4 -z-10 rounded-[3rem] bg-primary/20 blur-3xl opacity-50" />
                  </div>
                ) : (
                  <div
                    className={cn(
                      'flex aspect-square max-w-md items-center justify-center rounded-3xl border border-white/10 bg-white/5 backdrop-blur-xl',
                      iconBgColor,
                    )}
                  >
                    <HugeiconsIcon icon={icon} className="size-24 text-white/90 sm:size-32" />
                  </div>
                )}
              </motion.div>
            </div>
          </div>
        </section>

        {/* Highlights */}
        {highlights.length > 0 && (
          <section className="py-20 px-6 sm:px-12 border-t border-white/5">
            <div className="container mx-auto max-w-6xl">
              <motion.h2
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                className="text-2xl font-bold text-white mb-12"
              >
                Key features
              </motion.h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {highlights.map((item, i) => (
                  <motion.div
                    key={item.title}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: i * 0.1 }}
                    className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-colors hover:bg-white/[0.04] hover:border-white/10"
                  >
                    <h3 className="text-lg font-semibold text-white">
                      {item.title}
                    </h3>
                    <p className="mt-2 text-zinc-400 text-sm leading-relaxed">
                      {item.description}
                    </p>
                  </motion.div>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Main content */}
        <section className="py-16 px-6 sm:px-12">
          <div className="container mx-auto max-w-4xl">
            <div className="content-page space-y-8 text-zinc-300 [&_h2]:mt-12 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h3]:mt-8 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-zinc-100 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:text-primary [&_a]:underline [&_a]:underline-offset-4 [&_a]:hover:text-primary/80">
              {children}
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
