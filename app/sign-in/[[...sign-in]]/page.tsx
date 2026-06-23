import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div
      className="flex min-h-screen items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #E6F1FB 100%)' }}
    >
      <SignIn />
    </div>
  )
}
