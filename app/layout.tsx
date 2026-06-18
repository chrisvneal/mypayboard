import type { Metadata } from 'next'
import { Plus_Jakarta_Sans } from 'next/font/google'
import { ThemeInitScript } from '@/components/ThemeInitScript'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['300', '400', '500', '600', '700', '800'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'MyPayBoard',
  description: 'Household financial command center',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={plusJakartaSans.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <ThemeInitScript />
      </head>
      <body className={`${plusJakartaSans.className} font-sans antialiased`}>{children}</body>
    </html>
  )
}
