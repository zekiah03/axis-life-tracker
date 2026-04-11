'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
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
import type { FoodEntry } from '@/lib/types'
import { foodDatabase, searchFoods, type FoodItem } from '@/lib/food-database'
import { cn } from '@/lib/utils'

interface FoodTabProps {
  foods: FoodEntry[]
  onAddFood: (food: Omit<FoodEntry, 'id' | 'createdAt'>) => void
  onDeleteFood: (id: string) => void
  prefilledFood?: string
  onClearPrefill?: () => void
}

const mealTimings = ['朝食', '昼食', '夕食', '間食'] as const

export function FoodTab({ foods, onAddFood, onDeleteFood, prefilledFood, onClearPrefill }: FoodTabProps) {
  const [foodName, setFoodName] = useState('')
  const [amount, setAmount] = useState('')
  const [mealTiming, setMealTiming] = useState<typeof mealTimings[number]>('昼食')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [selectedFood, setSelectedFood] = useState<FoodItem | null>(null)
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState<FoodItem[]>([])
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Handle prefilled food from search
  useEffect(() => {
    if (prefilledFood) {
      setFoodName(prefilledFood)
      const found = foodDatabase.find(f => f.name === prefilledFood)
      if (found) {
        setSelectedFood(found)
      }
      onClearPrefill?.()
    }
  }, [prefilledFood, onClearPrefill])

  useEffect(() => {
    if (foodName.trim()) {
      const results = searchFoods(foodName)
      setSuggestions(results.slice(0, 5))
    } else {
      setSuggestions(foodDatabase.slice(0, 5))
    }
  }, [foodName])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectFood = (food: FoodItem) => {
    setFoodName(food.name)
    setSelectedFood(food)
    setShowSuggestions(false)
  }

  // Calculate PFC based on amount
  const calculatedNutrition = useMemo(() => {
    if (!selectedFood || !amount) {
      return { calories: 0, protein: 0, fat: 0, carbs: 0 }
    }
    const multiplier = parseFloat(amount) / 100
    return {
      calories: selectedFood.calories * multiplier,
      protein: selectedFood.protein * multiplier,
      fat: selectedFood.fat * multiplier,
      carbs: selectedFood.carbs * multiplier,
    }
  }, [selectedFood, amount])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!foodName || !amount || !mealTiming) return

    onAddFood({
      foodName,
      amount: parseFloat(amount),
      calories: calculatedNutrition.calories,
      protein: calculatedNutrition.protein,
      fat: calculatedNutrition.fat,
      carbs: calculatedNutrition.carbs,
      mealTiming,
      date,
    })

    setFoodName('')
    setAmount('')
    setSelectedFood(null)
  }

  const sortedFoods = [...foods].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="space-y-4">
      {/* Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Food Name with Autocomplete */}
            <div className="relative space-y-2">
              <Label className="text-muted-foreground">食品名</Label>
              <Input
                ref={inputRef}
                type="text"
                placeholder="食品名を入力..."
                value={foodName}
                onChange={(e) => {
                  setFoodName(e.target.value)
                  setSelectedFood(null)
                }}
                onFocus={() => setShowSuggestions(true)}
                className="bg-secondary border-border text-foreground"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
                >
                  {suggestions.map((food) => (
                    <button
                      key={food.id}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                      onClick={() => handleSelectFood(food)}
                    >
                      <span className="text-foreground">{food.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {food.calories}kcal / 100g
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Amount */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">量 (g)</Label>
              <Input
                type="number"
                inputMode="numeric"
                placeholder="100"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {/* Live PFC Display */}
            {selectedFood && amount && (
              <div className="rounded-lg bg-food/10 p-4 space-y-2 animate-in fade-in-0 slide-in-from-top-2">
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div>
                    <p className="text-xs text-muted-foreground">kcal</p>
                    <p className="text-lg font-bold text-food">{Math.round(calculatedNutrition.calories)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">P</p>
                    <p className="text-lg font-bold text-food">{calculatedNutrition.protein.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">F</p>
                    <p className="text-lg font-bold text-food">{calculatedNutrition.fat.toFixed(1)}g</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">C</p>
                    <p className="text-lg font-bold text-food">{calculatedNutrition.carbs.toFixed(1)}g</p>
                  </div>
                </div>
              </div>
            )}

            {/* Meal Timing */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">食事タイミング</Label>
              <Select value={mealTiming} onValueChange={(v) => setMealTiming(v as typeof mealTimings[number])}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {mealTimings.map((timing) => (
                    <SelectItem key={timing} value={timing}>
                      {timing}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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

            <Button
              type="submit"
              className="w-full bg-food hover:bg-food/90 text-background font-medium"
              disabled={!foodName || !amount || !mealTiming}
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Food History */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">食事履歴</h3>
          {sortedFoods.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">記録がありません</p>
          ) : (
            <div className="space-y-2">
              {sortedFoods.map((f) => (
                <div
                  key={f.id}
                  className="rounded-lg bg-secondary/50 p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{f.date}</span>
                      <span className="font-medium text-foreground">{f.foodName}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteFood(f.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <span className="rounded-full bg-food/10 px-2 py-0.5 text-xs text-food">
                      {f.mealTiming}
                    </span>
                    <span className="text-xs text-muted-foreground">{f.amount}g</span>
                    <span className="text-xs text-food">{Math.round(f.calories)}kcal</span>
                    <span className="text-xs text-muted-foreground">
                      P:{f.protein.toFixed(1)}g F:{f.fat.toFixed(1)}g C:{f.carbs.toFixed(1)}g
                    </span>
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
