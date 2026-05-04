"use client"

import Link from "next/link"
import Image from "next/image"
import { IndianRupee, Download, TrendingUp, TrendingDown, DollarSign, FileText, RefreshCw } from "lucide-react"
import { useEffect, useState } from "react"
import { format, isWithinInterval, startOfDay, endOfDay, subDays, subWeeks, subMonths, startOfMonth, endOfMonth } from "date-fns"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { useRouter } from "next/navigation"
import dynamic from 'next/dynamic'
import { DateRange } from 'react-day-picker'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { DashboardNav } from "@/components/dashboard-nav"
import { pdf } from '@react-pdf/renderer'
import { FinancialReportPDF } from '@/components/financial-report-pdf'
import { useFinance } from "@/hooks/useFinance"
import { Transaction } from "@/lib/firebase-db"
import { MerchantExpense } from "@/types/finance"
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  LineChart,
  Line,
  AreaChart,
  Area
} from 'recharts'

// Dynamic imports with type safety and loading states
const DateRangePicker = dynamic(
  () => import('@/components/ui/date-range-picker').then(mod => mod.DateRangePicker),
  {
    loading: () => <div className="flex items-center justify-center p-4">
      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
    </div>
  }
)

const PRESET_RANGES = [
  { label: "Last 5 Days", getRange: () => ({ from: subDays(new Date(), 5), to: new Date() }) },
  { label: "Last Week", getRange: () => ({ from: subWeeks(new Date(), 1), to: new Date() }) },
  { label: "Last Month", getRange: () => ({ from: subMonths(new Date(), 1), to: new Date() }) },
  { label: "This Month", getRange: () => ({ from: startOfMonth(new Date()), to: endOfMonth(new Date()) }) },
  { label: "Custom Range", getRange: null }
] as const

interface ReportDateRange {
  from: Date
  to: Date
}

// Chart colors
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D', '#FFC658', '#FF7C7C']

// PDF generation function using @react-pdf/renderer
const generatePDF = async (reportData: any, dateRange: { from: Date; to: Date }, filename: string) => {
  try {
    // Capture chart images first
    const html2canvas = await import('html-to-image')
    const reportElement = document.getElementById('report-content')
    if (!reportElement) {
      console.error('Report element not found')
      return
    }

    const chartImageUrl = await html2canvas.toPng(reportElement, {
      quality: 0.95,
      backgroundColor: '#ffffff',
      pixelRatio: 2
    })

    // Ensure data has safe defaults
    const safeReportData = {
      totalIncome: reportData?.totalIncome || 0,
      incomeChange: reportData?.incomeChange || 0,
      creditTransactions: reportData?.creditTransactions || [],
      topIncomeSources: reportData?.topIncomeSources || [],
      topExpenseCategories: reportData?.topExpenseCategories || []
    }

    // Generate PDF using react-pdf
    const pdfBlob = await pdf(
      <FinancialReportPDF
        dateRange={dateRange}
        totalIncome={safeReportData.totalIncome}
        incomeChange={safeReportData.incomeChange}
        creditTransactions={safeReportData.creditTransactions}
        incomeData={safeReportData.topIncomeSources}
        expenseData={safeReportData.topExpenseCategories}
        chartImageUrl={chartImageUrl}
      />
    ).toBlob()

    // Create download link
    const link = document.createElement('a')
    link.download = filename
    link.href = URL.createObjectURL(pdfBlob)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)

    // Clean up
    URL.revokeObjectURL(link.href)
  } catch (error) {
    console.error('Error generating PDF:', error)
    alert('Failed to generate PDF. Please try again.')
  }
}

export default function ReportsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [user, setUser] = useState<any>(null)
  const [dateRange, setDateRange] = useState<DateRange>()
  const {
    loading: dataLoading,
    error: dataError,
    credits,
    debits,
    summary,
    refresh
  } = useFinance()

  const [filteredCredits, setFilteredCredits] = useState<Transaction[]>([])
  const [filteredDebits, setFilteredDebits] = useState<Transaction[]>([])
  const [reportData, setReportData] = useState<any>(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (!currentUser) {
        router.push('/login')
        return
      }
      setUser(currentUser)
      setIsLoading(false)
    })

    return () => unsubscribe()
  }, [router])

  // Process transactions when data or date range changes
  useEffect(() => {
    if (credits && debits) {
      let filteredCreditsData = credits
      let filteredDebitsData = debits

      // Filter by date range if provided
      if (dateRange?.from && dateRange?.to) {
        filteredCreditsData = credits.filter(tx => {
          const txDate = new Date(tx.timestamp)
          return isWithinInterval(txDate, {
            start: startOfDay(dateRange.from!),
            end: endOfDay(dateRange.to!)
          })
        })

        filteredDebitsData = debits.filter(tx => {
          const txDate = new Date(tx.timestamp)
          return isWithinInterval(txDate, {
            start: startOfDay(dateRange.from!),
            end: endOfDay(dateRange.to!)
          })
        })
      }

      // Convert to Transaction type with type property
      const creditsWithType: Transaction[] = filteredCreditsData.map(tx => ({ ...tx, type: 'credit' as const }))
      const debitsWithType: Transaction[] = filteredDebitsData.map(tx => ({ ...tx, type: 'debit' as const }))

      setFilteredCredits(creditsWithType)
      setFilteredDebits(debitsWithType)

      // Generate comprehensive report data
      const totalIncome = filteredCreditsData.reduce((sum, tx) => sum + tx.amount, 0)
      const totalExpenses = filteredDebitsData.reduce((sum, tx) => sum + tx.amount, 0)
      const netIncome = totalIncome - totalExpenses

      // Top income sources
      const incomeBySource = filteredCreditsData.reduce((acc, tx) => {
        acc[tx.merchantName] = (acc[tx.merchantName] || 0) + tx.amount
        return acc
      }, {} as Record<string, number>)

      const topIncomeSources = Object.entries(incomeBySource)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      // Top expense categories
      const expensesByCategory = filteredDebitsData.reduce((acc, tx) => {
        acc[tx.merchantName] = (acc[tx.merchantName] || 0) + tx.amount
        return acc
      }, {} as Record<string, number>)

      const topExpenseCategories = Object.entries(expensesByCategory)
        .map(([name, amount]) => ({ name, amount }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 5)

      // Monthly trend data
      const monthlyData = new Map<string, { income: number; expenses: number }>()

      filteredCreditsData.forEach(tx => {
        const month = format(new Date(tx.timestamp), 'MMM yyyy')
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { income: 0, expenses: 0 })
        }
        monthlyData.get(month)!.income += tx.amount
      })

      filteredDebitsData.forEach(tx => {
        const month = format(new Date(tx.timestamp), 'MMM yyyy')
        if (!monthlyData.has(month)) {
          monthlyData.set(month, { income: 0, expenses: 0 })
        }
        monthlyData.get(month)!.expenses += tx.amount
      })

      const monthlyTrend = Array.from(monthlyData.entries())
        .map(([month, data]) => ({
          month,
          income: data.income,
          expenses: data.expenses
        }))
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())

      setReportData({
        totalIncome,
        totalExpenses,
        netIncome,
        topIncomeSources,
        topExpenseCategories,
        monthlyTrend,
        transactionCount: filteredCreditsData.length + filteredDebitsData.length
      })
    }
  }, [credits, debits, dateRange])

  // Handle refresh
  const handleRefresh = () => {
    if (!user) return
    refresh()
  }

  // Handle PDF download
  const handleDownloadPDF = () => {
    if (!dateRange?.from || !dateRange?.to) {
      alert('Please select a valid date range first.')
      return
    }
    const filename = `financial-report-${format(new Date(), 'yyyy-MM-dd')}.pdf`
    generatePDF(reportData, { from: dateRange.from, to: dateRange.to }, filename)
  }

  if (isLoading || dataLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (dataError) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{dataError}</p>
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
            <IndianRupee className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">FinanceBuddy</span>
          </Link>
          <div className="ml-auto flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={handleRefresh}>
              <RefreshCw className="h-5 w-5" />
              <span className="sr-only">Refresh</span>
            </Button>
            <Button variant="outline" onClick={handleDownloadPDF}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
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
              <h1 className="text-2xl font-bold tracking-tight">Financial Reports</h1>
              <p className="text-muted-foreground">Comprehensive analysis of your financial transactions</p>
            </div>
          </div>

          {/* Date Range Selector */}
          <Card>
            <CardHeader>
              <CardTitle>Report Period</CardTitle>
              <CardDescription>Select a date range to filter your financial data</CardDescription>
            </CardHeader>
            <CardContent>
              <DateRangePicker
                value={dateRange}
                onChange={(range: DateRange | undefined) => setDateRange(range)}
              />
            </CardContent>
          </Card>

          {reportData && (
            <div id="report-content" className="space-y-6">
              {/* Summary Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Income</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      ₹{reportData.totalIncome.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {filteredCredits.length} transactions
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
                    <TrendingDown className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-600">
                      ₹{reportData.totalExpenses.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      From {filteredDebits.length} transactions
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Net Income</CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className={`text-2xl font-bold ${reportData.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      ₹{reportData.netIncome.toLocaleString('en-IN')}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {reportData.netIncome >= 0 ? 'Surplus' : 'Deficit'}
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Transactions</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {reportData.transactionCount}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total transactions
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts Section */}
              <div className="grid gap-6 md:grid-cols-2">
                {/* Monthly Trend Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Monthly Trend</CardTitle>
                    <CardDescription>Income vs Expenses over time</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={reportData.monthlyTrend}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="month" />
                          <YAxis />
                          <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                          <Legend />
                          <Line type="monotone" dataKey="income" stroke="#10b981" strokeWidth={2} name="Income" />
                          <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={2} name="Expenses" />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>

                {/* Income Sources Pie Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Top Income Sources</CardTitle>
                    <CardDescription>Breakdown of income by source</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={reportData.topIncomeSources.slice(0, 8)}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="amount"
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          >
                            {reportData.topIncomeSources.slice(0, 8).map((entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Expense Categories Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Top Expense Categories</CardTitle>
                  <CardDescription>Your highest spending categories</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={reportData.topExpenseCategories.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                        <Bar dataKey="amount" fill="#ef4444" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Income vs Expenses Area Chart */}
              <Card>
                <CardHeader>
                  <CardTitle>Income vs Expenses Comparison</CardTitle>
                  <CardDescription>Cumulative view of your financial flow</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-[400px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <AreaChart data={reportData.monthlyTrend}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="month" />
                        <YAxis />
                        <Tooltip formatter={(value: number) => `₹${value.toLocaleString('en-IN')}`} />
                        <Legend />
                        <Area type="monotone" dataKey="income" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Income" />
                        <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} name="Expenses" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Transaction Summary Tables */}
              <div className="grid gap-6 md:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle>Top Income Sources</CardTitle>
                    <CardDescription>Detailed breakdown of income sources</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reportData.topIncomeSources.slice(0, 10).map((source: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-green-50">
                          <span className="font-medium">{source.name}</span>
                          <span className="text-green-600 font-semibold">
                            ₹{source.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Top Expense Categories</CardTitle>
                    <CardDescription>Detailed breakdown of expense categories</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {reportData.topExpenseCategories.slice(0, 10).map((category: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-2 rounded-lg bg-red-50">
                          <span className="font-medium">{category.name}</span>
                          <span className="text-red-600 font-semibold">
                            ₹{category.amount.toLocaleString('en-IN')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}