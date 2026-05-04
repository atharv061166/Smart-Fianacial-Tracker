"use client"

import Link from "next/link"
import Image from "next/image"
import dynamic from "next/dynamic"
import {
  ArrowDown,
  ArrowUp,
  CreditCard,
  IndianRupee,
  HelpCircle,
  LineChart,
  Plus,
  Wallet,
  Loader2,
} from "lucide-react"
import { useEffect, useState, Suspense } from "react"
import { ref, onValue, DataSnapshot } from "firebase/database"
import { database, auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import { subMonths, startOfMonth, endOfMonth } from "date-fns"
import { logOut } from "@/lib/firebase-auth"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { BaseTransaction, Transaction, Budget, MonthlyData, MerchantExpense } from "@/types/finance"
import { useFinance } from "@/hooks/useFinance"
import { LoadingSkeleton } from "@/components/loading-skeleton"

// Lazy load heavy components for better performance
const DashboardChart = dynamic(
  () => import("@/components/dashboard-chart").then((mod) => ({ default: mod.DashboardChart })),
  {
    loading: () => <LoadingSkeleton type="chart" />
  }
)

const DashboardNav = dynamic(
  () => import("@/components/dashboard-nav").then((mod) => ({ default: mod.DashboardNav })),
  {
    loading: () => <LoadingSkeleton type="nav" />
  }
)

const ExpensePieChart = dynamic(
  () => import("@/components/expense-pie-chart"),
  {
    loading: () => <LoadingSkeleton type="chart" />
  }
)

const RecentTransactions = dynamic(
  () => import("@/components/recent-transactions").then((mod) => ({ default: mod.RecentTransactions })),
  {
    loading: () => <LoadingSkeleton type="list" />
  }
)

const BudgetStatus = dynamic(
  () => import("@/components/budget-status").then((mod) => ({ default: mod.BudgetStatus })),
  {
    loading: () => <LoadingSkeleton type="card" />
  }
)

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState(auth.currentUser)
  const [isAuthLoading, setIsAuthLoading] = useState(true)
  const {
    loading: dataLoading,
    error: dataError,
    summary,
    budgets,
    credits,
    debits,
    refresh
  } = useFinance()

  const [totalBalance, setTotalBalance] = useState(0)
  const [totalIncome, setTotalIncome] = useState(0)
  const [totalExpenses, setTotalExpenses] = useState(0)
  const [incomeChange, setIncomeChange] = useState(0)
  const [expenseChange, setExpenseChange] = useState(0)
  const [balanceChange, setBalanceChange] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  // Data for child components
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([])
  const [merchantExpenses, setMerchantExpenses] = useState<MerchantExpense[]>([])
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([])

  // Handle authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setIsAuthLoading(false)
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
      setLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Update data when user changes
  useEffect(() => {
    if (!user || !database) {
      // Expected during initial auth loading — not an error
      return
    }

    try {
      const userDataRef = ref(database, `users/${user.uid}`)

      const unsubscribe = onValue(userDataRef, (snapshot: DataSnapshot) => {
        try {
          const userData = snapshot.val()
          if (!userData) {
            setError('No data found for this user')
            return
          }

          const creditData: Record<string, BaseTransaction> = userData?.credit || {}
          const debitData: Record<string, BaseTransaction> = userData?.debit || {}

          // Process credit data
          const creditTotal = Object.values(creditData).reduce((sum: number, transaction: BaseTransaction) =>
            sum + transaction.amount, 0)
          setTotalIncome(creditTotal)

          // Process debit data
          const debitTotal = Object.values(debitData).reduce((sum: number, transaction: BaseTransaction) =>
            sum + transaction.amount, 0)
          setTotalExpenses(debitTotal)

          // Calculate credit month-over-month change
          const currentMonth = new Date().getMonth()
          const currentMonthCredits = Object.values(creditData).filter((tx: BaseTransaction) =>
            new Date(tx.timestamp).getMonth() === currentMonth
          )
          const lastMonthCredits = Object.values(creditData).filter((tx: BaseTransaction) =>
            new Date(tx.timestamp).getMonth() === currentMonth - 1
          )

          const currentMonthCreditTotal = currentMonthCredits.reduce((sum: number, tx: BaseTransaction) => sum + tx.amount, 0)
          const lastMonthCreditTotal = lastMonthCredits.reduce((sum: number, tx: BaseTransaction) => sum + tx.amount, 0)

          const creditChange = lastMonthCreditTotal > 0
            ? ((currentMonthCreditTotal - lastMonthCreditTotal) / lastMonthCreditTotal) * 100
            : 0
          setIncomeChange(Number(creditChange.toFixed(1)))

          // Calculate debit month-over-month change
          const currentMonthDebits = Object.values(debitData).filter((tx: BaseTransaction) =>
            new Date(tx.timestamp).getMonth() === currentMonth
          )
          const lastMonthDebits = Object.values(debitData).filter((tx: BaseTransaction) =>
            new Date(tx.timestamp).getMonth() === currentMonth - 1
          )

          const currentMonthDebitTotal = currentMonthDebits.reduce((sum: number, tx: BaseTransaction) => sum + tx.amount, 0)
          const lastMonthDebitTotal = lastMonthDebits.reduce((sum: number, tx: BaseTransaction) => sum + tx.amount, 0)

          const debitChange = lastMonthDebitTotal > 0
            ? ((currentMonthDebitTotal - lastMonthDebitTotal) / lastMonthDebitTotal) * 100
            : 0
          setExpenseChange(Number(debitChange.toFixed(1)))

          // Update data visualizations
          calculateMonthlyData(creditData, debitData)
          calculateMerchantExpenses(debitData)

          // Process transactions for RecentTransactions component
          const allTransactions: Transaction[] = [
            ...Object.entries(creditData).map(([id, tx]) => ({ ...tx, type: 'credit' as const })),
            ...Object.entries(debitData).map(([id, tx]) => ({ ...tx, type: 'debit' as const }))
          ]
          .sort((a, b) => b.timestamp - a.timestamp)
          .slice(0, 5)
          setRecentTransactions(allTransactions)

        } catch (err) {
          console.error('Error processing user data:', err)
          setError('Error loading user data')
        }
      })

      return () => unsubscribe()
    } catch (err) {
      console.error('Error setting up Firebase listener:', err)
      setError('Error connecting to database')
    }
  }, [user])

  // Update balance whenever income or expenses change
  useEffect(() => {
    const balance = totalIncome - totalExpenses
    setTotalBalance(balance)

    // Calculate balance change percentage
    const balanceChangePercent = totalIncome > 0
      ? ((balance / totalIncome) * 100)
      : 0
    setBalanceChange(Number(balanceChangePercent.toFixed(1)))
  }, [totalIncome, totalExpenses])

  // Calculate monthly data for the chart
  const calculateMonthlyData = (creditData: Record<string, BaseTransaction>, debitData: Record<string, BaseTransaction>) => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i)
      return {
        month: date.toLocaleString('default', { month: 'short' }),
        start: startOfMonth(date).getTime(),
        end: endOfMonth(date).getTime()
      }
    }).reverse()

    const monthlyData = last6Months.map(({ month, start, end }) => {
      const monthlyIncome = Object.values(creditData || {})
        .filter(tx => tx.timestamp >= start && tx.timestamp <= end)
        .reduce((sum, tx) => sum + tx.amount, 0)

      const monthlyExpenses = Object.values(debitData || {})
        .filter(tx => tx.timestamp >= start && tx.timestamp <= end)
        .reduce((sum, tx) => sum + tx.amount, 0)

      return {
        month,
        income: monthlyIncome,
        expenses: monthlyExpenses
      }
    })

    setMonthlyData(monthlyData)
  }

  // Calculate merchant expenses for pie chart
  const calculateMerchantExpenses = (debitData: Record<string, BaseTransaction>) => {
    const merchantTotals = Object.values(debitData || {}).reduce((acc, tx) => {
      const merchant = tx.merchantName
      acc[merchant] = (acc[merchant] || 0) + tx.amount
      return acc
    }, {} as Record<string, number>)

    const totalSpent = Object.values(merchantTotals).reduce((sum, amount) => sum + amount, 0)

    const merchantExpenses = Object.entries(merchantTotals)
      .map(([merchant, amount]) => ({
        merchant,
        amount
      }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 5) // Top 5 merchants

    setMerchantExpenses(merchantExpenses)
  }

  // Add a refresh button to manually trigger data fetch
  const handleRefresh = () => {
    if (!user) return
    refresh()
  }

  // Handle user logout
  const handleLogout = async () => {
    try {
      await logOut()
      router.push('/login')
    } catch (error) {
      console.error('Error logging out:', error)
    }
  }

  if (isAuthLoading || loading || dataLoading) {
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
          <Link href="/home" className="flex items-center gap-2">
            <Image
              src="/images/finance-logo.png"
              alt="FinanceBuddy Logo"
              width={32}
              height={32}
              className="object-contain"
              priority={false}
            />
            <span className="text-xl font-bold">FinanceBuddy</span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <LineChart className="h-5 w-5" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="gap-2 hover:bg-red-50 hover:text-red-600 transition-colors"
              onClick={handleLogout}
              title="Click to sign out"
            >
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
              <h1 className="text-2xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">Your financial overview and insights</p>
            </div>
            <div className="flex items-center space-x-2">
              <Link href="/transactions/add">
                <Button size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Transaction
                </Button>
              </Link>
            </div>
          </div>

          {/* Simple dashboard content */}
          <div className="space-y-4">
            {/* Stats Cards */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Balance</CardTitle>
                  <Wallet className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <p className="text-xs text-muted-foreground">{balanceChange >= 0 ? '+' : ''}{balanceChange}% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Income</CardTitle>
                  <ArrowUp className="h-4 w-4 text-emerald-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalIncome.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <p className="text-xs text-muted-foreground">{incomeChange >= 0 ? '+' : ''}{incomeChange}% from last month</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                  <ArrowDown className="h-4 w-4 text-rose-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">₹{totalExpenses.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
                  <p className="text-xs text-muted-foreground">{expenseChange >= 0 ? '+' : ''}{expenseChange}% from last month</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Placeholder */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Monthly Overview</CardTitle>
                  <CardDescription>Your financial activity for the past 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <DashboardChart data={monthlyData} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Expense Breakdown</CardTitle>
                  <CardDescription>Top merchants by spending amount</CardDescription>
                </CardHeader>
                <CardContent>
                  <ExpensePieChart data={merchantExpenses} />
                </CardContent>
              </Card>
            </div>

            {/* Transactions and Budget Placeholder */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
              <Card className="lg:col-span-4">
                <CardHeader>
                  <CardTitle>Recent Transactions</CardTitle>
                  <CardDescription>Your latest financial activity</CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentTransactions transactions={recentTransactions} />
                </CardContent>
              </Card>
              <Card className="lg:col-span-3">
                <CardHeader>
                  <CardTitle>Budget Status</CardTitle>
                  <CardDescription>Your spending by merchant</CardDescription>
                </CardHeader>
                <CardContent>
                  <BudgetStatus budgets={budgets} />
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}

