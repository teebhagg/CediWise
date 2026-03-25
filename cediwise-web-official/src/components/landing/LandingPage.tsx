import { Footer } from '@/components/layout/Footer'
import { BottomCTA } from './BottomCTA'
import { FeatureSwitcher } from './FeatureSwitcher'
import { Hero } from './Hero'
import { Pricing } from './Pricing'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-zinc-50">
      <main>
        <Hero />
        <FeatureSwitcher />
        <Pricing />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  )
}
