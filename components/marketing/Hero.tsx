import Link from 'next/link'
import { CardFan } from './CardFan'

export function Hero() {
  return (
    <section className="hero">
      <div className="wrap hero-grid">
        <div>
          <div className="eyebrow">
            <span className="dot" />
            Paycheck-first budgeting
          </div>
          <h1 className="hero-headline">
            Know what&apos;s coming out
            <br />
            before it comes <span className="accent">in.</span>
          </h1>
          <p className="hero-sub">
            Build boards around when money actually lands — one paycheck or several, all in one place. See
            what&apos;s due, what&apos;s paid, and what&apos;s left before the next one hits.{' '}
            <strong>Built for two</strong>, so nobody&apos;s guessing.
          </p>
          <div className="hero-actions">
            <Link href="/sign-up" className="btn btn-primary btn-large">
              Start free
            </Link>
            <a href="#how" className="btn btn-ghost btn-large">
              See how it works →
            </a>
          </div>
          <div className="hero-trust">
            <svg
              width="15"
              height="15"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#3A9D5D"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            No bank connections. No linked accounts. Your numbers stay yours.
          </div>
        </div>

        <CardFan />
      </div>
    </section>
  )
}
