import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export function MarketingNav() {
  return (
    <header className="site">
      <nav className="nav wrap">
        <div className="logo">
          <Logo size="sm" />
        </div>
        <div className="nav-links">
          <a className="navlink" href="#how">
            How it works
          </a>
          <a className="navlink" href="#together">
            Built for two
          </a>
        </div>
        <div className="nav-cta">
          <Link className="nav-signin" href="/sign-in">
            Log in
          </Link>
          <Link className="btn btn-primary" href="/sign-up">
            Get started free
          </Link>
        </div>
      </nav>
    </header>
  )
}
