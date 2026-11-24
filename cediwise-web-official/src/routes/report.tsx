'use client'

import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { useState } from 'react'
import type { WebsiteReportCategory } from '@/lib/websiteReport'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { createPageHead } from '@/lib/seo'
import {
  WEBSITE_REPORT_CATEGORIES,
  WEBSITE_REPORT_CATEGORY_LABELS,
  websiteReportSchema,
} from '@/lib/websiteReport'
import { submitReport } from '@/serverFns/report.functions'

export const Route = createFileRoute('/report')({
  component: ReportPage,
  head: () =>
    createPageHead({
      path: '/report',
      title: 'Report an issue',
      description:
        'Report a problem with the CediWise app, your account, or our content. Reports go straight to the CediWise team.',
    }),
})

type FormState = {
  category: WebsiteReportCategory | ''
  name: string
  email: string
  page: string
  message: string
  /** Honeypot. Stays empty for real visitors. */
  do_not_fill: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

const initialFormState: FormState = {
  category: '',
  name: '',
  email: '',
  page: '',
  message: '',
  do_not_fill: '',
}

const categoryOptions: Array<{ label: string; value: WebsiteReportCategory }> =
  WEBSITE_REPORT_CATEGORIES.map((value) => ({
    value,
    label: WEBSITE_REPORT_CATEGORY_LABELS[value],
  }))

function ReportPage() {
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [errors, setErrors] = useState<FormErrors>({})
  const [busy, setBusy] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  function updateField<TField extends keyof FormState>(
    key: TField,
    value: FormState[TField],
  ) {
    setFormState((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: undefined }))
    setGlobalError(null)
  }

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setGlobalError(null)

    const parsed = websiteReportSchema.safeParse({
      ...formState,
      category: formState.category || undefined,
    })
    if (!parsed.success) {
      const nextErrors: FormErrors = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormState | undefined
        if (key && !nextErrors[key]) nextErrors[key] = issue.message
      }
      setErrors(nextErrors)
      return
    }

    setBusy(true)
    try {
      const result = await submitReport({ data: parsed.data })
      if (!result.success) {
        setGlobalError(result.message)
        return
      }

      setSubmitted(true)
      setFormState(initialFormState)
      setErrors({})
    } catch {
      setGlobalError('Unable to send your report right now. Please try again shortly.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-zinc-50">
      <div className="fixed inset-0 -z-10 pointer-events-none">
        <div className="absolute top-0 right-0 h-[420px] w-[52dvw] rounded-full bg-primary/10 blur-[120px]" />
        <div className="absolute bottom-1/3 left-0 h-[320px] w-[40dvw] rounded-full bg-primary/5 blur-[100px]" />
      </div>

      <main className="relative pt-32 pb-24">
        <div className="container mx-auto max-w-3xl px-6 sm:px-12">
          <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} className="mb-10">
            <Link
              to="/feedback"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-primary"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              Back to feedback
            </Link>
          </motion.div>

          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Report an issue</h1>
            <p className="mt-4 max-w-2xl text-zinc-400">
              Tell us what went wrong with the app, your account, or our content. Your report goes
              straight to the CediWise team. Add an email if you want a reply.
            </p>
          </motion.header>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-sm"
          >
            <div aria-live="polite" className="sr-only">
              {submitted ? 'Report sent.' : globalError || ''}
            </div>

            {submitted ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-emerald-300">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-5" />
                  <span className="text-sm font-medium">Thanks. Your report reached the team.</span>
                </div>
                <p className="text-sm text-zinc-400">We read every report.</p>
                <Button onClick={() => setSubmitted(false)} className="h-10 rounded-xl">
                  Send another report
                </Button>
              </div>
            ) : (
              <form className="space-y-5" onSubmit={onSubmit} noValidate>
                {globalError ? (
                  <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-red-200">
                    {globalError}
                  </div>
                ) : null}

                <Field>
                  <FieldLabel htmlFor="report-category">What is this about?</FieldLabel>
                  <Select
                    items={categoryOptions}
                    value={formState.category || null}
                    onValueChange={(value) => updateField('category', value as WebsiteReportCategory)}
                  >
                    <SelectTrigger id="report-category" aria-invalid={!!errors.category}>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        {categoryOptions.map((option) => (
                          <SelectItem key={option.value} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  <FieldError id="report-category-error">{errors.category}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="report-message">What happened?</FieldLabel>
                  <Textarea
                    id="report-message"
                    rows={6}
                    placeholder="What did you do, what did you expect, and what happened instead?"
                    value={formState.message}
                    onChange={(event) => updateField('message', event.target.value)}
                    aria-invalid={!!errors.message}
                    aria-describedby="report-message-help report-message-error"
                  />
                  <p id="report-message-help" className="text-xs text-zinc-500">
                    Minimum 10 characters. {formState.message.trim().length}/3000
                  </p>
                  <FieldError id="report-message-error">{errors.message}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="report-email">Your email</FieldLabel>
                  <Input
                    id="report-email"
                    type="email"
                    autoComplete="email"
                    placeholder="you@example.com"
                    value={formState.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'report-email-error' : undefined}
                  />
                  <FieldError id="report-email-error">{errors.email}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="report-name">Name (optional)</FieldLabel>
                  <Input
                    id="report-name"
                    autoComplete="name"
                    value={formState.name}
                    onChange={(event) => updateField('name', event.target.value)}
                    aria-invalid={!!errors.name}
                    aria-describedby={errors.name ? 'report-name-error' : undefined}
                  />
                  <FieldError id="report-name-error">{errors.name}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="report-page">Page or screen (optional)</FieldLabel>
                  <Input
                    id="report-page"
                    placeholder="for example: /pricing or Budget tab"
                    value={formState.page}
                    onChange={(event) => updateField('page', event.target.value)}
                    aria-invalid={!!errors.page}
                    aria-describedby={errors.page ? 'report-page-error' : undefined}
                  />
                  <FieldError id="report-page-error">{errors.page}</FieldError>
                </Field>

                <div hidden aria-hidden="true">
                  <label htmlFor="report-do-not-fill">Leave this field empty</label>
                  <input
                    id="report-do-not-fill"
                    name="do_not_fill"
                    type="text"
                    tabIndex={-1}
                    autoComplete="off"
                    value={formState.do_not_fill}
                    onChange={(event) => updateField('do_not_fill', event.target.value)}
                  />
                </div>

                <Button type="submit" disabled={busy} className="h-11 rounded-xl px-6">
                  {busy ? 'Sending...' : 'Send report'}
                </Button>
              </form>
            )}
          </motion.section>
        </div>
      </main>

      <Footer />
    </div>
  )
}
