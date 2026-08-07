import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

interface LegalPageLayoutProps {
  title: string
  lastUpdated: string
  otherPageHref: string
  otherPageLabel: string
  children: React.ReactNode
}

export function LegalPageLayout({
  title,
  lastUpdated,
  otherPageHref,
  otherPageLabel,
  children,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-gray-100 px-6 py-5">
        <Link href="/">
          <Logo size="sm" />
        </Link>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="text-3xl font-bold md:text-4xl" style={{ color: '#185FA5' }}>
          {title}
        </h1>
        <p className="mt-2 text-sm text-gray-500">Last Updated: {lastUpdated}</p>

        <div className="mt-10 space-y-8 text-[15px] leading-[1.6] text-gray-700">{children}</div>

        <footer className="mt-16 flex flex-wrap items-center gap-4 border-t border-gray-100 pt-8 text-sm">
          <Link href={otherPageHref} className="font-medium hover:underline" style={{ color: '#185FA5' }}>
            {otherPageLabel}
          </Link>
          <Link href="/" className="text-gray-500 hover:underline">
            Back to home
          </Link>
        </footer>
      </main>
    </div>
  )
}
