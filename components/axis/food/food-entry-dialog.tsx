'use client'

import { useState, useMemo, useEffect } from 'react'
import { Search, Plus, Clock, ArrowLeft } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { FoodEntry, CustomFoodItem } from '@/lib/types'
import { foodDatabase, searchFoods, type FoodItem } from '@/lib/food-database'
import { cn } from '@/lib/utils'

type MealTiming = '朝食' | '昼食' | '夕食' | '間食'

interface FoodEntryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  date: string // YYYY-MM-DD
  defaultMealTiming?: MealTiming
  recents: FoodItem[] // 直近で使った食品 (頻度順)
  customFoods: CustomFoodItem[]
  onSubmit: (entry: Omit<FoodEntry, 'id' | 'createdAt'>) => void
  onAddCustomFood: (food: Omit<CustomFoodItem, 'id' | 'createdAt'>) => CustomFoodItem
}

type View = 'select' | 'amount' | 'create'

export function FoodEntryDialog({
  open,
  onOpenChange,
  date,
  defaultMealTiming = '昼食',
  recents,
  customFoods,
  onSubmit,
  onAddCustomFood,
}: FoodEntryDialogProps) {
  const [view, setView] = useState<View>('select')
  const [query, setQuery] = useState('')
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [amount, setAmount] = useState('100')
  const [mealTiming, setMealTiming] = useState<MealTiming>(defaultMealTiming)

  // カスタム食品の新規作成フォーム
  const [newFoodName, setNewFoodName] = useState('')
  const [newFoodKcal, setNewFoodKcal] = useState('')
  const [newFoodP, setNewFoodP] = useState('')
  const [newFoodF, setNewFoodF] = useState('')
  const [newFoodC, setNewFoodC] = useState('')

  useEffect(() => {
    if (!open) {
      setView('select')
      setQuery('')
      setSelectedFood(null)
      setAmount('100')
      setNewFoodName('')
      setNewFoodKcal('')
      setNewFoodP('')
      setNewFoodF('')
      setNewFoodC('')
    } else {
      setMealTiming(defaultMealTiming)
    }
  }, [open, defaultMealTiming])

  // 全食品 (カスタム含む)
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

  const searchResults = useMemo(() => {
    const q = query.trim()
    if (!q) return []
    const lower = q.toLowerCase()
    return allFoods.filter(f => f.name.toLowerCase().includes(lower)).slice(0, 30)
  }, [query, allFoods])

  const handleSelect = (food: FoodItem) => {
    setSelectedFood(food)
    setAmount(food.category === 'dish' ? '1' : '100')
    setView('amount')
  }

  const calculated = useMemo(() => {
    if (!selectedFood || !amount) {
      return { calories: 0, protein: 0, fat: 0, carbs: 0 }
    }
    // dish カテゴリは 1食分単位(amount = 分量倍率として使う)
    const multiplier =
      selectedFood.category === 'dish'
        ? parseFloat(amount) || 0
        : (parseFloat(amount) || 0) / 100
    return {
      calories: selectedFood.calories * multiplier,
      protein: selectedFood.protein * multiplier,
      fat: selectedFood.fat * multiplier,
      carbs: selectedFood.carbs * multiplier,
    }
  }, [selectedFood, amount])

  const handleConfirm = () => {
    if (!selectedFood || !amount) return
    const amt = parseFloat(amount)
    if (isNaN(amt) || amt <= 0) return
    onSubmit({
      foodName: selectedFood.name,
      foodItemId: selectedFood.id,
      amount: selectedFood.category === 'dish' ? amt * 100 : amt,
      calories: calculated.calories,
      protein: calculated.protein,
      fat: calculated.fat,
      carbs: calculated.carbs,
      mealTiming,
      date,
    })
    onOpenChange(false)
  }

  const handleCreateCustom = () => {
    const name = newFoodName.trim()
    if (!name) return
    const kcal = parseFloat(newFoodKcal) || 0
    const p = parseFloat(newFoodP) || 0
    const f = parseFloat(newFoodF) || 0
    const c = parseFloat(newFoodC) || 0
    const created = onAddCustomFood({
      name,
      calories: kcal,
      protein: p,
      fat: f,
      carbs: c,
    })
    setSelectedFood({
      id: `custom:${created.id}`,
      name: created.name,
      calories: created.calories,
      protein: created.protein,
      fat: created.fat,
      carbs: created.carbs,
    })
    setAmount('100')
    setView('amount')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
        {view === 'select' && (
          <>
            <DialogHeader>
              <DialogTitle>食品を選択</DialogTitle>
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
              {query.trim() === '' && recents.length > 0 && (
                <>
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground px-1 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    最近使った食品
                  </h4>
                  {recents.slice(0, 8).map((food) => (
                    <FoodRow key={food.id} food={food} onClick={() => handleSelect(food)} />
                  ))}
                </>
              )}

              {query.trim() !== '' && (
                <>
                  {searchResults.length === 0 ? (
                    <p className="text-center text-sm text-muted-foreground py-4">
                      該当する食品がありません
                    </p>
                  ) : (
                    searchResults.map((food) => (
                      <FoodRow key={food.id} food={food} onClick={() => handleSelect(food)} />
                    ))
                  )}
                </>
              )}

              {query.trim() === '' && recents.length === 0 && (
                <div className="max-h-[50vh] overflow-y-auto">
                  {['meat', 'fish', 'grain', 'vegetable', 'fruit', 'dairy', 'bean', 'dish', 'beverage', 'snack', 'other'].map(cat => {
                    const items = foodDatabase.filter(f => f.category === cat)
                    if (items.length === 0) return null
                    return (
                      <div key={cat}>
                        <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1 px-1">
                          {categoryLabel(cat)}
                        </h4>
                        {items.map((food) => (
                          <FoodRow key={food.id} food={food} onClick={() => handleSelect(food)} />
                        ))}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full gap-2 border-dashed"
              onClick={() => setView('create')}
            >
              <Plus className="h-4 w-4" />
              カスタム食品を追加
            </Button>
          </>
        )}

        {view === 'amount' && selectedFood && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView('select')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <span className="flex-1 truncate">{selectedFood.name}</span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {selectedFood.category === 'dish' ? '分量' : '量 (g)'}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="1"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="bg-secondary border-border text-foreground text-2xl h-14 pr-12 text-right font-semibold"
                    autoFocus
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {selectedFood.category === 'dish' ? '人前' : 'g'}
                  </span>
                </div>
              </div>

              {/* PFC プレビュー */}
              <div className="grid grid-cols-4 gap-2 rounded-lg bg-food/10 p-3 text-center">
                <div>
                  <p className="text-[10px] text-muted-foreground">kcal</p>
                  <p className="text-base font-bold text-food">
                    {Math.round(calculated.calories)}
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">P</p>
                  <p className="text-base font-bold text-food">
                    {calculated.protein.toFixed(1)}g
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">F</p>
                  <p className="text-base font-bold text-food">
                    {calculated.fat.toFixed(1)}g
                  </p>
                </div>
                <div>
                  <p className="text-[10px] text-muted-foreground">C</p>
                  <p className="text-base font-bold text-food">
                    {calculated.carbs.toFixed(1)}g
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-muted-foreground">食事タイミング</Label>
                <div className="grid grid-cols-4 gap-1">
                  {(['朝食', '昼食', '夕食', '間食'] as MealTiming[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setMealTiming(m)}
                      className={cn(
                        'rounded-md border py-2 text-xs font-medium transition-colors',
                        mealTiming === m
                          ? 'bg-food/20 border-food text-food'
                          : 'bg-secondary border-border text-muted-foreground'
                      )}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              <Button
                type="button"
                className="w-full bg-food hover:bg-food/90 text-background font-medium"
                onClick={handleConfirm}
                disabled={!amount || parseFloat(amount) <= 0}
              >
                記録する
              </Button>
            </div>
          </>
        )}

        {view === 'create' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView('select')}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                カスタム食品を追加
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                100gあたりの栄養成分を入力してください。
              </p>
              <div className="space-y-2">
                <Label className="text-muted-foreground">食品名</Label>
                <Input
                  type="text"
                  placeholder="例: 自家製カレー"
                  value={newFoodName}
                  onChange={(e) => setNewFoodName(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">カロリー (kcal / 100g)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="0"
                  value={newFoodKcal}
                  onChange={(e) => setNewFoodKcal(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">P (g)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={newFoodP}
                    onChange={(e) => setNewFoodP(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">F (g)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={newFoodF}
                    onChange={(e) => setNewFoodF(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">C (g)</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="0"
                    value={newFoodC}
                    onChange={(e) => setNewFoodC(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={handleCreateCustom}
                disabled={!newFoodName.trim()}
              >
                登録して量を入力
              </Button>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function categoryLabel(cat: string): string {
  const map: Record<string, string> = {
    meat: '肉類',
    fish: '魚介類',
    grain: '穀物',
    vegetable: '野菜',
    fruit: '果物',
    dairy: '乳製品・卵',
    bean: '豆類',
    snack: 'スナック',
    beverage: '飲料',
    dish: '定食・外食',
    other: 'その他',
  }
  return map[cat] || cat
}

function FoodRow({ food, onClick }: { food: FoodItem; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left hover:bg-secondary/60 transition-colors"
    >
      <span className="text-sm text-foreground truncate">{food.name}</span>
      <span className="text-[10px] text-muted-foreground shrink-0 ml-2">
        {food.calories}kcal{food.category === 'dish' ? '/1食' : '/100g'}
      </span>
    </button>
  )
}
