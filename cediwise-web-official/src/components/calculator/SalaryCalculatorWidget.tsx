'use client'

import { AndroidIcon, AppleIcon } from '@/components/icons/StoreBrandIcons'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  computeGhanaTax2026Monthly,
  GRA_PAYE_REFERENCE_URL,
  MAX_GROSS_MONTHLY_SALARY,
  type GhanaTaxBreakdown,
} from '@/lib/ghanaTax'
import { formatGhs } from '@/lib/formatGhs'
import {
  DAILY_CALCULATOR_LIMIT,
  getUsageStatus,
  recordCalculatorUse,
} from '@/lib/salaryCalculatorUsage'
import {
  CEDIWISE_ANDROID_PLAY_STORE_URL,
  CEDIWISE_IOS_APP_STORE_URL,
} from '@/lib/storeLinks'
import { cn } from '@/lib/utils'
import { Link } from '@tanstack/react-router'
import { useCallback, useEffect, useId, useRef, useState } from 'react'

type SalaryCalculatorWidgetProps = {
  /** Pre-fill gross monthly salary (e.g. from /try-salary-calculator/$amount). */
  initialGross?: number
  /** Run calculation once on mount when initialGross is set. */
  autoRun?: boolean
}

type LimitState = {
  blocked: boolean
  remaining: number
  used: number
}

function parseGrossInput(value: string): number | null {
  const cleaned = value.replace(/,/g, '').trim()
  if (!cleaned) return null
  const n = Number(cleaned)
  if (!Number.isFinite(n) || n < 0) return null
  return n
}

export function SalaryCalculatorWidget({
  initialGross,
  autoRun = false,
}: SalaryCalculatorWidgetProps) {
  const inputId = useId()
  const autoRunDone = useRef(false)

  const [grossInput, setGrossInput] = useState(
    initialGross != null && initialGross > 0
      ? String(Math.round(initialGross))
      : '',
  )
  const [result, setResult] = useState<GhanaTaxBreakdown | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [limit, setLimit] = useState<LimitState>(() => {
    const status = getUsageStatus()
    return {
      blocked: !status.allowed,
      remaining: status.remaining,
      used: status.used,
    }
  })

  const refreshLimit = useCallback(() => {
    const status = getUsageStatus()
    setLimit({
      blocked: !status.allowed,
      remaining: status.remaining,
      used: status.used,
    })
  }, [])

  const runCalculation = useCallback(
    (gross: number) => {
      setError(null)

      if (gross <= 0) {
        setError('Enter a gross monthly salary greater than zero.')
        setResult(null)
        return
      }

      if (gross > MAX_GROSS_MONTHLY_SALARY) {
        setError(
          `Maximum supported salary is ${formatGhs(MAX_GROSS_MONTHLY_SALARY, 0)} per month.`,
        )
        setResult(null)
        return
      }

      const status = getUsageStatus()
      if (!status.allowed) {
        refreshLimit()
        setResult(null)
        return
      }

      const breakdown = computeGhanaTax2026Monthly(gross)
      recordCalculatorUse()
      refreshLimit()
      setResult(breakdown)
    },
    [refreshLimit],
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const gross = parseGrossInput(grossInput)
    if (gross == null) {
      setError('Enter a valid gross monthly salary in GHS.')
      setResult(null)
      return
    }
    runCalculation(gross)
  }

  useEffect(() => {
    refreshLimit()
  }, [refreshLimit])

  useEffect(() => {
    if (!autoRun || autoRunDone.current) return
    if (initialGross == null || initialGross <= 0) return
    autoRunDone.current = true
    runCalculation(initialGross)
  }, [autoRun, initialGross, runCalculation])

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-4 py-1.5 text-sm font-medium text-emerald-400">
          2026 GRA PAYE &amp; SSNIT
        </span>
        <h1 className="mt-6 text-3xl font-bold tracking-tight text-white sm:text-4xl">
          Check your take-home pay
        </h1>
        <p className="mt-4 text-zinc-400 leading-relaxed">
          Type your gross monthly salary. We show SSNIT, PAYE, and what lands in your account.
          {' '}
          <span className="text-zinc-500">
            {DAILY_CALCULATOR_LIMIT} free runs per day · Resets midnight Ghana time
          </span>
        </p>
        <p className="mt-3 text-sm">
          <a
            href={GRA_PAYE_REFERENCE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-emerald-400/90 underline underline-offset-4 transition-colors hover:text-emerald-300"
          >
            View GRA PAYE tax brackets
          </a>
          <span className="text-zinc-500"> · Ghana Revenue Authority</span>
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md sm:p-8"
      >
        <label htmlFor={inputId} className="text-sm font-medium text-zinc-300">
          Gross monthly salary (GHS)
        </label>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row">
          <Input
            id={inputId}
            type="text"
            inputMode="decimal"
            placeholder="e.g. 4500"
            value={grossInput}
            onChange={(e) => setGrossInput(e.target.value)}
            disabled={limit.blocked}
            className="h-12 flex-1 rounded-xl border-white/10 bg-black/40 text-lg text-white placeholder:text-zinc-600"
          />
          <Button
            type="submit"
            disabled={limit.blocked}
            className="h-12 rounded-xl bg-emerald-600 px-8 text-base font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            Calculate
          </Button>
        </div>

        <p className="mt-3 text-xs text-zinc-500">
          {limit.blocked ? (
            <span className="text-amber-400/90">
              Daily limit reached ({limit.used}/{DAILY_CALCULATOR_LIMIT} used)
            </span>
          ) : (
            <span>
              {limit.remaining} of {DAILY_CALCULATOR_LIMIT} free checks left today
            </span>
          )}
        </p>

        {error ? (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        ) : null}
      </form>

      {result ? (
        <div
          className="mt-8 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-6 sm:p-8"
          aria-live="polite"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">
            Your breakdown
          </p>
          <p className="mt-2 text-3xl font-bold text-white sm:text-4xl">
            {formatGhs(result.netTakeHome)}
            <span className="ml-2 text-base font-medium text-zinc-400">
              net / month
            </span>
          </p>

          <dl className="mt-8 space-y-3 border-t border-white/10 pt-6 text-sm">
            <Row label="Gross salary" value={formatGhs(result.grossMonthly)} />
            <Row
              label="SSNIT (employee 5.5%)"
              value={`− ${formatGhs(result.ssnit)}`}
              muted
            />
            <Row
              label="Chargeable income"
              value={formatGhs(result.chargeableIncome)}
              subtle
            />
            <Row label="PAYE" value={`− ${formatGhs(result.paye)}`} muted />
            <Row
              label="NHIS (employer, informational)"
              value={formatGhs(result.nhis)}
              subtle
            />
            <Row
              label="Net take-home"
              value={formatGhs(result.netTakeHome)}
              highlight
            />
          </dl>

          <p className="mt-6 text-xs leading-relaxed text-zinc-500">
            Estimate using 2026 GRA bands. Not from GRA directly.{' '}
            <a
              href={GRA_PAYE_REFERENCE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-zinc-400 underline underline-offset-2 transition-colors hover:text-emerald-400/90"
            >
              Official PAYE tables
            </a>
            . For saved breakdowns and unlimited checks, use the app.
          </p>
        </div>
      ) : null}

      {limit.blocked ? (
        <div className="mt-8 rounded-2xl border border-amber-500/25 bg-amber-500/5 p-6 sm:p-8">
          <h2 className="text-xl font-bold text-white">
            Daily limit reached ({DAILY_CALCULATOR_LIMIT}/{DAILY_CALCULATOR_LIMIT})
          </h2>
          <p className="mt-3 text-zinc-400 leading-relaxed">
            Get the app for unlimited checks, saved payslips, and budgeting from your real net pay.
          </p>
          <ul className="mt-4 space-y-2 text-sm text-zinc-300">
            <li>• Compare HR deductions to GRA</li>
            <li>• Unlimited salary runs</li>
            <li>• Save and share breakdowns</li>
            <li>• Budget from verified net income</li>
          </ul>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <a
              href={CEDIWISE_ANDROID_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/10 px-6 font-semibold text-white hover:bg-white/15',
              )}
            >
              <AndroidIcon className="size-5" />
              Get it on Android
            </a>
            <a
              href={CEDIWISE_IOS_APP_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                'inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-emerald-400/40 bg-emerald-600/80 px-6 font-semibold text-white hover:bg-emerald-600',
              )}
            >
              <AppleIcon className="size-[1.1rem]" />
              Download on iOS
            </a>
          </div>
          <p className="mt-4 text-xs text-zinc-500">
            Resets tomorrow at midnight (Ghana time).{' '}
            <Link to="/salary-calculator" className="text-primary underline-offset-4 hover:underline">
              Learn how PAYE works
            </Link>
          </p>
        </div>
      ) : (
        <div className="mt-8 rounded-2xl border border-white/10 bg-white/[0.02] p-6 text-center sm:p-8">
          <p className="text-sm text-zinc-400">
            Does your payslip match these numbers?
          </p>
          <div className="mt-4 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <a
              href={CEDIWISE_ANDROID_PLAY_STORE_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm font-semibold text-emerald-400 hover:text-emerald-300"
            >
              Get the app — unlimited checks
            </a>
            <span className="hidden text-zinc-600 sm:inline">·</span>
            <Link
              to="/salary-calculator"
              className="text-sm font-medium text-zinc-400 hover:text-white"
            >
              How PAYE &amp; SSNIT work
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function Row({
  label,
  value,
  muted,
  subtle,
  highlight,
}: {
  label: string
  value: string
  muted?: boolean
  subtle?: boolean
  highlight?: boolean
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt
        className={cn(
          'text-zinc-400',
          subtle && 'text-zinc-500 text-xs',
          highlight && 'font-semibold text-white',
        )}
      >
        {label}
      </dt>
      <dd
        className={cn(
          'font-medium tabular-nums text-white',
          muted && 'text-rose-300/90',
          subtle && 'text-zinc-500 text-xs',
          highlight && 'text-lg font-bold text-emerald-400',
        )}
      >
        {value}
      </dd>
    </div>
  )
}
