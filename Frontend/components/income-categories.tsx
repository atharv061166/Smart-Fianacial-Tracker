"use client"

import { memo, useMemo } from "react"
import { TrendingUp, Briefcase, CreditCard, Gift, DollarSign } from "lucide-react"
import { Transaction } from "@/types/finance"

interface IncomeCategoriesProps {
  transactions: Transaction[]
}

interface IncomeCategory {
  name: string
  amount: number
  count: number
  percentage: number
  icon: React.ReactNode
  color: string
}

function IncomeCategoriesComponent({ transactions }: IncomeCategoriesProps) {
  const categories = useMemo(() => {
    if (!transactions || transactions.length === 0) return []

    // Calculate total income
    const totalIncome = transactions.reduce((sum, tx) => sum + tx.amount, 0)

    // Group transactions by merchant/source
    const merchantGroups = transactions.reduce((acc, tx) => {
      const merchant = tx.merchantName || 'Unknown Source'
      if (!acc[merchant]) {
        acc[merchant] = {
          amount: 0,
          count: 0,
          transactions: []
        }
      }
      acc[merchant].amount += tx.amount
      acc[merchant].count += 1
      acc[merchant].transactions.push(tx)
      return acc
    }, {} as Record<string, { amount: number; count: number; transactions: Transaction[] }>)

    // Convert to categories with icons and colors
    const categoryList: IncomeCategory[] = Object.entries(merchantGroups)
      .map(([name, data]) => {
        const percentage = totalIncome > 0 ? (data.amount / totalIncome) * 100 : 0
        
        // Assign icons and colors based on merchant name or transaction mode
        let icon = <DollarSign className="h-4 w-4" />
        let color = "bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
        
        const lowerName = name.toLowerCase()
        const sampleTransaction = data.transactions[0]
        const transactionMode = sampleTransaction?.transactionMode?.toLowerCase() || ''
        
        if (lowerName.includes('salary') || lowerName.includes('payroll') || transactionMode.includes('salary')) {
          icon = <Briefcase className="h-4 w-4" />
          color = "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400"
        } else if (lowerName.includes('transfer') || transactionMode.includes('transfer') || transactionMode.includes('upi')) {
          icon = <CreditCard className="h-4 w-4" />
          color = "bg-purple-100 text-purple-600 dark:bg-purple-900/20 dark:text-purple-400"
        } else if (lowerName.includes('bonus') || lowerName.includes('gift') || lowerName.includes('reward')) {
          icon = <Gift className="h-4 w-4" />
          color = "bg-orange-100 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400"
        } else if (lowerName.includes('investment') || lowerName.includes('dividend') || lowerName.includes('interest')) {
          icon = <TrendingUp className="h-4 w-4" />
          color = "bg-green-100 text-green-600 dark:bg-green-900/20 dark:text-green-400"
        }

        return {
          name,
          amount: data.amount,
          count: data.count,
          percentage,
          icon,
          color
        }
      })
      .sort((a, b) => b.amount - a.amount) // Sort by amount descending
      .slice(0, 6) // Show top 6 categories

    return categoryList
  }, [transactions])

  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No Income Categories</h3>
        <p className="text-sm text-muted-foreground">
          Income categories will appear here based on your transaction sources.
        </p>
      </div>
    )
  }

  const totalIncome = transactions.reduce((sum, tx) => sum + tx.amount, 0)

  return (
    <div className="space-y-4">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold text-emerald-600 dark:text-emerald-400">
          Total Income
        </h3>
        <p className="text-2xl font-bold">
          ₹{totalIncome.toLocaleString('en-IN', { 
            minimumFractionDigits: 2,
            maximumFractionDigits: 2 
          })}
        </p>
        <p className="text-sm text-muted-foreground">
          From {transactions.length} transactions
        </p>
      </div>

      <div className="space-y-3">
        {categories.map((category, index) => (
          <div
            key={category.name}
            className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className={`flex h-8 w-8 items-center justify-center rounded-full ${category.color}`}>
                {category.icon}
              </div>
              <div>
                <p className="font-medium text-sm">{category.name}</p>
                <p className="text-xs text-muted-foreground">
                  {category.count} transaction{category.count !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="font-semibold text-emerald-600 dark:text-emerald-400">
                ₹{category.amount.toLocaleString('en-IN', { 
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2 
                })}
              </p>
              <p className="text-xs text-muted-foreground">
                {category.percentage.toFixed(1)}%
              </p>
            </div>
          </div>
        ))}
      </div>

      {categories.length === 0 && transactions.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">
            Unable to categorize income sources
          </p>
        </div>
      )}
    </div>
  )
}

export const IncomeCategories = memo(IncomeCategoriesComponent)
export default IncomeCategories
