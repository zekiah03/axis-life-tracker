'use client'

import { useState } from 'react'
import { Plus, Trash2, ChevronUp, ChevronDown, X } from 'lucide-react'
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
import type { MoneyCategory } from '@/lib/types'
import { getIconComponent } from '@/lib/tab-items'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface CategoryManageDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  categories: MoneyCategory[]
  onAdd: (cat: Omit<MoneyCategory, 'id' | 'order'>) => void
  onDelete: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
}

const iconChoices = [
  'UtensilsCrossed',
  'ShoppingBag',
  'Train',
  'Home',
  'Lightbulb',
  'Smartphone',
  'Gamepad2',
  'Shirt',
  'Sparkles',
  'Stethoscope',
  'GraduationCap',
  'Users',
  'Repeat',
  'FileText',
  'Briefcase',
  'Laptop',
  'Gift',
  'TrendingUp',
  'Package',
  'Car',
  'Plane',
  'Coffee',
  'Book',
  'Heart',
  'Dog',
]

const colorChoices = [
  '#f97316', '#22d3a0', '#60a5fa', '#a78bfa',
  '#facc15', '#3b82f6', '#ec4899', '#c084fc',
  '#f472b6', '#ef4444', '#14b8a6', '#fb923c',
  '#8b5cf6', '#71717a', '#a1a1aa',
]

export function CategoryManageDialog({
  open,
  onOpenChange,
  categories,
  onAdd,
  onDelete,
  onMove,
}: CategoryManageDialogProps) {
  const { t } = useI18n()
  const [view, setView] = useState<'list' | 'add'>('list')
  const [type, setType] = useState<'収入' | '支出'>('支出')
  const [name, setName] = useState('')
  const [icon, setIcon] = useState<string>('Package')
  const [color, setColor] = useState<string>('#a1a1aa')

  const filtered = categories
    .filter(c => c.type === type)
    .sort((a, b) => a.order - b.order)

  const handleAdd = () => {
    if (!name.trim()) return
    onAdd({ name: name.trim(), type, icon, color })
    setName('')
    setIcon('Package')
    setColor('#a1a1aa')
    setView('list')
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setView('list')
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
        {view === 'list' ? (
          <>
            <DialogHeader>
              <DialogTitle>{t.money.categoryManage}</DialogTitle>
              <DialogDescription>
                {t.money.categoryManageDesc}
              </DialogDescription>
            </DialogHeader>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn('flex-1', type === '支出' && 'bg-destructive/20 border-destructive text-destructive')}
                onClick={() => setType('支出')}
              >
                支出
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn('flex-1', type === '収入' && 'bg-money/20 border-money text-money')}
                onClick={() => setType('収入')}
              >
                収入
              </Button>
            </div>

            <div className="space-y-2">
              {filtered.map((cat, i) => {
                const Icon = getIconComponent(cat.icon)
                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2"
                  >
                    <div className="flex flex-col">
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 disabled:opacity-30"
                        disabled={i === 0}
                        onClick={() => onMove(cat.id, -1)}
                      >
                        <ChevronUp className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-5 w-5 disabled:opacity-30"
                        disabled={i === filtered.length - 1}
                        onClick={() => onMove(cat.id, 1)}
                      >
                        <ChevronDown className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    <Icon className="h-5 w-5 shrink-0" style={{ color: cat.color }} />
                    <span className="flex-1 text-sm font-medium text-foreground truncate">
                      {cat.name}
                    </span>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => {
                        if (confirm(t.common.deleteConfirmName(cat.name))) {
                          onDelete(cat.id)
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
              {filtered.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-8">
                  {t.money.noCategories}
                </p>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setView('add')}
              className="w-full gap-1"
            >
              <Plus className="h-4 w-4" />
              新しいカテゴリを追加
            </Button>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView('list')}
                >
                  <X className="h-4 w-4" />
                </Button>
                カテゴリを追加
              </DialogTitle>
            </DialogHeader>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn('flex-1', type === '支出' && 'bg-destructive/20 border-destructive text-destructive')}
                onClick={() => setType('支出')}
              >
                支出
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className={cn('flex-1', type === '収入' && 'bg-money/20 border-money text-money')}
                onClick={() => setType('収入')}
              >
                収入
              </Button>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.common.name}</Label>
              <Input
                type="text"
                placeholder={t.money.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.common.icon}</Label>
              <div className="grid grid-cols-8 gap-1 max-h-40 overflow-y-auto">
                {iconChoices.map((name) => {
                  const Icon = getIconComponent(name)
                  return (
                    <button
                      key={name}
                      type="button"
                      onClick={() => setIcon(name)}
                      className={cn(
                        'flex items-center justify-center h-10 rounded-md border transition-colors',
                        icon === name
                          ? 'border-foreground bg-foreground/10'
                          : 'border-border bg-secondary/40 hover:bg-secondary'
                      )}
                    >
                      <Icon className="h-4 w-4" style={{ color }} />
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.common.color}</Label>
              <div className="grid grid-cols-8 gap-1">
                {colorChoices.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColor(c)}
                    className={cn(
                      'h-8 rounded-md border-2 transition-all',
                      color === c ? 'border-foreground scale-110' : 'border-transparent'
                    )}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>

            <Button
              type="button"
              className="w-full"
              disabled={!name.trim()}
              onClick={handleAdd}
            >
              追加する
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
