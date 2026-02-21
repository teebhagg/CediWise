'use client'

import { Footer } from '@/components/layout/Footer'
import {
  ArrowLeft01Icon,
  CallIcon,
  Mail01Icon,
  MessageQuestionIcon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { motion } from 'framer-motion'

export const Route = createFileRoute('/contact')({
  component: ContactPage,
  head: () => ({
    meta: [
      { title: 'Contact — CediWise' },
      {
        name: 'description',
        content:
          'Get in touch with the CediWise team. Questions, feedback, or support — we’d love to hear from you.',
      },
    ],
  }),
})

const contactMethods = [
  {
    icon: Mail01Icon,
    title: 'Email',
    description: 'For general inquiries, privacy, or legal matters.',
    links: [
      { label: 'privacy@cediwise.app', href: 'mailto:privacy@cediwise.app' },
      { label: 'legal@cediwise.app', href: 'mailto:legal@cediwise.app' },
    ],
  },
  {
    icon: MessageQuestionIcon,
    title: 'Support',
    description: 'App issues, feature requests, or bug reports.',
    links: [
      {
        label: 'Open an issue on GitHub',
        href: 'https://github.com/cediwise/cediwise/issues',
      },
    ],
  },
  {
    icon: CallIcon,
    title: 'Creator',
    description: 'Connect with Joshua Ansah, the developer behind CediWise.',
    links: [
      {
        label: 'Portfolio — joshua-ansah.vercel.app',
        href: 'https://joshua-ansah.vercel.app',
      },
    ],
  },
]

function ContactPage() {
  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50">
      {/* Background */}
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 h-[400px] w-[50dvw] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/3 left-0 h-[300px] w-[40dvw] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <main className="relative pt-32 pb-24">
        <div className="container mx-auto px-6 sm:px-12 max-w-4xl">
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

          <motion.header
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-16"
          >
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">
              Contact us
            </h1>
            <p className="mt-6 text-lg text-zinc-400 max-w-2xl">
              Questions, feedback, or support — we&apos;d love to hear from
              you. Choose the option that fits best.
            </p>
          </motion.header>

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-6"
          >
            {contactMethods.map((method, i) => (
              <motion.div
                key={method.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * (i + 1) }}
                className="rounded-2xl border border-white/5 bg-white/[0.02] p-6 backdrop-blur-sm transition-colors hover:border-white/10 hover:bg-white/[0.04]"
              >
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/20 text-primary">
                    <HugeiconsIcon icon={method.icon} className="size-6" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="text-lg font-semibold text-white">
                      {method.title}
                    </h2>
                    <p className="mt-2 text-sm text-zinc-400">
                      {method.description}
                    </p>
                    <div className="mt-4 flex flex-wrap gap-4">
                      {method.links.map((link) => (
                        <a
                          key={link.label}
                          href={link.href}
                          target={link.href.startsWith('http') ? '_blank' : undefined}
                          rel={
                            link.href.startsWith('http')
                              ? 'noopener noreferrer'
                              : undefined
                          }
                          className="text-sm font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
                        >
                          {link.label}
                        </a>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className="mt-12 text-sm text-zinc-500"
          >
            We typically respond within a few days. For urgent app issues,
            consider opening a GitHub issue if the project is open source.
          </motion.p>
        </div>
      </main>

      <Footer />
    </div>
  )
}
