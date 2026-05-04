"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { TrendingUp, HelpCircle, Loader2 } from "lucide-react"
import Image from "next/image"
import { useEffect, useState, Suspense, useCallback } from "react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useFinance } from "@/hooks/useFinance"
import { Transaction } from "@/types/finance"
import { LoadingSkeleton } from "@/components/loading-skeleton"
import { TransactionDateFilter } from "@/components/transaction-date-filter"

// Lazy load heavy components
const DashboardNav = dynamic(
  () => import("@/components/dashboard-nav").then((mod) => ({ default: mod.DashboardNav })),
  {
    loading: () => <LoadingSkeleton type="nav" />
  }
)

const IncomeCategories = dynamic(
  () => import("@/components/income-categories").then((mod) => ({ default: mod.IncomeCategories })),
  {
    loading: () => <LoadingSkeleton type="card" />
  }
)

const IncomeList = dynamic(
  () => import("@/components/income-list").then((mod) => ({ default: mod.IncomeList })),
  {
    loading: () => <LoadingSkeleton type="list" />
  }
)

export default function IncomePage() {
  const router = useRouter()
  const [user, setUser] = useState(auth.currentUser)
  const {
    loading: dataLoading,
    error: dataError,
    credits,
    refresh
  } = useFinance()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [income, setIncome] = useState<Transaction[]>([])
  const [filteredIncome, setFilteredIncome] = useState<Transaction[]>([])

  // Handle authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Update income when credits data changes
  useEffect(() => {
    if (credits && Array.isArray(credits)) {
      // Convert credits to Transaction format with type
      const incomeTransactions: Transaction[] = credits.map(credit => ({
        ...credit,
        type: 'credit' as const
      }))
      setIncome(incomeTransactions)
      setFilteredIncome(incomeTransactions) // Initialize filtered income
    } else {
      setIncome([])
      setFilteredIncome([])
    }
  }, [credits])

  // Handle date filter changes
  const handleFilterChange = useCallback((filtered: Transaction[]) => {
    setFilteredIncome(filtered)
  }, [])

  // Add a refresh button to manually trigger data fetch
  const handleRefresh = () => {
    if (!user) return
    refresh()
  }

  if (loading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (error || dataError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error || dataError}</p>
          <Button onClick={handleRefresh} className="mt-4">
            Try Again
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="border-b">
        <div className="flex h-16 items-center px-4">
          <div className="flex items-center gap-2">
            <Link href="/home" className="flex items-center gap-2">
              <Image
                src="/images/finance-logo.png"
                alt="FinanceBuddy Logo"
                width={40}
                height={40}
                className="object-contain"
                priority
              />
              <span className="text-xl font-bold">FinanceBuddy</span>
            </Link>
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <HelpCircle className="h-5 w-5" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button variant="ghost" size="sm" className="gap-2">
              {user?.photoURL ? (
                <Image
                  src={user.photoURL}
                  width={32}
                  height={32}
                  alt="Avatar"
                  className="rounded-full"
                />
              ) : (
                <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-primary font-medium">
                    {user?.displayName?.[0] || user?.email?.[0] || 'U'}
                  </span>
                </div>
              )}
              <span>{user?.displayName || user?.email?.split('@')[0] || 'User'}</span>
            </Button>
          </div>
        </div>
      </div>
      <div className="grid flex-1 md:grid-cols-[240px_1fr]">
        <DashboardNav className="hidden border-r md:block" />
        <main className="flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Income Tracking</h1>
              <p className="text-muted-foreground">Track, categorize, and analyze your income sources</p>
            </div>
          </div>

          {/* Date Filter */}
          <TransactionDateFilter
            transactions={income}
            onFilterChange={handleFilterChange}
          />

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Recent Income</CardTitle>
                  <CardDescription>Your latest income transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <IncomeList transactions={filteredIncome} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Income Categories</CardTitle>
                  <CardDescription>Your income by source</CardDescription>
                </CardHeader>
                <CardContent>
                  <IncomeCategories transactions={filteredIncome} />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
