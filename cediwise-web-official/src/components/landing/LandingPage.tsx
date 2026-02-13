import { BottomCTA } from './BottomCTA'
import { FeatureSwitcher } from './FeatureSwitcher'
import { Hero } from './Hero'
import { Footer } from '@/components/layout/Footer'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-zinc-50">
      <Hero />

      <FeatureSwitcher />

      <BottomCTA />

      <Footer />
    </div>
  )
}
