'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Search, ArrowLeft } from 'lucide-react'
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
import type { Recipe, RecipeItem, CustomFoodItem } from '@/lib/types'
import { foodDatabase, type FoodItem } from '@/lib/food-database'

interface RecipeBuilderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  customFoods: CustomFoodItem[]
  editing?: Recipe | null
  onSave: (recipe: Omit<Recipe, 'id' | 'createdAt'>) => void
}

type View = 'form' | 'picker'

function calcItemNutrients(foodItemId: string, amount: number, allFoods: FoodItem[]) {
  const food = allFoods.find(f => f.id === foodItemId)
  if (!food) return { calories: 0, protein: 0, fat: 0, carbs: 0 }
  const multiplier = food.category === 'dish' ? amount / 100 : amount / 100
  return {
    calories: food.calories * multiplier,
    protein: food.protein * multiplier,
    fat: food.fat * multiplier,
    carbs: food.carbs * multiplier,
  }
}

export function RecipeBuilderDialog({
  open,
  onOpenChange,
  customFoods,
  editing,
  onSave,
}: RecipeBuilderDialogProps) {
  const [view, setView] = useState<View>('form')
  const [name, setName] = useState('')
  const [items, setItems] = useState<RecipeItem[]>([])
  const [query, setQuery] = useState('')
  const [amountDraft, setAmountDraft] = useState<Record<string, string>>({})

  const allFoods = useMemo<FoodItem[]>(() => {
    return [
      ...foodDatabase,
      ...customFoods.map(c => ({
        id: `custom:${c.id}`,
        name: c.name,
        calories: c.calories,
        protein: c.protein,
        fat: c.fat,
        carbs: c.carbs,
      })),
    ]
  }, [customFoods])

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name)
        setItems(editing.items)
      } else {
        setName('')
        setItems([])
      }
      setView('form')
      setQuery('')
      setAmountDraft({})
    }
  }, [open, editing])

  const searchResults = useMemo(() => {
    const q = query.trim()
    if (!q) return allFoods.slice(0, 20)
    const lower = q.toLowerCase()
    return allFoods.filter(f => f.name.toLowerCase().includes(lower)).slice(0, 30)
  }, [query, allFoods])

  const totals = useMemo(() => {
    return items.reduce(
      (acc, item) => {
        const n = calcItemNutrients(item.foodItemId, item.amount, allFoods)
        return {
          calories: acc.calories + n.calories,
          protein: acc.protein + n.protein,
          fat: acc.fat + n.fat,
          carbs: acc.carbs + n.carbs,
        }
      },
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    )
  }, [items, allFoods])

  const addItem = (food: FoodItem) => {
    const defaultAmount = food.category === 'dish' ? 100 : 100 // 1人前=100 or 100g
    setItems(prev => [
      ...prev,
      { foodItemId: food.id, foodName: food.name, amount: defaultAmount },
    ])
    setView('form')
    setQuery('')
  }

  const removeItem = (index: number) => {
    setItems(prev => prev.filter((_, i) => i !== index))
  }

  const updateAmount = (index: number, amount: number) => {
    setItems(prev =>
      prev.map((item, i) => (i === index ? { ...item, amount } : item))
    )
  }

  const handleSave = () => {
    if (!name.trim() || items.length === 0) return
    onSave({
      name: name.trim(),
      items,
      totalCalories: totals.calories,
      totalProtein: totals.protein,
      totalFat: totals.fat,
      totalCarbs: totals.carbs,
    })
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
        {view === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>
                {editing ? 'レシピを編集' : 'レシピを作成'}
              </DialogTitle>
              <DialogDescription>
                複数の食品をまとめて1つのレシピにすると、1タップで再追加できます。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label className="text-muted-foreground">レシピ名</Label>
              <Input
                type="text"
                placeholder="例: 鶏胸肉のトマト煮 (2人前)"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">食品</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setView('picker')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  追加
                </Button>
              </div>
              {items.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">
                  まだ食品がありません
                </p>
              ) : (
                <div className="space-y-1">
                  {items.map((item, i) => {
                    const food = allFoods.find(f => f.id === item.foodItemId)
                    const isDish = food?.category === 'dish'
                    const n = calcItemNutrients(item.foodItemId, item.amount, allFoods)
                    return (
                      <div
                        key={i}
                        className="flex items-center gap-2 rounded-md bg-secondary/40 p-2"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            {item.foodName}
                          </p>
                          <p className="text-[10px] text-muted-foreground">
                            {Math.round(n.calories)} kcal · P{n.protein.toFixed(1)}{' '}
                            F{n.fat.toFixed(1)} C{n.carbs.toFixed(1)}
                          </p>
                        </div>
                        <div className="relative w-20">
                          <Input
                            type="number"
                            inputMode="decimal"
                            value={amountDraft[i] ?? item.amount}
                            onChange={(e) => {
                              setAmountDraft(prev => ({ ...prev, [i]: e.target.value }))
                            }}
                            onBlur={(e) => {
                              const val = parseFloat(e.target.value) || 0
                              updateAmount(i, val)
                              setAmountDraft(prev => {
                                const next = { ...prev }
                                delete next[i]
                                return next
                              })
                            }}
                            className="bg-secondary border-border text-foreground text-right text-sm h-8 pr-6"
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                            {isDish ? '人前' : 'g'}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeItem(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {items.length > 0 && (
              <div className="rounded-lg bg-food/10 p-3">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-[10px] text-muted-foreground">kcal</p>
                    <p className="text-base font-bold text-food">
                      {Math.round(totals.calories)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">P</p>
                    <p className="text-base font-bold text-food">
                      {totals.protein.toFixed(1)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">F</p>
                    <p className="text-base font-bold text-food">
                      {totals.fat.toFixed(1)}g
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-muted-foreground">C</p>
                    <p className="text-base font-bold text-food">
                      {totals.carbs.toFixed(1)}g
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                className="flex-1 bg-food hover:bg-food/90 text-background"
                disabled={!name.trim() || items.length === 0}
                onClick={handleSave}
              >
                保存
              </Button>
            </div>
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
                  onClick={() => setView('form')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                食品を追加
              </DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="食品名を検索..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-secondary border-border text-foreground pl-9"
                autoFocus
              />
            </div>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {searchResults.map((food) => (
                <button
                  key={food.id}
                  type="button"
                  onClick={() => addItem(food)}
                  className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-secondary/60 transition-colors"
                >
                  <span className="text-sm text-foreground truncate">{food.name}</span>
                  <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
                    {food.calories}kcal{food.category === 'dish' ? '/1食' : '/100g'}
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
