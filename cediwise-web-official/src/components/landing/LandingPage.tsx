import { Footer } from '@/components/layout/Footer'
import { BottomCTA } from './BottomCTA'
import { FeatureSwitcher } from './FeatureSwitcher'
import { Hero } from './Hero'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-zinc-50">
      <main>
        <Hero />
        <FeatureSwitcher />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  )
}
