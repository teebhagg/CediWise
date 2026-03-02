'use client'

import {
  ArrowLeft01Icon,
  CheckmarkCircle01Icon,
} from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { Link, createFileRoute } from '@tanstack/react-router'
import { motion } from 'framer-motion'
import { Star } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { FeedbackCategory } from '@/serverFns/feedback.functions'
import { submitFeedback } from '@/serverFns/feedback.functions'
import { Footer } from '@/components/layout/Footer'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
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

export const Route = createFileRoute('/feedback')({
  component: FeedbackPage,
  head: () =>
    createPageHead({
      path: '/feedback',
      title: 'Leave Feedback',
      description:
        'Share your beta feedback for CediWise. Report bugs, request features, and help us improve your experience.',
    }),
})

type FormState = {
  category: FeedbackCategory | ''
  rating: number
  feedback_text: string
  email: string
}

type FormErrors = Partial<Record<keyof FormState, string>>

const initialFormState: FormState = {
  category: '',
  rating: 0,
  feedback_text: '',
  email: '',
}

const categoryOptions: Array<{ label: string; value: FeedbackCategory }> = [
  { label: 'Bug Report', value: 'bug_report' },
  { label: 'Feature Request', value: 'feature_request' },
  { label: 'General Comment', value: 'general_comment' },
]

function FeedbackPage() {
  const [formState, setFormState] = useState<FormState>(initialFormState)
  const [errors, setErrors] = useState<FormErrors>({})
  const [busy, setBusy] = useState(false)
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const feedbackLength = formState.feedback_text.trim().length
  const feedbackTooShort = feedbackLength > 0 && feedbackLength < 10

  const isFormValid = useMemo(() => {
    return (
      !!formState.category &&
      formState.rating >= 1 &&
      feedbackLength >= 10 &&
      formState.email.trim().length > 0
    )
  }, [feedbackLength, formState.category, formState.email, formState.rating])

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

    const nextErrors: FormErrors = {}
    if (!formState.category) nextErrors.category = 'Please select a category'
    if (!formState.rating) nextErrors.rating = 'Please provide a rating'
    if (feedbackLength < 10) {
      nextErrors.feedback_text = 'Feedback must be at least 10 characters'
    }
    if (!formState.email.trim()) {
      nextErrors.email = 'Email is required'
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setBusy(true)
    try {
      const result = await submitFeedback({
        data: {
          category: formState.category as FeedbackCategory,
          rating: formState.rating,
          feedback_text: formState.feedback_text,
          email: formState.email,
        },
      })

      if (!result.success) {
        setGlobalError(result.message)
        return
      }

      setSubmitted(true)
      setFormState(initialFormState)
      setErrors({})
    } catch {
      setGlobalError('Unable to submit feedback right now. Please try again.')
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
              to="/"
              className="inline-flex items-center gap-2 text-sm font-medium text-zinc-400 transition-colors hover:text-primary"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} className="size-4" />
              Back to home
            </Link>
          </motion.div>

          <motion.header
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
            className="mb-8"
          >
            <h1 className="text-4xl font-bold tracking-tight text-white sm:text-5xl">Leave feedback</h1>
            <p className="mt-4 max-w-2xl text-zinc-400">
              Your beta feedback helps us improve CediWise faster. Tell us what worked, what broke, and what you want next.
            </p>
          </motion.header>

          <motion.section
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 }}
            className="rounded-2xl border border-white/10 bg-white/[0.03] p-6 sm:p-8 backdrop-blur-sm"
          >
            <div aria-live="polite" className="sr-only">
              {submitted ? 'Feedback submitted successfully.' : globalError || ''}
            </div>

            {submitted ? (
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 text-emerald-300">
                  <HugeiconsIcon icon={CheckmarkCircle01Icon} className="size-5" />
                  <span className="text-sm font-medium">Thanks, your feedback was sent.</span>
                </div>
                <p className="text-sm text-zinc-400">Your input helps shape the next beta updates.</p>
                <Button onClick={() => setSubmitted(false)} className="h-10 rounded-xl">
                  Send another feedback
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
                  <FieldLabel htmlFor="feedback-category">Category</FieldLabel>
                  <Select
                    items={categoryOptions}
                    value={formState.category || null}
                    onValueChange={(value) =>
                      updateField('category', value as FeedbackCategory)
                    }
                  >
                    <SelectTrigger id="feedback-category" aria-invalid={!!errors.category}>
                      <SelectValue placeholder="Select category" />
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
                  <FieldError id="feedback-category-error">{errors.category}</FieldError>
                </Field>

                <Field>
                  <FieldLabel id="rating-label">Rate your experience</FieldLabel>
                  <div
                    role="radiogroup"
                    aria-labelledby="rating-label"
                    aria-describedby={errors.rating ? 'feedback-rating-error' : undefined}
                    className="flex items-center gap-2"
                  >
                    {[1, 2, 3, 4, 5].map((value) => {
                      const selected = formState.rating >= value
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={formState.rating === value}
                          aria-label={`${value} star${value > 1 ? 's' : ''}`}
                          onClick={() => updateField('rating', value)}
                          onKeyDown={(event) => {
                            if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
                              event.preventDefault()
                              updateField('rating', Math.min(5, Math.max(1, formState.rating + 1)))
                            }
                            if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
                              event.preventDefault()
                              updateField('rating', Math.max(1, formState.rating - 1))
                            }
                          }}
                          className="rounded-md p-1.5 text-zinc-500 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                        >
                          <Star
                            className={selected ? 'size-6 fill-primary text-primary' : 'size-6'}
                            aria-hidden="true"
                          />
                        </button>
                      )
                    })}
                  </div>
                  <FieldError id="feedback-rating-error">{errors.rating}</FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="feedback-text">Feedback</FieldLabel>
                  <Textarea
                    id="feedback-text"
                    rows={6}
                    placeholder="Share your experience, issues, or suggestions"
                    value={formState.feedback_text}
                    onChange={(event) => updateField('feedback_text', event.target.value)}
                    aria-invalid={!!errors.feedback_text || feedbackTooShort}
                    aria-describedby="feedback-text-help feedback-text-error"
                  />
                  <p id="feedback-text-help" className="text-xs text-zinc-500">
                    Minimum 10 characters. {feedbackLength}/2000
                  </p>
                  <FieldError id="feedback-text-error">
                    {errors.feedback_text || (feedbackTooShort ? 'Feedback must be at least 10 characters' : '')}
                  </FieldError>
                </Field>

                <Field>
                  <FieldLabel htmlFor="feedback-email">Email (for follow-up)</FieldLabel>
                  <Input
                    id="feedback-email"
                    type="email"
                    required
                    placeholder="you@example.com"
                    value={formState.email}
                    onChange={(event) => updateField('email', event.target.value)}
                    aria-invalid={!!errors.email}
                    aria-describedby={errors.email ? 'feedback-email-error' : undefined}
                  />
                  <FieldError id="feedback-email-error">{errors.email}</FieldError>
                </Field>

                <Button type="submit" disabled={!isFormValid || busy} className="h-11 rounded-xl px-6">
                  {busy ? 'Sending...' : 'Send Feedback'}
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
