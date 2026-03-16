import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/components/landing/LandingPage'
import { createPageHead } from '@/lib/seo'

export const Route = createFileRoute('/')({
  component: App,
  head: () =>
    createPageHead({
      path: '/',
      title: 'CediWise — Salary Calculator & Budget App for Ghana',
      description:
        'Calculate SSNIT (Social Security) & PAYE (Income Tax) for Ghana 2026, plan budgets, track Small and Medium Enterprise (SME) expenses, monitor debts, and build financial literacy in one app.',
    }),
})

function App() {
  return <LandingPage />
}