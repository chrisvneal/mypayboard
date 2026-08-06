import Link from 'next/link'
import { Reveal } from './Reveal'

export function FinalCta() {
  return (
    <section className="final-cta">
      <Reveal className="wrap">
        <div className="eyebrow" style={{ margin: '0 auto 18px', width: 'fit-content' }}>
          <span className="dot" />
          Ready when you are
        </div>
        <h2>See what&apos;s coming before it&apos;s due.</h2>
        <p>Set up your first board in under two minutes.</p>
        <Link href="/sign-up" className="btn btn-primary btn-large">
          Get started free
        </Link>
      </Reveal>
    </section>
  )
}
