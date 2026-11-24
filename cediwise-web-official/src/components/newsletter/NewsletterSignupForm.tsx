'use client'

import { ArrowRight01Icon, CheckmarkCircle01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useState } from 'react'
import { subscribeNewsletter } from '@/serverFns/newsletter.functions'
import { Button } from '@/components/ui/button'

type NewsletterSignupFormProps = {
  source: 'footer'
  compact?: boolean
}

export function NewsletterSignupForm({ source, compact = false }: NewsletterSignupFormProps) {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('sending')
    setMessage('')

    try {
      const result = await subscribeNewsletter({ data: { email, source } })
      if (!result.success) {
        setStatus('error')
        setMessage(result.message)
        return
      }
      setStatus('success')
      setMessage(result.message)
      setEmail('')
    } catch {
      setStatus('error')
      setMessage('Unable to subscribe right now. Please try again shortly.')
    }
  }

  if (status === 'success') {
    return (
      <div className="rounded-2xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100" role="status" aria-live="polite">
        <div className="flex items-start gap-2">
          <HugeiconsIcon icon={CheckmarkCircle01Icon} className="mt-0.5 size-5 shrink-0 text-emerald-300" />
          <span>{message}</span>
        </div>
      </div>
    )
  }

  return (
    <form className={compact ? 'space-y-3' : 'space-y-4'} onSubmit={onSubmit} noValidate>
      <label className="sr-only" htmlFor={`newsletter-email-${source}`}>Email address</label>
      <div className={compact ? 'relative' : 'flex flex-col gap-3 sm:flex-row'}>
        <input
          id={`newsletter-email-${source}`}
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          maxLength={255}
          value={email}
          onChange={(event) => {
            setEmail(event.target.value)
            if (status === 'error') setStatus('idle')
          }}
          placeholder="Enter your email"
          aria-invalid={status === 'error'}
          aria-describedby={status === 'error' ? `newsletter-error-${source}` : undefined}
          className={compact ? 'w-full rounded-2xl border border-white/10 bg-white/5 py-4 px-6 pr-16 text-sm text-white placeholder:text-zinc-500 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20' : 'min-h-12 flex-1 rounded-xl border border-white/10 bg-white/5 px-4 text-white placeholder:text-zinc-500 outline-none transition-all focus:border-primary/50 focus:ring-2 focus:ring-primary/20'}
        />
        {compact ? (
          <button
            type="submit"
            disabled={status === 'sending'}
            aria-label="Subscribe to CediWise Money Brief"
            className="absolute right-2 top-2 flex size-10 items-center justify-center rounded-xl bg-primary text-black transition-all hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <HugeiconsIcon icon={ArrowRight01Icon} className="size-5" />
          </button>
        ) : (
          <Button type="submit" size="lg" className="min-h-12 rounded-xl px-6" disabled={status === 'sending'}>
            {status === 'sending' ? 'Joining…' : 'Get the weekly brief'}
          </Button>
        )}
      </div>
      {status === 'error' ? <p id={`newsletter-error-${source}`} className="text-sm text-red-300" role="alert">{message}</p> : null}
      <p className="text-xs leading-relaxed text-zinc-500">By subscribing, you agree to receive the CediWise Money Brief. Unsubscribe anytime.</p>
    </form>
  )
}
