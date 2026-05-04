import Image from "next/image"
import Link from "next/link"
import dynamic from "next/dynamic"

// Import client components dynamically for better performance
const LoginForm = dynamic(() => import("@/components/login-form"), {
  loading: () => (
    <div className="max-w-md w-full space-y-8 animate-pulse">
      <div className="h-8 bg-gray-200 rounded w-3/4 mx-auto"></div>
      <div className="space-y-4">
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
        <div className="h-10 bg-gray-200 rounded"></div>
      </div>
    </div>
  )
})

// Static metadata for SEO
export const metadata = {
  title: 'Sign In - FinanceBuddy',
  description: 'Sign in to your FinanceBuddy account to manage your finances',
}

// Server-side rendered component (static content)
export default function LoginPage() {

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-gray-900 to-black py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Static header content */}
        <div className="text-center">
          <div className="flex justify-center">
            <Link href="/home">
              <Image
                src="/images/finance-logo.png"
                alt="FinanceBuddy Logo"
                width={48}
                height={48}
                className="mx-auto hover:opacity-80 transition-opacity"
                priority
              />
            </Link>
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-white">
            Welcome back
          </h2>
          <p className="mt-2 text-sm text-gray-400">
            Don&apos;t have an account?{" "}
            <Link href="/signup" className="font-medium text-primary hover:text-primary/90 transition-colors">
              Sign up
            </Link>
          </p>
        </div>

        {/* Dynamic login form */}
        <LoginForm />
      </div>
    </div>
  )
}