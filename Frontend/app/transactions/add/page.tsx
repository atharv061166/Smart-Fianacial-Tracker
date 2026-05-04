"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { IndianRupee, Plus, Save, RotateCcw, Database, Upload } from "lucide-react"
import { auth } from "@/lib/firebase"
import { onAuthStateChanged } from "firebase/auth"
import { format } from "date-fns"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { DashboardNav } from "@/components/dashboard-nav"
import { useFinance } from "@/hooks/useFinance"

export default function AddTransactionPage() {
  const router = useRouter()
  const [user, setUser] = useState(auth.currentUser)
  const [loading, setLoading] = useState(true)

  const { createTransaction, refresh } = useFinance()

  // Form state for single transaction
  const [formData, setFormData] = useState({
    merchantName: '',
    amount: '',
    transactionMode: '',
    accountNumber: '',
    type: 'credit' as 'credit' | 'debit',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd') // Default to today's date
  })

  // Form state for bulk transactions
  const [bulkData, setBulkData] = useState('')

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [success, setSuccess] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

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
  }, [auth, router])

  // Handle single transaction form submission
  const handleSingleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.merchantName || !formData.amount) {
      setError('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      // Convert the selected date to timestamp
      const selectedDate = new Date(formData.date)
      const timestamp = selectedDate.getTime()

      const transactionData = {
        merchantName: formData.merchantName,
        amount: parseFloat(formData.amount),
        transactionMode: formData.transactionMode || 'Manual Entry',
        accountNumber: formData.accountNumber || '1234567890',
        timestamp: timestamp,
        ...(formData.description && { description: formData.description })
      }

      await createTransaction(transactionData, formData.type)
      await refresh()

      setSuccess(`${formData.type === 'credit' ? 'Income' : 'Expense'} transaction added successfully!`)

      // Reset form
      setFormData({
        merchantName: '',
        amount: '',
        transactionMode: '',
        accountNumber: '',
        type: 'credit',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd')
      })
    } catch (err: any) {
      setError(err.message || 'Failed to add transaction')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Handle bulk transaction submission
  const handleBulkSubmit = async () => {
    if (!bulkData.trim()) {
      setError('Please enter transaction data')
      return
    }

    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const lines = bulkData.trim().split('\n')
      let successCount = 0
      let errorCount = 0

      for (const line of lines) {
        if (!line.trim()) continue

        try {
          // Expected format: Type,Merchant,Amount,Mode,Account
          const [type, merchant, amount, mode, account] = line.split(',').map(s => s.trim())

          if (!type || !merchant || !amount) {
            errorCount++
            continue
          }

          const transactionData = {
            merchantName: merchant,
            amount: parseFloat(amount),
            transactionMode: mode || 'Manual Entry',
            accountNumber: account || '1234567890'
          }

          const transactionType = type.toLowerCase() === 'income' || type.toLowerCase() === 'credit' ? 'credit' : 'debit'
          await createTransaction(transactionData, transactionType)
          successCount++
        } catch {
          errorCount++
        }
      }

      await refresh()
      setSuccess(`Successfully added ${successCount} transactions. ${errorCount > 0 ? `${errorCount} failed.` : ''}`)
      setBulkData('')
    } catch (err: any) {
      setError(err.message || 'Failed to process bulk transactions')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Add sample data
  const addSampleData = async () => {
    setIsSubmitting(true)
    setError(null)
    setSuccess(null)

    try {
      const sampleTransactions = [
        // Income transactions
        { merchantName: "Salary - Tech Corp", amount: 50000, transactionMode: "Bank Transfer", accountNumber: "1234567890", type: 'credit' as const },
        { merchantName: "Freelance Project", amount: 15000, transactionMode: "UPI", accountNumber: "1234567890", type: 'credit' as const },
        { merchantName: "Investment Dividend", amount: 2500, transactionMode: "Bank Transfer", accountNumber: "1234567890", type: 'credit' as const },

        // Expense transactions
        { merchantName: "Grocery Store", amount: 2500, transactionMode: "UPI", accountNumber: "1234567890", type: 'debit' as const },
        { merchantName: "Fuel Station", amount: 3000, transactionMode: "Card", accountNumber: "1234567890", type: 'debit' as const },
        { merchantName: "Restaurant", amount: 1200, transactionMode: "UPI", accountNumber: "1234567890", type: 'debit' as const },
        { merchantName: "Electricity Bill", amount: 1800, transactionMode: "Online", accountNumber: "1234567890", type: 'debit' as const },
        { merchantName: "Mobile Recharge", amount: 599, transactionMode: "UPI", accountNumber: "1234567890", type: 'debit' as const }
      ]

      for (const transaction of sampleTransactions) {
        const { type, ...transactionData } = transaction
        await createTransaction(transactionData, type)
      }

      await refresh()
      setSuccess(`Successfully added ${sampleTransactions.length} sample transactions!`)
    } catch (err: any) {
      setError(err.message || 'Failed to add sample data')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
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
              <h1 className="text-2xl font-bold tracking-tight">Add Transactions</h1>
              <p className="text-muted-foreground">
                Manually add income and expense transactions to your financial records
              </p>
            </div>
          </div>

          {/* Status Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="bg-green-50 text-green-700 border-green-200">
              <AlertDescription>{success}</AlertDescription>
            </Alert>
          )}

          <Tabs defaultValue="single" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="single">Single Transaction</TabsTrigger>
              <TabsTrigger value="bulk">Bulk Import</TabsTrigger>
              <TabsTrigger value="sample">Sample Data</TabsTrigger>
            </TabsList>

            {/* Single Transaction Tab */}
            <TabsContent value="single">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Add Single Transaction
                  </CardTitle>
                  <CardDescription>
                    Add individual income or expense transactions with detailed information
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSingleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="type">Transaction Type *</Label>
                          <Select
                            value={formData.type}
                            onValueChange={(value: 'credit' | 'debit') =>
                              setFormData(prev => ({ ...prev, type: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="credit">Income (Credit)</SelectItem>
                              <SelectItem value="debit">Expense (Debit)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="merchantName">Merchant/Source Name *</Label>
                          <Input
                            id="merchantName"
                            value={formData.merchantName}
                            onChange={(e) => setFormData(prev => ({ ...prev, merchantName: e.target.value }))}
                            placeholder="e.g., Salary, Grocery Store, Restaurant"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="amount">Amount (₹) *</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                            placeholder="0.00"
                            required
                          />
                        </div>

                        <div>
                          <Label htmlFor="date">Transaction Date *</Label>
                          <Input
                            id="date"
                            type="date"
                            value={formData.date}
                            onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="transactionMode">Transaction Mode</Label>
                          <Select
                            value={formData.transactionMode}
                            onValueChange={(value) =>
                              setFormData(prev => ({ ...prev, transactionMode: value }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="UPI">UPI</SelectItem>
                              <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                              <SelectItem value="Card">Debit/Credit Card</SelectItem>
                              <SelectItem value="Cash">Cash</SelectItem>
                              <SelectItem value="Online">Online Payment</SelectItem>
                              <SelectItem value="Cheque">Cheque</SelectItem>
                              <SelectItem value="Manual Entry">Manual Entry</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="accountNumber">Account Number</Label>
                          <Input
                            id="accountNumber"
                            value={formData.accountNumber}
                            onChange={(e) => setFormData(prev => ({ ...prev, accountNumber: e.target.value }))}
                            placeholder="1234567890"
                          />
                        </div>

                        <div>
                          <Label htmlFor="description">Description (Optional)</Label>
                          <Textarea
                            id="description"
                            value={formData.description}
                            onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Additional notes about this transaction"
                            rows={3}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-4">
                      <Button type="submit" disabled={isSubmitting} className="flex-1">
                        {isSubmitting ? (
                          <>
                            <Save className="mr-2 h-4 w-4 animate-spin" />
                            Adding...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Add Transaction
                          </>
                        )}
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setFormData({
                          merchantName: '',
                          amount: '',
                          transactionMode: '',
                          accountNumber: '',
                          type: 'credit',
                          description: '',
                          date: format(new Date(), 'yyyy-MM-dd')
                        })}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    </div>
                  </form>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Bulk Import Tab */}
            <TabsContent value="bulk">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Bulk Import Transactions
                  </CardTitle>
                  <CardDescription>
                    Import multiple transactions at once using CSV format
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div>
                    <Label htmlFor="bulkData">Transaction Data</Label>
                    <Textarea
                      id="bulkData"
                      value={bulkData}
                      onChange={(e) => setBulkData(e.target.value)}
                      placeholder="Enter transactions in CSV format:
Type,Merchant,Amount,Mode,Account
Income,Salary,50000,Bank Transfer,1234567890
Expense,Grocery Store,2500,UPI,1234567890
Income,Freelance,15000,UPI,1234567890"
                      rows={10}
                      className="font-mono text-sm"
                    />
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">CSV Format Instructions:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Each line represents one transaction</li>
                      <li>• Format: Type,Merchant,Amount,Mode,Account</li>
                      <li>• Type: &quot;Income&quot; or &quot;Expense&quot;</li>
                      <li>• Amount: Numeric value (no currency symbols)</li>
                      <li>• Mode and Account are optional</li>
                    </ul>
                  </div>

                  <Button onClick={handleBulkSubmit} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Upload className="mr-2 h-4 w-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="mr-2 h-4 w-4" />
                        Import Transactions
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Sample Data Tab */}
            <TabsContent value="sample">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Add Sample Data
                  </CardTitle>
                  <CardDescription>
                    Quickly populate your account with sample transactions for testing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-900 mb-2">Sample Data Includes:</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-yellow-800">
                      <div>
                        <strong>Income Transactions:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Salary - ₹50,000</li>
                          <li>• Freelance Project - ₹15,000</li>
                          <li>• Investment Dividend - ₹2,500</li>
                        </ul>
                      </div>
                      <div>
                        <strong>Expense Transactions:</strong>
                        <ul className="mt-1 space-y-1">
                          <li>• Grocery Store - ₹2,500</li>
                          <li>• Fuel Station - ₹3,000</li>
                          <li>• Restaurant - ₹1,200</li>
                          <li>• Electricity Bill - ₹1,800</li>
                          <li>• Mobile Recharge - ₹599</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  <Button onClick={addSampleData} disabled={isSubmitting} className="w-full">
                    {isSubmitting ? (
                      <>
                        <Database className="mr-2 h-4 w-4 animate-spin" />
                        Adding Sample Data...
                      </>
                    ) : (
                      <>
                        <Database className="mr-2 h-4 w-4" />
                        Add Sample Transactions
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  )
}
