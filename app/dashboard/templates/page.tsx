import { redirect } from 'next/navigation'
import { DASHBOARD_PATHS } from '@/lib/dashboard-pages'

export default function LegacyTemplatesRedirect() {
  redirect(DASHBOARD_PATHS.settingsTemplates)
}
