import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export function MarketingFooter() {
  return (
    <footer className="site-footer">
      <div
        className="wrap"
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px', width: '100%' }}
      >
        <Logo size="sm" />
        <div className="flinks">
          <Link href="/privacy">Privacy</Link>
          <Link href="/terms">Terms</Link>
          {/* Contact: no support inbox exists yet — intentionally left as a dead link until one does */}
          <a href="#">Contact</a>
        </div>
        <div>© 2026 MyPayBoard</div>
      </div>
    </footer>
  )
}
