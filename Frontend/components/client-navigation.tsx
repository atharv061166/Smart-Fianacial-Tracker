"use client"

import Link from "next/link"
import Image from "next/image"
import { LogOut, User, Menu, X } from "lucide-react"
import { useEffect, useState } from "react"
import { onAuthStateChanged, logOut } from "@/lib/firebase-auth"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// Client-side only component for user profile
function UserProfile({ user }: { user: any }) {
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await logOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="relative h-10 w-10 rounded-full">
          {user.photoURL ? (
            <Image
              src={user.photoURL}
              alt={user.displayName || "User"}
              width={40}
              height={40}
              className="rounded-full"
            />
          ) : (
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="flex items-center justify-start gap-2 p-2">
          <div className="flex flex-col space-y-1 leading-none">
            {user.displayName && (
              <p className="font-medium">{user.displayName}</p>
            )}
            {user.email && (
              <p className="w-[200px] truncate text-sm text-muted-foreground">
                {user.email}
              </p>
            )}
          </div>
        </div>
        <DropdownMenuItem
          className="flex items-center gap-2 text-red-600 hover:text-red-600 hover:bg-red-50/10 cursor-pointer"
          onClick={handleLogout}
        >
          <LogOut className="h-4 w-4" />
          <span>Log out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export default function ClientNavigation() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged((currentUser) => {
      setUser(currentUser)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [])

  // Close mobile menu when route changes
  useEffect(() => {
    const handleRouteChange = () => setIsMobileMenuOpen(false)
    window.addEventListener('popstate', handleRouteChange)
    return () => window.removeEventListener('popstate', handleRouteChange)
  }, [])

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <Image
            src="/images/finance-logo.png"
            alt="FinanceBuddy Logo"
            width={40}
            height={40}
            className="object-contain"
            priority
          />
          <span className="text-xl font-bold text-gray-900">FinanceBuddy</span>
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="md:hidden p-2 text-gray-600 hover:text-gray-900 transition-colors"
          aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
        >
          {isMobileMenuOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </button>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6">
          <Link
            href="#features"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Features
          </Link>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href={user ? "/fingpt" : "/login"}
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            FinGPT
          </Link>
          {isLoading ? (
            <div className="w-20 h-8 bg-gray-200 animate-pulse rounded" />
          ) : !user ? (
            <Button
              onClick={() => router.push('/login')}
              size="sm"
              className="ml-4 hover:scale-105 transition-transform"
            >
              Sign In
            </Button>
          ) : (
            <UserProfile user={user} />
          )}
        </nav>
      </div>

      {/* Mobile Navigation Menu */}
      <div
        className={`
          fixed inset-x-0 top-[64px] bg-white border-b md:hidden
          transform transition-all duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
        `}
      >
        <nav className="container py-4 px-4 space-y-4">
          <Link
            href="#features"
            className="block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Features
          </Link>
          <Link
            href={user ? "/dashboard" : "/login"}
            className="block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href={user ? "/fingpt" : "/login"}
            className="block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            FinGPT
          </Link>
          {isLoading ? (
            <div className="w-full h-8 bg-gray-200 animate-pulse rounded" />
          ) : !user ? (
            <Button
              onClick={() => {
                setIsMobileMenuOpen(false)
                router.push('/login')
              }}
              size="sm"
              className="w-full hover:scale-105 transition-transform"
            >
              Sign In
            </Button>
          ) : (
            <div className="pt-2 border-t">
              <UserProfile user={user} />
            </div>
          )}
        </nav>
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/20 md:hidden z-40"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  )
}
