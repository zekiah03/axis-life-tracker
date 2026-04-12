'use client'

import { useState, useMemo } from 'react'
import {
  Plus,
  Trash2,
  TrendingUp,
  TrendingDown,
  Settings2,
  Target,
  Edit3,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { Transaction, MoneyCategory, Budget } from '@/lib/types'
import { getIconComponent } from '@/lib/tab-items'
import { fallbackCategoryMeta } from '@/lib/money-categories'
import { MonthPicker, getCurrentMonth } from '@/components/axis/money/month-picker'
import { TransactionDialog } from '@/components/axis/money/transaction-dialog'
import { CategoryManageDialog } from '@/components/axis/money/category-manage-dialog'
import { BudgetManageDialog } from '@/components/axis/money/budget-manage-dialog'
import { cn } from '@/lib/utils'

interface MoneyTabProps {
  transactions: Transaction[]
  categories: MoneyCategory[]
  budgets: Budget[]
  onAddTransaction: (t: Omit<Transaction, 'id' | 'createdAt'>) => void
  onUpdateTransaction: (id: string, t: Omit<Transaction, 'id' | 'createdAt'>) => void
  onDeleteTransaction: (id: string) => void
  onAddCategory: (cat: Omit<MoneyCategory, 'id' | 'order'>) => void
  onDeleteCategory: (id: string) => void
  onMoveCategory: (id: string, direction: -1 | 1) => void
  onSaveBudget: (categoryId: string, month: string, amount: number) => void
  onDeleteBudget: (categoryId: string, month: string) => void
}

function formatYen(n: number): string {
  return n.toLocaleString() + '円'
}

function formatDayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  const dow = ['日', '月', '火', '水', '木', '金', '土'][date.getDay()]
  return `${m}月${d}日 (${dow})`
}

export function MoneyTab(props: MoneyTabProps) {
  const {
    transactions,
    categories,
    budgets,
    onAddTransaction,
    onUpdateTransaction,
    onDeleteTransaction,
    onAddCategory,
    onDeleteCategory,
    onMoveCategory,
    onSaveBudget,
    onDeleteBudget,
  } = props

  const [month, setMonth] = useState<string>(getCurrentMonth())
  const [txDialogOpen, setTxDialogOpen] = useState(false)
  const [editing, setEditing] = useState<Transaction | null>(null)
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false)
  const [budgetDialogOpen, setBudgetDialogOpen] = useState(false)

  // カテゴリ解決 (ID → オブジェクト、fallbackは名前でもマッチ)
  const categoryById = useMemo(() => {
    const map = new Map<string, MoneyCategory>()
    for (const c of categories) map.set(c.id, c)
    return map
  }, [categories])

  const categoryByName = useMemo(() => {
    const map = new Map<string, MoneyCategory>()
    for (const c of categories) map.set(c.name, c)
    return map
  }, [categories])

  function resolveCategory(t: Transaction): MoneyCategory | null {
    if (t.categoryId) {
      const c = categoryById.get(t.categoryId)
      if (c) return c
    }
    return categoryByName.get(t.category) ?? null
  }

  // 今月の取引
  const monthTransactions = useMemo(
    () => transactions.filter(t => t.date.startsWith(month)),
    [transactions, month]
  )

  const summary = useMemo(() => {
    let income = 0
    let expense = 0
    for (const t of monthTransactions) {
      if (t.type === '収入') income += t.amount
      else expense += t.amount
    }
    return { income, expense, balance: income - expense }
  }, [monthTransactions])

  // カテゴリ別支出集計
  const expenseByCategory = useMemo(() => {
    const byId = new Map<string, { category: MoneyCategory; amount: number }>()
    let otherAmount = 0
    for (const t of monthTransactions) {
      if (t.type !== '支出') continue
      const cat = resolveCategory(t)
      if (!cat) {
        otherAmount += t.amount
        continue
      }
      const existing = byId.get(cat.id)
      if (existing) existing.amount += t.amount
      else byId.set(cat.id, { category: cat, amount: t.amount })
    }
    const arr = Array.from(byId.values()).sort((a, b) => b.amount - a.amount)
    return { arr, otherAmount }
  }, [monthTransactions, categoryById, categoryByName])

  // 日付ごとにグループ化
  const transactionsByDay = useMemo(() => {
    const map = new Map<string, Transaction[]>()
    for (const t of monthTransactions) {
      const list = map.get(t.date) || []
      list.push(t)
      map.set(t.date, list)
    }
    return Array.from(map.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([date, items]) => {
        let dayBalance = 0
        for (const t of items) dayBalance += t.type === '収入' ? t.amount : -t.amount
        return {
          date,
          items: items.sort((a, b) => b.createdAt - a.createdAt),
          dayBalance,
        }
      })
  }, [monthTransactions])

  // 予算情報
  const monthBudgets = useMemo(() => budgets.filter(b => b.month === month), [budgets, month])
  const totalBudget = monthBudgets.reduce((s, b) => s + b.amount, 0)
  const budgetByCategoryId = useMemo(() => {
    const map = new Map<string, number>()
    for (const b of monthBudgets) map.set(b.categoryId, b.amount)
    return map
  }, [monthBudgets])

  const hasBudget = monthBudgets.length > 0

  const handleEditTransaction = (t: Transaction) => {
    setEditing(t)
    setTxDialogOpen(true)
  }

  const handleDialogSubmit = (data: Omit<Transaction, 'id' | 'createdAt'>) => {
    if (editing) {
      onUpdateTransaction(editing.id, data)
    } else {
      onAddTransaction(data)
    }
    setEditing(null)
  }

  return (
    <div className="space-y-4 pb-20 relative">
      {/* 月切替 */}
      <MonthPicker month={month} onChange={setMonth} />

      {/* サマリー */}
      <div className="grid grid-cols-3 gap-2">
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
              <TrendingUp className="h-3 w-3" /> 収入
            </div>
            <p className="text-sm font-bold text-money mt-1 truncate">
              {summary.income.toLocaleString()}
              <span className="text-[10px] text-muted-foreground ml-0.5">円</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
              <TrendingDown className="h-3 w-3" /> 支出
            </div>
            <p className="text-sm font-bold text-destructive mt-1 truncate">
              {summary.expense.toLocaleString()}
              <span className="text-[10px] text-muted-foreground ml-0.5">円</span>
            </p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="text-muted-foreground text-[10px]">収支</div>
            <p
              className={cn(
                'text-sm font-bold mt-1 truncate',
                summary.balance >= 0 ? 'text-money' : 'text-destructive'
              )}
            >
              {summary.balance >= 0 ? '+' : ''}
              {summary.balance.toLocaleString()}
              <span className="text-[10px] text-muted-foreground ml-0.5">円</span>
            </p>
          </CardContent>
        </Card>
      </div>

      {/* 予算進捗 (予算設定がある場合のみ) */}
      {hasBudget && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-foreground" />
                <h3 className="text-sm font-medium text-foreground">予算</h3>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => setBudgetDialogOpen(true)}
              >
                編集
              </Button>
            </div>

            {/* 総予算バー */}
            <div className="mb-3 space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">合計</span>
                <span className="text-foreground">
                  <span
                    className={cn(
                      'font-semibold',
                      summary.expense > totalBudget && 'text-destructive'
                    )}
                  >
                    {summary.expense.toLocaleString()}
                  </span>
                  {' / '}
                  {totalBudget.toLocaleString()} 円
                </span>
              </div>
              <div className="h-2 rounded-full bg-secondary overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    summary.expense > totalBudget ? 'bg-destructive' : 'bg-money'
                  )}
                  style={{ width: `${Math.min(100, (summary.expense / Math.max(1, totalBudget)) * 100)}%` }}
                />
              </div>
            </div>

            {/* カテゴリ別予算 */}
            <div className="space-y-2">
              {monthBudgets
                .map(b => ({
                  budget: b,
                  category: categoryById.get(b.categoryId),
                  spent: expenseByCategory.arr.find(e => e.category.id === b.categoryId)?.amount || 0,
                }))
                .filter(x => x.category)
                .sort((a, b) => (b.spent / Math.max(1, b.budget.amount)) - (a.spent / Math.max(1, a.budget.amount)))
                .map(({ budget, category, spent }) => {
                  if (!category) return null
                  const Icon = getIconComponent(category.icon)
                  const pct = Math.min(100, (spent / Math.max(1, budget.amount)) * 100)
                  const over = spent > budget.amount
                  return (
                    <div key={budget.id} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: category.color }} />
                          <span className="text-foreground truncate">{category.name}</span>
                        </div>
                        <span className="text-muted-foreground shrink-0 ml-2">
                          <span className={cn('font-semibold', over ? 'text-destructive' : 'text-foreground')}>
                            {spent.toLocaleString()}
                          </span>
                          {' / '}
                          {budget.amount.toLocaleString()}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${pct}%`,
                            backgroundColor: over ? '#ef4444' : category.color,
                          }}
                        />
                      </div>
                    </div>
                  )
                })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* カテゴリ別支出内訳 */}
      {expenseByCategory.arr.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">支出の内訳</h3>
            <div className="space-y-2">
              {expenseByCategory.arr.slice(0, 8).map(({ category, amount }) => {
                const Icon = getIconComponent(category.icon)
                const pct = (amount / Math.max(1, summary.expense)) * 100
                const budget = budgetByCategoryId.get(category.id)
                return (
                  <div key={category.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: category.color }} />
                        <span className="text-foreground truncate">{category.name}</span>
                        <span className="text-muted-foreground shrink-0">
                          {pct.toFixed(0)}%
                        </span>
                      </div>
                      <span className="text-foreground shrink-0 ml-2 font-semibold">
                        {amount.toLocaleString()}円
                      </span>
                    </div>
                    <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: category.color,
                        }}
                      />
                    </div>
                  </div>
                )
              })}
              {expenseByCategory.arr.length > 8 && (
                <p className="text-xs text-muted-foreground text-center pt-1">
                  他 {expenseByCategory.arr.length - 8} カテゴリ
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* アクション行 (予算なし時のCTAと各種設定) */}
      <div className="flex gap-2 flex-wrap">
        {!hasBudget && (
          <Button
            variant="outline"
            size="sm"
            className="gap-1"
            onClick={() => setBudgetDialogOpen(true)}
          >
            <Target className="h-4 w-4" />
            予算を設定
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          className="gap-1"
          onClick={() => setCategoryDialogOpen(true)}
        >
          <Settings2 className="h-4 w-4" />
          カテゴリ管理
        </Button>
      </div>

      {/* 日別取引リスト */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">取引履歴</h3>
          {transactionsByDay.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              この月の記録がありません
            </p>
          ) : (
            <div className="space-y-4">
              {transactionsByDay.map(({ date, items, dayBalance }) => (
                <div key={date} className="space-y-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground pb-1 border-b border-border">
                    <span>{formatDayLabel(date)}</span>
                    <span
                      className={cn(
                        'font-semibold',
                        dayBalance >= 0 ? 'text-money' : 'text-destructive'
                      )}
                    >
                      {dayBalance >= 0 ? '+' : ''}
                      {dayBalance.toLocaleString()}円
                    </span>
                  </div>
                  {items.map((t) => {
                    const cat = resolveCategory(t)
                    const Icon = getIconComponent(cat?.icon || fallbackCategoryMeta.icon)
                    const color = cat?.color || fallbackCategoryMeta.color
                    return (
                      <div
                        key={t.id}
                        className="group flex items-center gap-3 rounded-lg hover:bg-secondary/50 p-2 -mx-1 transition-colors"
                      >
                        <div
                          className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0"
                          style={{ backgroundColor: color + '22' }}
                        >
                          <Icon className="h-4 w-4" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {cat?.name || t.category}
                          </p>
                          {t.memo && (
                            <p className="text-xs text-muted-foreground truncate">{t.memo}</p>
                          )}
                        </div>
                        <span
                          className={cn(
                            'text-sm font-semibold shrink-0',
                            t.type === '収入' ? 'text-money' : 'text-foreground'
                          )}
                        >
                          {t.type === '収入' ? '+' : '-'}
                          {t.amount.toLocaleString()}
                          <span className="text-[10px] text-muted-foreground ml-0.5">円</span>
                        </span>
                        <div className="flex items-center gap-0.5">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => handleEditTransaction(t)}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={() => onDeleteTransaction(t.id)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAB - 右下固定追加ボタン */}
      <Button
        type="button"
        size="icon"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-money hover:bg-money/90 text-background"
        onClick={() => {
          setEditing(null)
          setTxDialogOpen(true)
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* ダイアログ群 */}
      <TransactionDialog
        open={txDialogOpen}
        onOpenChange={(open) => {
          setTxDialogOpen(open)
          if (!open) setEditing(null)
        }}
        categories={categories}
        editing={editing}
        onSubmit={handleDialogSubmit}
      />

      <CategoryManageDialog
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        categories={categories}
        onAdd={onAddCategory}
        onDelete={onDeleteCategory}
        onMove={onMoveCategory}
      />

      <BudgetManageDialog
        open={budgetDialogOpen}
        onOpenChange={setBudgetDialogOpen}
        month={month}
        categories={categories}
        budgets={budgets}
        onSave={(categoryId, amount) => onSaveBudget(categoryId, month, amount)}
        onDelete={(categoryId) => onDeleteBudget(categoryId, month)}
      />
    </div>
  )
}
