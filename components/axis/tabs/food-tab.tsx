'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Settings2, Flame, BookMarked, Edit3 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { FoodEntry, FoodGoal, CustomFoodItem, Recipe } from '@/lib/types'
import { foodDatabase, type FoodItem } from '@/lib/food-database'
import { FoodDatePicker, getToday } from '@/components/axis/food/date-picker'
import { FoodEntryDialog } from '@/components/axis/food/food-entry-dialog'
import { GoalDialog } from '@/components/axis/food/goal-dialog'
import { RecipeBuilderDialog } from '@/components/axis/food/recipe-builder-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

type MealTiming = '朝食' | '昼食' | '夕食' | '間食'

interface FoodTabProps {
  foods: FoodEntry[]
  goal: FoodGoal
  customFoods: CustomFoodItem[]
  recipes: Recipe[]
  prefilledFood?: string
  onAddFood: (entry: Omit<FoodEntry, 'id' | 'createdAt'>) => void
  onDeleteFood: (id: string) => void
  onSaveGoal: (goal: FoodGoal) => void
  onAddCustomFood: (food: Omit<CustomFoodItem, 'id' | 'createdAt'>) => CustomFoodItem
  onApplyRecipe: (recipe: Recipe, mealTiming: '朝食' | '昼食' | '夕食' | '間食', date: string) => void
  onSaveRecipe: (recipe: Omit<Recipe, 'id' | 'createdAt'>, editingId?: string) => void
  onDeleteRecipe: (id: string) => void
  onClearPrefill?: () => void
}

// 進捗リング(SVG)
function ProgressRing({
  value,
  target,
  size = 140,
  stroke = 10,
}: {
  value: number
  target: number
  size?: number
  stroke?: number
}) {
  const radius = (size - stroke) / 2
  const circumference = 2 * Math.PI * radius
  const pct = target > 0 ? Math.min(1, value / target) : 0
  const offset = circumference * (1 - pct)
  const remaining = Math.max(0, target - value)
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="var(--color-secondary)"
          strokeWidth={stroke}
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={value > target ? '#ef4444' : 'var(--color-food)'}
          strokeWidth={stroke}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-[10px] text-muted-foreground">残り</p>
        <p className="text-xl font-bold text-foreground">{Math.round(remaining)}</p>
        <p className="text-[10px] text-muted-foreground">kcal</p>
      </div>
    </div>
  )
}

const MEAL_ORDER: MealTiming[] = ['朝食', '昼食', '夕食', '間食']

export function FoodTab({
  foods,
  goal,
  customFoods,
  recipes,
  prefilledFood,
  onAddFood,
  onDeleteFood,
  onSaveGoal,
  onAddCustomFood,
  onApplyRecipe,
  onSaveRecipe,
  onDeleteRecipe,
  onClearPrefill,
}: FoodTabProps) {
  const [date, setDate] = useState(getToday())
  const [dialogOpen, setDialogOpen] = useState(false)
  const [dialogMeal, setDialogMeal] = useState<MealTiming>('昼食')
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [recipeManagerOpen, setRecipeManagerOpen] = useState(false)
  const [recipeBuilderOpen, setRecipeBuilderOpen] = useState(false)
  const [editingRecipe, setEditingRecipe] = useState<Recipe | null>(null)

  // 検索オーバーレイからの prefill
  useEffect(() => {
    if (prefilledFood) {
      setDialogMeal('昼食')
      setDialogOpen(true)
      onClearPrefill?.()
    }
  }, [prefilledFood, onClearPrefill])

  const todayFoods = useMemo(
    () => foods.filter(f => f.date === date),
    [foods, date]
  )

  const totals = useMemo(() => {
    return todayFoods.reduce(
      (acc, f) => ({
        calories: acc.calories + f.calories,
        protein: acc.protein + f.protein,
        fat: acc.fat + f.fat,
        carbs: acc.carbs + f.carbs,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    )
  }, [todayFoods])

  const byMeal = useMemo(() => {
    const map = new Map<MealTiming, FoodEntry[]>()
    for (const m of MEAL_ORDER) map.set(m, [])
    for (const f of todayFoods) {
      map.get(f.mealTiming)?.push(f)
    }
    return map
  }, [todayFoods])

  // 最近使った食品 (全期間の直近20エントリから頻度順)
  const recents = useMemo<FoodItem[]>(() => {
    const counts = new Map<string, { food: FoodItem; count: number; lastUsed: number }>()
    const allFoods = [
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
    const byId = new Map(allFoods.map(f => [f.id, f]))
    const byName = new Map(allFoods.map(f => [f.name, f]))
    const recentEntries = [...foods]
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 50)
    for (const e of recentEntries) {
      const food = (e.foodItemId && byId.get(e.foodItemId)) || byName.get(e.foodName)
      if (!food) continue
      const existing = counts.get(food.id)
      if (existing) {
        existing.count += 1
        existing.lastUsed = Math.max(existing.lastUsed, e.createdAt)
      } else {
        counts.set(food.id, { food, count: 1, lastUsed: e.createdAt })
      }
    }
    return Array.from(counts.values())
      .sort((a, b) => b.count - a.count || b.lastUsed - a.lastUsed)
      .map(x => x.food)
  }, [foods, customFoods])

  const openAddDialog = (meal: MealTiming) => {
    setDialogMeal(meal)
    setDialogOpen(true)
  }

  const kcalPct = goal.calories > 0 ? (totals.calories / goal.calories) * 100 : 0
  const pPct = goal.protein > 0 ? Math.min(100, (totals.protein / goal.protein) * 100) : 0
  const fPct = goal.fat > 0 ? Math.min(100, (totals.fat / goal.fat) * 100) : 0
  const cPct = goal.carbs > 0 ? Math.min(100, (totals.carbs / goal.carbs) * 100) : 0

  return (
    <div className="space-y-4 pb-20 relative">
      {/* 日付切替 */}
      <FoodDatePicker date={date} onChange={setDate} />

      {/* ツールバー (レシピ管理など) */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1 text-xs"
          onClick={() => setRecipeManagerOpen(true)}
        >
          <BookMarked className="h-3.5 w-3.5" />
          レシピを管理 ({recipes.length})
        </Button>
      </div>

      {/* ダッシュボード: 進捗リング + 設定ボタン */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <ProgressRing value={totals.calories} target={goal.calories} />
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Flame className="h-3 w-3 text-food" />
                  摂取 / 目標
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground"
                  onClick={() => setGoalDialogOpen(true)}
                >
                  <Settings2 className="h-3.5 w-3.5" />
                </Button>
              </div>
              <p
                className={cn(
                  'text-lg font-bold',
                  totals.calories > goal.calories ? 'text-destructive' : 'text-foreground'
                )}
              >
                {Math.round(totals.calories).toLocaleString()}
                <span className="text-xs text-muted-foreground">
                  {' / '}
                  {goal.calories.toLocaleString()} kcal
                </span>
              </p>
              <p className="text-[10px] text-muted-foreground">
                {kcalPct.toFixed(0)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PFC バー */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">PFCバランス</h3>
          <div className="space-y-3">
            {[
              { label: 'P タンパク質', value: totals.protein, target: goal.protein, color: '#60a5fa', pct: pPct },
              { label: 'F 脂質', value: totals.fat, target: goal.fat, color: '#facc15', pct: fPct },
              { label: 'C 炭水化物', value: totals.carbs, target: goal.carbs, color: '#a78bfa', pct: cPct },
            ].map((row) => (
              <div key={row.label} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">{row.label}</span>
                  <span className="text-foreground">
                    <span className="font-semibold">
                      {row.value.toFixed(1)}
                    </span>
                    {' / '}
                    {row.target}g
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{
                      width: `${row.pct}%`,
                      backgroundColor: row.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 食事タイミング別 */}
      {MEAL_ORDER.map((meal) => {
        const entries = byMeal.get(meal) || []
        const mealCalories = entries.reduce((s, e) => s + e.calories, 0)
        return (
          <Card key={meal} className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground">{meal}</h3>
                  {entries.length > 0 && (
                    <span className="text-[10px] text-muted-foreground">
                      {Math.round(mealCalories)} kcal
                    </span>
                  )}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-food hover:text-food/80"
                  onClick={() => openAddDialog(meal)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              {entries.length === 0 ? (
                <button
                  type="button"
                  onClick={() => openAddDialog(meal)}
                  className="w-full text-center text-xs text-muted-foreground py-2 rounded-md hover:bg-secondary/40 transition-colors"
                >
                  タップして追加
                </button>
              ) : (
                <div className="space-y-1">
                  {entries.map((e) => (
                    <div
                      key={e.id}
                      className="group flex items-center gap-2 rounded-md hover:bg-secondary/40 p-1 -mx-1 transition-colors"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {e.foodName}
                        </p>
                        <p className="text-[10px] text-muted-foreground">
                          {e.amount}g · P{e.protein.toFixed(1)} F{e.fat.toFixed(1)} C{e.carbs.toFixed(1)}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-food shrink-0">
                        {Math.round(e.calories)}
                        <span className="text-[10px] text-muted-foreground ml-0.5">kcal</span>
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => onDeleteFood(e.id)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )
      })}

      {/* FAB */}
      <Button
        type="button"
        size="icon"
        className="fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 bg-food hover:bg-food/90 text-background"
        onClick={() => {
          // 現在時刻から食事タイミングを推測
          const hour = new Date().getHours()
          let suggested: MealTiming = '間食'
          if (hour >= 5 && hour < 10) suggested = '朝食'
          else if (hour >= 10 && hour < 14) suggested = '昼食'
          else if (hour >= 17 && hour < 22) suggested = '夕食'
          setDialogMeal(suggested)
          setDialogOpen(true)
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      <FoodEntryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        date={date}
        defaultMealTiming={dialogMeal}
        recents={recents}
        customFoods={customFoods}
        recipes={recipes}
        onSubmit={onAddFood}
        onSubmitRecipe={onApplyRecipe}
        onAddCustomFood={onAddCustomFood}
      />

      <GoalDialog
        open={goalDialogOpen}
        onOpenChange={setGoalDialogOpen}
        goal={goal}
        onSave={onSaveGoal}
      />

      {/* レシピ管理 (一覧・追加・編集・削除) */}
      <Dialog open={recipeManagerOpen} onOpenChange={setRecipeManagerOpen}>
        <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>レシピを管理</DialogTitle>
            <DialogDescription>
              よく食べる組み合わせをレシピとして保存しておくと、1タップでまとめて記録できます。
            </DialogDescription>
          </DialogHeader>

          <Button
            type="button"
            variant="outline"
            className="w-full gap-1 border-dashed"
            onClick={() => {
              setEditingRecipe(null)
              setRecipeBuilderOpen(true)
            }}
          >
            <Plus className="h-4 w-4" />
            新しいレシピを作成
          </Button>

          <div className="space-y-2">
            {recipes.length === 0 ? (
              <p className="text-center text-xs text-muted-foreground py-8">
                まだレシピがありません
              </p>
            ) : (
              recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {recipe.name}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {recipe.items.length} 品 · {Math.round(recipe.totalCalories)} kcal ·
                      P{recipe.totalProtein.toFixed(0)} F{recipe.totalFat.toFixed(0)} C{recipe.totalCarbs.toFixed(0)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingRecipe(recipe)
                      setRecipeBuilderOpen(true)
                    }}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(`「${recipe.name}」を削除しますか?`)) {
                        onDeleteRecipe(recipe.id)
                      }
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      <RecipeBuilderDialog
        open={recipeBuilderOpen}
        onOpenChange={setRecipeBuilderOpen}
        customFoods={customFoods}
        editing={editingRecipe}
        onSave={(data) => {
          onSaveRecipe(data, editingRecipe?.id)
          setEditingRecipe(null)
        }}
      />
    </div>
  )
}
