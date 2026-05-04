"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  subMonths,
  isWithinInterval,
} from "date-fns"
import { Calendar as CalendarIcon, Filter, X } from "lucide-react"
import { DateRange } from "react-day-picker"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface TransactionDateFilterProps {
  onFilterChange: (filteredTransactions: any[]) => void
  transactions: any[]
  className?: string
}

export function TransactionDateFilter({
  onFilterChange,
  transactions,
  className,
}: TransactionDateFilterProps) {
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [quickFilter, setQuickFilter] = useState<string>("")
  const [isOpen, setIsOpen] = useState(false)

  const onFilterChangeRef = useRef(onFilterChange)
  onFilterChangeRef.current = onFilterChange

  const quickFilters = [
    { value: "this-month", label: "This Month" },
    { value: "last-month", label: "Last Month" },
    { value: "last-3-months", label: "Last 3 Months" },
    { value: "last-6-months", label: "Last 6 Months" },
    { value: "this-year", label: "This Year" },
    { value: "all-time", label: "All Time" },
  ]

  const applyQuickFilter = (filterValue: string) => {
    const now = new Date()
    let from: Date | undefined
    let to: Date | undefined

    switch (filterValue) {
      case "this-month":
        from = startOfMonth(now)
        to = endOfMonth(now)
        break
      case "last-month":
        const lastMonth = subMonths(now, 1)
        from = startOfMonth(lastMonth)
        to = endOfMonth(lastMonth)
        break
      case "last-3-months":
        from = startOfMonth(subMonths(now, 2))
        to = endOfMonth(now)
        break
      case "last-6-months":
        from = startOfMonth(subMonths(now, 5))
        to = endOfMonth(now)
        break
      case "this-year":
        from = startOfYear(now)
        to = endOfYear(now)
        break
      case "all-time":
        from = undefined
        to = undefined
        break
      default:
        from = undefined
        to = undefined
    }

    setDateRange(from && to ? { from, to } : undefined)
    setQuickFilter(filterValue)
  }

  useEffect(() => {
    if (!transactions) return

    let filtered = [...transactions]

    if (dateRange?.from && dateRange?.to) {
      filtered = transactions.filter((transaction) => {
        const transactionDate = new Date(transaction.timestamp)
        return isWithinInterval(transactionDate, {
          start: dateRange.from!,
          end: dateRange.to!,
        })
      })
    }

    onFilterChangeRef.current(filtered)
  }, [dateRange, transactions])

  const clearFilters = useCallback(() => {
    setDateRange(undefined)
    setQuickFilter("")
    onFilterChangeRef.current(transactions)
  }, [transactions])

  const hasActiveFilters = dateRange?.from || quickFilter

  return (
    <Card className={cn("mb-4", className)}>
      <CardContent className="p-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filter Transactions</span>
          </div>

          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            {/* Quick Filters */}
            <Select value={quickFilter} onValueChange={applyQuickFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Quick filters" />
              </SelectTrigger>
              <SelectContent>
                {quickFilters.map((filter) => (
                  <SelectItem key={filter.value} value={filter.value}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Custom Date Range Picker */}
            <Popover open={isOpen} onOpenChange={setIsOpen}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-[280px] justify-start text-left font-normal",
                    !dateRange && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {dateRange?.from ? (
                    dateRange.to ? (
                      <>
                        {format(dateRange.from, "LLL dd, y")} -{" "}
                        {format(dateRange.to, "LLL dd, y")}
                      </>
                    ) : (
                      format(dateRange.from, "LLL dd, y")
                    )
                  ) : (
                    <span>Pick a date range</span>
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  initialFocus
                  mode="range"
                  defaultMonth={dateRange?.from}
                  selected={dateRange}
                  onSelect={(range) => {
                    setDateRange(range)
                    setQuickFilter("") // Clear quick filter when custom range is selected
                    if (range?.from && range?.to) {
                      setIsOpen(false)
                    }
                  }}
                  numberOfMonths={2}
                />
              </PopoverContent>
            </Popover>

            {/* Clear Filters Button */}
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="h-8 px-2 lg:px-3"
              >
                <X className="h-4 w-4" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Active Filter Display */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 mt-3 pt-3 border-t">
            <span className="text-xs text-muted-foreground">Active filters:</span>
            {quickFilter && (
              <Badge variant="secondary" className="text-xs">
                {quickFilters.find((f) => f.value === quickFilter)?.label}
              </Badge>
            )}
            {dateRange?.from && dateRange?.to && !quickFilter && (
              <Badge variant="secondary" className="text-xs">
                {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd, yyyy")}
              </Badge>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
