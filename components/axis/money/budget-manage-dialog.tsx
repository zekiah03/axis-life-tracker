'use client'

import { useState, useMemo } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MoneyCategory, Budget } from '@/lib/types'
import { getIconComponent } from '@/lib/tab-items'
import { useI18n } from '@/lib/i18n'

interface BudgetManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  month: string // YYYY-MM
  categories: MoneyCategory[]
  budgets: Budget[]
  onSave: (categoryId: string, amount: number) => void
  onDelete: (categoryId: string) => void
}

export function BudgetManageDialog({
  open,
  onOpenChange,
  month,
  categories,
  budgets,
  onSave,
  onDelete,
}: BudgetManageDialogProps) {
  const { t } = useI18n()
  // 今月の予算を CategoryId ごとに展開したマップ
  const currentBudgets = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of budgets) {
      if (b.month === month) map.set(b.categoryId, b.amount)
    }
    return map
  }, [budgets, month])

  const [drafts, setDrafts] = useState<Record<string, string>>({})

  const expenseCategories = categories
    .filter(c => c.type === '支出')
    .sort((a, b) => a.order - b.order)

  const getValue = (cat: MoneyCategory): string => {
    if (drafts[cat.id] !== undefined) return drafts[cat.id]
    const existing = currentBudgets.get(cat.id)
    return existing !== undefined ? String(existing) : ''
  }

  const handleSave = () => {
    for (const cat of expenseCategories) {
      const raw = drafts[cat.id]
      if (raw === undefined) continue
      const value = raw.trim() === '' ? 0 : parseFloat(raw)
      if (!isFinite(value)) continue
      if (value === 0) {
        onDelete(cat.id)
      } else {
        onSave(cat.id, value)
      }
    }
    setDrafts({})
    onOpenChange(false)
  }

  const totalDraft = useMemo(() => {
    let sum = 0
    for (const cat of expenseCategories) {
      const raw = drafts[cat.id]
      if (raw !== undefined) {
        const n = parseFloat(raw)
        if (isFinite(n)) sum += n
      } else {
        sum += currentBudgets.get(cat.id) || 0
      }
    }
    return sum
  }, [drafts, currentBudgets, expenseCategories])

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setDrafts({})
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t.money.monthlyBudget}</DialogTitle>
          <DialogDescription>
            {t.money.budgetDesc(month)}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg bg-secondary/40 p-3 flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{t.money.totalBudget}</span>
          <span className="text-lg font-bold text-foreground">
            {totalDraft.toLocaleString()} {t.common.yen}
          </span>
        </div>

        <div className="space-y-2">
          {expenseCategories.map((cat) => {
            const Icon = getIconComponent(cat.icon)
            return (
              <div
                key={cat.id}
                className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3"
              >
                <Icon className="h-5 w-5 shrink-0" style={{ color: cat.color }} />
                <Label className="flex-1 text-sm font-medium text-foreground truncate">
                  {cat.name}
                </Label>
                <div className="relative w-28">
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder="0"
                    value={getValue(cat)}
                    onChange={(e) => setDrafts(prev => ({ ...prev, [cat.id]: e.target.value }))}
                    className="bg-secondary border-border text-foreground text-right pr-6 h-9"
                  />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                    {t.common.yen}
                  </span>
                </div>
              </div>
            )
          })}
        </div>

        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
          >
            キャンセル
          </Button>
          <Button type="button" className="flex-1" onClick={handleSave}>
            保存
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
