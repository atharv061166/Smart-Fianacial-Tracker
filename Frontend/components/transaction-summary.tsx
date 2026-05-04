"use client"

import React, { memo } from "react"
import { TrendingUp, TrendingDown, Calendar, Hash } from "lucide-react"
import { format } from "date-fns"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Transaction } from "@/types/finance"

interface TransactionSummaryProps {
  transactions: Transaction[]
  type: 'income' | 'expense'
  className?: string
}

function TransactionSummaryComponent({
  transactions,
  type,
  className
}: TransactionSummaryProps) {
  if (!transactions || transactions.length === 0) {
    return null
  }

  // Calculate summary statistics
  const totalAmount = transactions.reduce((sum, tx) => sum + tx.amount, 0)
  const transactionCount = transactions.length
  const averageAmount = totalAmount / transactionCount

  // Find date range
  const sortedByDate = [...transactions].sort((a, b) => a.timestamp - b.timestamp)
  const earliestDate = sortedByDate[0]?.timestamp
  const latestDate = sortedByDate[sortedByDate.length - 1]?.timestamp

  // Get unique merchants/sources
  const uniqueMerchants = new Set(transactions.map(tx => tx.merchantName)).size

  const isIncome = type === 'income'
  const icon = isIncome ? TrendingUp : TrendingDown
  const colorClass = isIncome
    ? "text-emerald-600 dark:text-emerald-400"
    : "text-red-600 dark:text-red-400"
  const bgColorClass = isIncome
    ? "bg-emerald-100 dark:bg-emerald-900/20"
    : "bg-red-100 dark:bg-red-900/20"

  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          {React.createElement(icon, { className: `h-4 w-4 ${colorClass}` })}
          {isIncome ? 'Income' : 'Expense'} Summary
        </CardTitle>
        <CardDescription>
          {earliestDate && latestDate && earliestDate !== latestDate ? (
            <>
              {format(new Date(earliestDate), 'MMM dd')} - {format(new Date(latestDate), 'MMM dd, yyyy')}
            </>
          ) : earliestDate ? (
            format(new Date(earliestDate), 'MMM dd, yyyy')
          ) : (
            'No date range'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Total Amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-full ${bgColorClass}`}>
              {React.createElement(icon, { className: `h-4 w-4 ${colorClass}` })}
            </div>
            <div>
              <p className="text-sm font-medium">Total {isIncome ? 'Income' : 'Expenses'}</p>
              <p className="text-xs text-muted-foreground">
                {transactionCount} transaction{transactionCount !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className={`text-lg font-bold ${colorClass}`}>
              {isIncome ? '+' : '-'}₹{totalAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
          </div>
        </div>

        {/* Average Amount */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-blue-100 dark:bg-blue-900/20">
              <Hash className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="text-sm font-medium">Average Amount</p>
              <p className="text-xs text-muted-foreground">Per transaction</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-blue-600 dark:text-blue-400">
              ₹{averageAmount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
          </div>
        </div>

        {/* Unique Sources/Merchants */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-full bg-purple-100 dark:bg-purple-900/20">
              <Calendar className="h-4 w-4 text-purple-600 dark:text-purple-400" />
            </div>
            <div>
              <p className="text-sm font-medium">
                {isIncome ? 'Income Sources' : 'Merchants'}
              </p>
              <p className="text-xs text-muted-foreground">Unique entities</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
              {uniqueMerchants}
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export const TransactionSummary = memo(TransactionSummaryComponent)
export default TransactionSummary
