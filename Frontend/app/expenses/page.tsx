"use client"

import Link from "next/link"
import dynamic from "next/dynamic"
import { DollarSign, HelpCircle, Loader2 } from "lucide-react"
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

const ExpenseCategories = dynamic(
  () => import("@/components/expense-categories").then((mod) => ({ default: mod.ExpenseCategories })),
  {
    loading: () => <LoadingSkeleton type="card" />
  }
)

const ExpenseList = dynamic(
  () => import("@/components/expense-list").then((mod) => ({ default: mod.ExpenseList })),
  {
    loading: () => <LoadingSkeleton type="list" />
  }
)

export default function ExpensesPage() {
  const router = useRouter()
  const [user, setUser] = useState(auth.currentUser)
  const {
    loading: dataLoading,
    error: dataError,
    debits,
    refresh
  } = useFinance()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expenses, setExpenses] = useState<Transaction[]>([])
  const [filteredExpenses, setFilteredExpenses] = useState<Transaction[]>([])

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

  // Transform debit transactions to include type
  useEffect(() => {
    if (debits) {
      const transformedDebits: Transaction[] = debits.map(debit => ({
        ...debit,
        type: 'debit' as const
      }))
      setExpenses(transformedDebits)
      setFilteredExpenses(transformedDebits) // Initialize filtered expenses
    }
  }, [debits])

  // Handle date filter changes
  const handleFilterChange = useCallback((filtered: Transaction[]) => {
    setFilteredExpenses(filtered)
  }, [])

  // Handle refresh
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
              <h1 className="text-2xl font-bold tracking-tight">Expense Tracking</h1>
              <p className="text-muted-foreground">Track, categorize, and analyze your expenses</p>
            </div>
          </div>

          {/* Date Filter */}
          <TransactionDateFilter
            transactions={expenses}
            onFilterChange={handleFilterChange}
          />

          <div className="grid gap-4 md:grid-cols-[2fr_1fr]">
            <div className="space-y-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle>Recent Expenses</CardTitle>
                  <CardDescription>Your latest expense transactions</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpenseList transactions={filteredExpenses} />
                </CardContent>
              </Card>
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Expense Categories</CardTitle>
                  <CardDescription>Your spending by category</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpenseCategories transactions={filteredExpenses} />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

