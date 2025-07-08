import { AuthForm } from "@/components/features/auth-form"

export default function LoginPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-pawn-bg">
      <div className="max-w-md w-full space-y-8 p-8">
        <div className="text-center">
          <img src="/logo.png" alt="PawnStaar" className="mx-auto h-12 w-auto" />
          <h2 className="mt-6 text-3xl font-bold text-pawn-primary">Welcome to PawnStaar</h2>
          <p className="mt-2 text-sm text-gray-600">Sign in to your account or create a new one</p>
        </div>
        <AuthForm />
      </div>
    </div>
  )
}
