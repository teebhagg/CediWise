import { createFileRoute } from '@tanstack/react-router'
import { LandingPage } from '@/components/landing/LandingPage'
import { createPageHead, getAppSchema } from '@/lib/seo'

export const Route = createFileRoute('/')({
  component: App,
  head: () =>
    createPageHead({
      path: '/',
      title: 'CediWise - Salary, Tax & Finance App for Ghana',
      description:
        'CediWise helps Ghanaians manage salary, PAYE, SSNIT, budgeting, debt tracking, SME expenses, and financial literacy in one personal finance companion.',
      schemas: [getAppSchema()],
    }),
})

function App() {
  return <LandingPage />
}
