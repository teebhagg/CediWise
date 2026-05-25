import { BottomCTA } from './BottomCTA'
import { FeatureSwitcher } from './FeatureSwitcher'
import { Hero } from './Hero'
import { IntroVideo } from './IntroVideo'
import { Pricing } from './Pricing'
import { Footer } from '@/components/layout/Footer'

export function LandingPage() {
  return (
    <div className="min-h-screen bg-background text-zinc-50">
      <main>
        <Hero />
        <IntroVideo />
        <FeatureSwitcher />
        <Pricing />
        <BottomCTA />
      </main>
      <Footer />
    </div>
  )
}
