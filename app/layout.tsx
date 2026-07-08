import type { Metadata } from 'next'
import { Plus_Jakarta_Sans, Manrope, Nunito } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { ThemeInitScript } from '@/components/ThemeInitScript'
import './globals.css'

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  weight: ['500', '600', '700', '800'],
  display: 'swap',
})

const manrope = Manrope({
  subsets: ['latin'],
  variable: '--font-manrope',
  weight: ['400', '500', '600', '700', '800'],
  display: 'swap',
})

const nunito = Nunito({
  subsets: ['latin'],
  variable: '--font-nunito',
  weight: ['600'],
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
    <ClerkProvider>
      <html lang="en" className={`${manrope.variable} ${plusJakartaSans.variable} ${nunito.variable}`} suppressHydrationWarning data-scroll-behavior="smooth">
        <head>
          <ThemeInitScript />
        </head>
        <body className={`${manrope.className} font-sans antialiased`}>{children}</body>
      </html>
    </ClerkProvider>
  )
}
