'use client'

import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DatePickerProps {
  date: string // YYYY-MM-DD
  onChange: (date: string) => void
}

function shiftDay(dateStr: string, delta: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  date.setDate(date.getDate() + delta)
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function getToday(): string {
  return new Date().toISOString().split('T')[0]
}

function formatJP(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  const today = getToday()
  if (dateStr === today) return `今日 (${m}月${d}日 ${dow})`
  const yest = shiftDay(today, -1)
  if (dateStr === yest) return `昨日 (${m}月${d}日 ${dow})`
  return `${m}月${d}日 (${dow})`
}

export function FoodDatePicker({ date, onChange }: DatePickerProps) {
  const today = getToday()
  const isToday = date === today
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg bg-card border border-border px-2 py-2">
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => onChange(shiftDay(date, -1))}
      >
        <ChevronLeft className="h-5 w-5" />
      </Button>
      <button
        type="button"
        onClick={() => onChange(today)}
        disabled={isToday}
        className="flex items-center gap-1.5 text-sm font-medium text-foreground hover:text-muted-foreground disabled:hover:text-foreground transition-colors"
      >
        <Calendar className="h-4 w-4 text-muted-foreground" />
        {formatJP(date)}
      </button>
      <Button
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-muted-foreground hover:text-foreground"
        onClick={() => onChange(shiftDay(date, 1))}
      >
        <ChevronRight className="h-5 w-5" />
      </Button>
    </div>
  )
}
