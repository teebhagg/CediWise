import { FeatureInsightLayout } from '@/components/features/FeatureInsightLayout'
import { createPageHead } from '@/lib/seo'
import { Book04Icon } from '@hugeicons/core-free-icons'
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/financial-literacy')({
  component: FinancialLiteracyPage,
  head: () =>
    createPageHead({
      path: '/financial-literacy',
      title: 'Financial Literacy',
      description:
        'Level up your money game with curated tips and insights. Built to help every Ghanaian worker build wealth.',
    }),
})

const highlights = [
  {
    title: 'Curated lessons',
    description:
      'Short, practical lessons on budgeting, saving, investing, and avoiding debt. No jargon.',
  },
  {
    title: 'Ghana context',
    description:
      'Content tailored to Ghana — mobile money, Treasury Bills, GSE, local banks, and real-life scenarios.',
  },
  {
    title: 'Learn at your pace',
    description:
      'Complete lessons in a few minutes. Build habits over time without overwhelm.',
  },
  {
    title: 'Action-oriented',
    description:
      'Every lesson includes a small action you can take today. Knowledge becomes behavior.',
  },
  {
    title: 'Growing library',
    description:
      'New content added regularly. Stay informed on savings, investments, and financial wellness.',
  },
  {
    title: 'Free for everyone',
    description:
      'Financial literacy shouldn&apos;t cost money. CediWise lessons are free for all users.',
  },
]

function FinancialLiteracyPage() {
  return (
    <FeatureInsightLayout
      title="Financial Literacy"
      tagline="Learn & Grow"
      description="Level up your money game with curated tips and insights. Built to help every Ghanaian worker build wealth."
      icon={Book04Icon}
      iconBgColor="bg-orange-500/30"
      image="/assets/img_4.png"
      highlights={highlights}
    >
      <h2>How it works</h2>
      <p>
        Access bite-sized lessons on budgeting, saving, investing, mobile
        money, and avoiding debt. Each lesson is designed to be completed in
        under 5 minutes. Track your progress, revisit topics, and apply what
        you learn directly in the CediWise app.
      </p>

      <h2>Built for Ghana</h2>
      <p>
        Our content reflects real Ghanaian contexts: MTN MoMo, Vodafone Cash,
        Treasury Bills, the Ghana Stock Exchange, local banks, and common
        financial pitfalls. No generic advice — we speak your language and
        your economy.
      </p>

      <h2>Why it matters</h2>
      <p>
        Financial literacy is one of the biggest gaps holding Ghanaians back.
        Many people earn well but struggle to save or invest. Education
        changes that. With CediWise, you get tools and knowledge in one
        place — so you can plan, save, and invest for a rainy day.
      </p>
    </FeatureInsightLayout>
  )
}
