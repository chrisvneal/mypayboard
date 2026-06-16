import type { Metadata } from 'next'
import { Manrope } from 'next/font/google'
import { ThemeInitScript } from '@/components/ThemeInitScript'
import './globals.css'

const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
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
    <html lang="en" className={manrope.variable} suppressHydrationWarning data-scroll-behavior="smooth">
      <head>
        <ThemeInitScript />
      </head>
      <body className={`${manrope.className} font-sans antialiased`}>{children}</body>
    </html>
  )
}
