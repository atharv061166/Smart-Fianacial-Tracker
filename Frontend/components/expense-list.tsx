"use client"

import { memo } from "react"
import { format } from "date-fns"
import { ArrowDownRight, CreditCard } from "lucide-react"
import { Transaction } from "@/types/finance"

interface ExpenseListProps {
  transactions: Transaction[]
}

function ExpenseListComponent({ transactions }: ExpenseListProps) {
  if (!transactions || transactions.length === 0) {
    return (
      <div className="text-center py-8">
        <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h3 className="text-lg font-medium text-muted-foreground mb-2">No Expenses Found</h3>
        <p className="text-sm text-muted-foreground">
          Your expense transactions will appear here once you start making purchases.
        </p>
      </div>
    )
  }

  // Sort transactions by timestamp (newest first) and take the most recent ones
  const sortedTransactions = [...transactions]
    .sort((a, b) => b.timestamp - a.timestamp)
    .slice(0, 10) // Show only the 10 most recent

  return (
    <div className="space-y-3">
      {sortedTransactions.map((transaction, index) => (
        <div
          key={`${transaction.timestamp}-${index}`}
          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
              <ArrowDownRight className="h-5 w-5 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex flex-col">
              <p className="font-medium text-sm">
                {transaction.merchantName || 'Unknown Merchant'}
              </p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>{transaction.transactionMode || 'Unknown'}</span>
                {transaction.accountNumber && typeof transaction.accountNumber === 'string' && transaction.accountNumber.length >= 4 && (
                  <>
                    <span>•</span>
                    <span>A/C: ****{transaction.accountNumber.slice(-4)}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-red-600 dark:text-red-400">
              -₹{transaction.amount.toLocaleString('en-IN', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              {format(new Date(transaction.timestamp), 'MMM dd, yyyy')}
            </p>
          </div>
        </div>
      ))}

      {transactions.length > 10 && (
        <div className="text-center pt-4">
          <p className="text-sm text-muted-foreground">
            Showing 10 of {transactions.length} expense transactions
          </p>
        </div>
      )}
    </div>
  )
}

export const ExpenseList = memo(ExpenseListComponent)
export default ExpenseList

