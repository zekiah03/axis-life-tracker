'use client'

import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Transaction } from '@/lib/types'
import { incomeCategories, expenseCategories } from '@/lib/types'
import { cn } from '@/lib/utils'

interface MoneyTabProps {
  transactions: Transaction[]
  onAddTransaction: (transaction: Omit<Transaction, 'id' | 'createdAt'>) => void
  onDeleteTransaction: (id: string) => void
}

export function MoneyTab({ transactions, onAddTransaction, onDeleteTransaction }: MoneyTabProps) {
  const [type, setType] = useState<'収入' | '支出'>('支出')
  const [category, setCategory] = useState('')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [memo, setMemo] = useState('')

  const categories = type === '収入' ? incomeCategories : expenseCategories

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!category || !amount) return

    onAddTransaction({
      type,
      category,
      amount: parseFloat(amount),
      date,
      memo,
    })

    setCategory('')
    setAmount('')
    setMemo('')
  }

  const sortedTransactions = [...transactions].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="space-y-4">
      {/* Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Type Selector */}
            <div className="flex gap-2">
              <Button
                type="button"
                variant={type === '収入' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  type === '収入' && 'bg-money hover:bg-money/90 text-background'
                )}
                onClick={() => {
                  setType('収入')
                  setCategory('')
                }}
              >
                収入
              </Button>
              <Button
                type="button"
                variant={type === '支出' ? 'default' : 'outline'}
                className={cn(
                  'flex-1',
                  type === '支出' && 'bg-destructive hover:bg-destructive/90 text-background'
                )}
                onClick={() => {
                  setType('支出')
                  setCategory('')
                }}
              >
                支出
              </Button>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">カテゴリー</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">金額</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">日付</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {/* Memo */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">メモ</Label>
              <Input
                type="text"
                placeholder="メモを入力..."
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-money hover:bg-money/90 text-background font-medium"
              disabled={!category || !amount}
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">取引履歴</h3>
          {sortedTransactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">取引がありません</p>
          ) : (
            <div className="space-y-2">
              {sortedTransactions.map((t) => (
                <div
                  key={t.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{t.date}</span>
                      <span className={cn(
                        'rounded-full px-2 py-0.5 text-xs font-medium',
                        t.type === '収入' 
                          ? 'bg-money/10 text-money' 
                          : 'bg-destructive/10 text-destructive'
                      )}>
                        {t.category}
                      </span>
                    </div>
                    {t.memo && <p className="mt-1 text-xs text-muted-foreground">{t.memo}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      'font-medium',
                      t.type === '収入' ? 'text-money' : 'text-destructive'
                    )}>
                      {t.type === '収入' ? '+' : '-'}{t.amount.toLocaleString()}円
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteTransaction(t.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
