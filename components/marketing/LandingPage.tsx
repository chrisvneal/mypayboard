import { Bricolage_Grotesque } from 'next/font/google'
import { MarketingNav } from './MarketingNav'
import { Hero } from './Hero'
import { HowItWorks } from './HowItWorks'
import { CardShowcase } from './CardShowcase'
import { BuiltForTwo } from './BuiltForTwo'
import { FinalCta } from './FinalCta'
import { MarketingFooter } from './MarketingFooter'

const bricolage = Bricolage_Grotesque({
  subsets: ['latin'],
  variable: '--font-bricolage',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

export function LandingPage() {
  return (
    <div className={`${bricolage.variable} marketing-page`}>
      <MarketingNav />
      <Hero />
      <HowItWorks />
      <CardShowcase />
      <BuiltForTwo />
      <FinalCta />
      <MarketingFooter />
    </div>
  )
}
