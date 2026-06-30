import Script from 'next/script'
import { THEME_INIT_SCRIPT } from '@/lib/theme-init-script'

/**
 * Applies saved theme class before paint, avoiding a light/dark flash on reload.
 * `beforeInteractive` runs before hydration and is excluded from hydration
 * diffing by Next.js, so it doesn't need (and must not use) a server/client branch.
 */
export function ThemeInitScript() {
  return (
    // eslint-disable-next-line @next/next/no-before-interactive-script-outside-document -- rule predates App Router's beforeInteractive support in app/layout.tsx; root layout is the documented location here.
    <Script
      id="mypayboard-theme-init"
      strategy="beforeInteractive"
      dangerouslySetInnerHTML={{ __html: THEME_INIT_SCRIPT }}
    />
  )
}
