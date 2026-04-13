'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { Transaction, MoneyCategory } from '@/lib/types'
import { getIconComponent } from '@/lib/tab-items'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface TransactionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: MoneyCategory[]
  defaultType?: '収入' | '支出'
  defaultDate?: string
  editing?: Transaction | null
  onSubmit: (data: Omit<Transaction, 'id' | 'createdAt'>) => void
}

export function TransactionDialog({
  open,
  onOpenChange,
  categories,
  defaultType = '支出',
  defaultDate,
  editing,
  onSubmit,
}: TransactionDialogProps) {
  const { t } = useI18n()
  const [type, setType] = useState<'収入' | '支出'>(defaultType)
  const [categoryId, setCategoryId] = useState<string>('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(defaultDate || new Date().toISOString().split('T')[0])
  const [memo, setMemo] = useState('')

  // ダイアログが開いたタイミングで状態をリセット/編集時は既存値を入れる
  useEffect(() => {
    if (!open) return
    if (editing) {
      setType(editing.type)
      setCategoryId(editing.categoryId || '')
      setAmount(String(editing.amount))
      setDate(editing.date)
      setMemo(editing.memo)
    } else {
      setType(defaultType)
      setCategoryId('')
      setAmount('')
      setDate(defaultDate || new Date().toISOString().split('T')[0])
      setMemo('')
    }
  }, [open, editing, defaultType, defaultDate])

  const availableCategories = categories
    .filter(c => c.type === type)
    .sort((a, b) => a.order - b.order)

  const selectedCategory = categories.find(c => c.id === categoryId)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedCategory || !amount) return
    onSubmit({
      type,
      category: selectedCategory.name, // 後方互換
      categoryId: selectedCategory.id,
      amount: parseFloat(amount),
      date,
      memo,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? t.money.editTransaction : t.money.addTransaction}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Type Toggle */}
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className={cn(
                'flex-1',
                type === '収入' && 'bg-money hover:bg-money/90 text-background border-money'
              )}
              onClick={() => {
                setType('収入')
                setCategoryId('')
              }}
            >
              収入
            </Button>
            <Button
              type="button"
              variant="outline"
              className={cn(
                'flex-1',
                type === '支出' && 'bg-destructive hover:bg-destructive/90 text-background border-destructive'
              )}
              onClick={() => {
                setType('支出')
                setCategoryId('')
              }}
            >
              支出
            </Button>
          </div>

          {/* Amount - 最初に金額入力 (Zaim風) */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t.money.amount}</Label>
            <div className="relative">
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-secondary border-border text-foreground text-2xl h-14 pr-10 text-right font-semibold"
                autoFocus
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                {t.common.yen}
              </span>
            </div>
          </div>

          {/* Category Grid */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t.money.category}</Label>
            <div className="grid grid-cols-4 gap-2">
              {availableCategories.map((cat) => {
                const Icon = getIconComponent(cat.icon)
                const selected = cat.id === categoryId
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCategoryId(cat.id)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors',
                      selected
                        ? 'border-foreground bg-foreground/10'
                        : 'border-border bg-secondary/40 hover:bg-secondary'
                    )}
                  >
                    <Icon className="h-5 w-5" style={{ color: cat.color }} />
                    <span className="text-[10px] text-foreground truncate w-full text-center">
                      {cat.name}
                    </span>
                  </button>
                )
              })}
            </div>
            {availableCategories.length === 0 && (
              <p className="text-xs text-muted-foreground text-center py-4">
                {t.money.noCategoriesAvailable}
              </p>
            )}
          </div>

          {/* Date */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t.common.date}</Label>
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
          </div>

          {/* Memo */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">{t.money.memoOptional}</Label>
            <Input
              type="text"
              placeholder={t.money.memoPlaceholder}
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
          </div>

          <Button
            type="submit"
            className="w-full bg-money hover:bg-money/90 text-background font-medium"
            disabled={!categoryId || !amount}
          >
            {editing ? t.money.update : t.money.record}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
