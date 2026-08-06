import Link from 'next/link'
import { Logo } from '@/components/ui/Logo'

export default function PrivacyPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-6 py-16 text-center">
      <Logo size="md" />
      <div className="max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900">Privacy Policy</h1>
        <p className="mt-3 text-sm leading-relaxed text-gray-500">
          MyPayBoard is in private beta. A full privacy policy will be published here before general
          availability.
        </p>
      </div>
      <Link href="/" className="text-sm font-medium hover:underline" style={{ color: '#185FA5' }}>
        Back to home
      </Link>
    </div>
  )
}
