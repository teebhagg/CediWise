import { Link } from '@tanstack/react-router'
import { DAILY_CALCULATOR_LIMIT } from '@/lib/salaryCalculatorUsage'

export const HOME_FAQ = [
  {
    question: 'Is the salary calculator free?',
    answer: `Yes. The web salary calculator is free and gives ${DAILY_CALCULATOR_LIMIT} free checks per day on the website. The limit resets at midnight Ghana time. Smart Budget and SME Ledger are paid app plans, and each includes a 30-day free trial.`,
  },
  {
    question: 'Does CediWise use the 2026 GRA tax bands?',
    answer:
      'Yes. PAYE and SSNIT calculations use the GRA 2026 tax bands and SSNIT rules, and the calculator shows each deduction on its own line. Check the figures against official GRA guidance before you file a return or query a payslip.',
  },
  {
    question: 'How do I check my payslip with CediWise?',
    answer:
      'Enter your gross monthly pay, then compare the take-home pay, PAYE, and SSNIT figures with the amounts on your payslip. A difference is a prompt to ask HR or payroll for the breakdown. It does not prove an error on its own.',
  },
  {
    question: 'Can CediWise help me budget in cedis?',
    answer:
      'Yes. Smart Budget sets a safe-to-spend limit after needs, wants, and savings. It includes recurring bills, spending charts by category, a debt dashboard with payoff plans, and offline sync for budget data.',
  },
  {
    question: 'Can CediWise track VAT for a small business?',
    answer:
      'Yes. The SME Ledger records sales and expenses, applies 20% VAT under VAT Act 1151, and alerts you as turnover nears GHS 750,000. It also produces a monthly profit and loss summary and a CSV export for your accountant.',
  },
  {
    question: 'Which devices is the app on?',
    answer:
      'The CediWise app is available on Android through Google Play and on iOS through the App Store. The salary calculator also runs in any modern web browser.',
  },
  {
    question: 'Is CediWise built for Ghana only?',
    answer:
      'CediWise is built around Ghana. It covers GRA tax bands, SSNIT pension rules, mobile money (MoMo) budgeting, and the VAT Act for small businesses. Rules change, so confirm current figures with the relevant Ghanaian authority.',
  },
]

export function HomeFaq() {
  return (
    <section
      aria-labelledby="home-faq-heading"
      className="relative py-24 lg:py-32"
    >
      <div className="container mx-auto max-w-3xl px-6">
        <p className="mb-3 text-sm font-medium uppercase tracking-widest text-primary">
          Help
        </p>
        <h2
          id="home-faq-heading"
          className="text-3xl font-bold tracking-tight text-white sm:text-4xl"
        >
          Common questions
        </h2>

        <div className="mt-10 space-y-6">
          {HOME_FAQ.map((item) => (
            <div
              key={item.question}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur-md"
            >
              <h3 className="text-lg font-semibold text-white">
                {item.question}
              </h3>
              <p className="mt-3 leading-relaxed text-zinc-400">
                {item.answer}
              </p>
            </div>
          ))}
        </div>

        <p className="mt-10 text-zinc-400">
          Compare plans on the{' '}
          <Link
            to="/pricing"
            className="text-primary underline underline-offset-4"
          >
            pricing page
          </Link>{' '}
          or run your figures in the{' '}
          <Link
            to="/salary-calculator"
            className="text-primary underline underline-offset-4"
          >
            salary calculator guide
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
