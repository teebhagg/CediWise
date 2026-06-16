'use client'

import { Link } from '@tanstack/react-router'
import { X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

const DISMISS_STORAGE_KEY = 'cediwise:salary-banner-dismissed'

export function SalaryCalculatorBanner() {
  const bannerRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_STORAGE_KEY) !== '1') {
        setVisible(true)
      }
    } catch {
      setVisible(true)
    }
  }, [])

  useEffect(() => {
    const root = document.documentElement

    if (!visible) {
      root.style.setProperty('--salary-banner-height', '0px')
      return
    }

    const el = bannerRef.current
    if (!el) return

    const syncHeight = () => {
      root.style.setProperty('--salary-banner-height', `${el.offsetHeight}px`)
    }

    syncHeight()
    const observer = new ResizeObserver(syncHeight)
    observer.observe(el)

    return () => {
      observer.disconnect()
      root.style.setProperty('--salary-banner-height', '0px')
    }
  }, [visible])

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_STORAGE_KEY, '1')
    } catch {
      // ignore
    }
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div
      ref={bannerRef}
      className="fixed inset-x-0 top-0 z-[60] border-b border-emerald-500/25 bg-emerald-950/95 backdrop-blur-md"
      role="region"
      aria-label="Salary calculator promotion"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5 sm:px-6 sm:py-3">
        <p className="min-w-0 flex-1 text-center text-sm leading-snug text-emerald-50 sm:text-left">
          <span className="sm:hidden">
            Verify PAYE &amp; SSNIT against GRA&apos;s 2026 tables —{' '}
          </span>
          <span className="hidden sm:inline">
            Run your pay through GRA&apos;s 2026 tables —{' '}
          </span>
          <Link
            to="/try-salary-calculator"
            className="font-semibold text-white underline decoration-emerald-400/70 underline-offset-2 transition-colors hover:text-emerald-100 hover:decoration-emerald-300"
          >
            Check my pay
          </Link>
        </p>
        <button
          type="button"
          onClick={dismiss}
          className={cn(
            'inline-flex size-8 shrink-0 items-center justify-center rounded-full text-emerald-200/90 transition-colors',
            'hover:bg-emerald-800/60 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50',
          )}
          aria-label="Dismiss salary calculator banner"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  )
}
