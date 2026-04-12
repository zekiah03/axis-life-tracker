'use client'

import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MonthPickerProps {
  month: string // YYYY-MM
  onChange: (month: string) => void
}

function parseMonth(month: string): { year: number; monthIndex: number } {
  const [y, m] = month.split('-').map(Number)
  return { year: y, monthIndex: m - 1 }
}

function formatMonth(year: number, monthIndex: number): string {
  return `${year}-${String(monthIndex + 1).padStart(2, '0')}`
}

function shiftMonth(month: string, delta: number): string {
  const { year, monthIndex } = parseMonth(month)
  const d = new Date(year, monthIndex + delta, 1)
  return formatMonth(d.getFullYear(), d.getMonth())
}

export function getCurrentMonth(): string {
  const d = new Date()
  return formatMonth(d.getFullYear(), d.getMonth())
}

export function MonthPicker({ month, onChange }: MonthPickerProps) {
  const { year, monthIndex } = parseMonth(month)
  const isCurrentMonth = month === getCurrentMonth()
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-card border border-border px-2 py-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => onChange(shiftMonth(month, -1))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <button
        type="button"
        onClick={() => onChange(getCurrentMonth())}
        disabled={isCurrentMonth}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-muted-foreground disabled:hover:text-foreground transition-colors"
      >
        <CalendarDays className="h-4 w-4 text-muted-foreground" />
        {year}年 {monthIndex + 1}月
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => onChange(shiftMonth(month, 1))}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
