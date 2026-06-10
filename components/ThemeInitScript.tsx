'use client'

import { THEME_INIT_SCRIPT } from '@/lib/theme-init-script'

/**
 * Applies saved theme class before paint. Rendered only during SSR — returns null
 * on the client so React 19 does not warn about script tags in the component tree.
 * The inline script from the initial HTML has already run by hydration time.
 */
export function ThemeInitScript() {
  if (typeof window !== 'undefined') return null

  return (
    <script
      id="mypayboard-theme-init"
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  )
}
