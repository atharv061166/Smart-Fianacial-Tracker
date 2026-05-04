"use client"

import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { useState } from "react"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"

export default function SimpleNavigation() {
  const router = useRouter()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)

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
            href="/dashboard"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Dashboard
          </Link>
          <Link
            href="/fingpt"
            className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            FinGPT
          </Link>
          <Button
            onClick={() => router.push('/login')}
            size="sm"
            className="ml-4 hover:scale-105 transition-transform"
          >
            Sign In
          </Button>
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
            href="/dashboard"
            className="block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            Dashboard
          </Link>
          <Link
            href="/fingpt"
            className="block text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors p-2 rounded-lg hover:bg-gray-50"
            onClick={() => setIsMobileMenuOpen(false)}
          >
            FinGPT
          </Link>
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
