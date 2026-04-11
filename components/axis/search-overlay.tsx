'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import type { Transaction, WorkoutEntry, FoodEntry, TabType } from '@/lib/types'
import { foodDatabase, type FoodItem } from '@/lib/food-database'
import { cn } from '@/lib/utils'

interface SearchResult {
  id: string
  type: '家計簿' | '筋トレ' | '食事' | '食品DB'
  label: string
  subtitle: string
  data?: FoodItem
}

interface SearchOverlayProps {
  isOpen: boolean
  onClose: () => void
  transactions: Transaction[]
  workouts: WorkoutEntry[]
  foods: FoodEntry[]
  onSelectFoodDB: (foodName: string) => void
  onNavigateToTab: (tab: TabType) => void
}

export function SearchOverlay({
  isOpen,
  onClose,
  transactions,
  workouts,
  foods,
  onSelectFoodDB,
  onNavigateToTab,
}: SearchOverlayProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      setQuery('')
      setResults([])
    }
  }, [isOpen])

  useEffect(() => {
    if (!query.trim()) {
      setResults([])
      return
    }

    const normalizedQuery = query.toLowerCase()
    const newResults: SearchResult[] = []

    // Search transactions
    transactions.forEach((t) => {
      if (
        t.category.toLowerCase().includes(normalizedQuery) ||
        t.memo.toLowerCase().includes(normalizedQuery)
      ) {
        newResults.push({
          id: `transaction-${t.id}`,
          type: '家計簿',
          label: `${t.type === '収入' ? '+' : '-'}${t.amount.toLocaleString()}円`,
          subtitle: `${t.date} - ${t.category}${t.memo ? ` - ${t.memo}` : ''}`,
        })
      }
    })

    // Search workouts
    workouts.forEach((w) => {
      if (
        w.exercise.toLowerCase().includes(normalizedQuery) ||
        w.muscleGroup.toLowerCase().includes(normalizedQuery)
      ) {
        newResults.push({
          id: `workout-${w.id}`,
          type: '筋トレ',
          label: w.exercise,
          subtitle: `${w.date} - ${w.muscleGroup} - ${w.sets}x${w.reps} @ ${w.weight}kg`,
        })
      }
    })

    // Search food entries
    foods.forEach((f) => {
      if (f.foodName.toLowerCase().includes(normalizedQuery)) {
        newResults.push({
          id: `food-${f.id}`,
          type: '食事',
          label: f.foodName,
          subtitle: `${f.date} - ${f.mealTiming} - ${Math.round(f.calories)}kcal`,
        })
      }
    })

    // Search food database
    foodDatabase.forEach((food) => {
      if (food.name.toLowerCase().includes(normalizedQuery)) {
        newResults.push({
          id: `fooddb-${food.id}`,
          type: '食品DB',
          label: food.name,
          subtitle: `${food.calories}kcal / P:${food.protein}g / F:${food.fat}g / C:${food.carbs}g (per 100g)`,
          data: food,
        })
      }
    })

    setResults(newResults.slice(0, 20))
  }, [query, transactions, workouts, foods])

  const handleResultClick = (result: SearchResult) => {
    if (result.type === '食品DB' && result.data) {
      onSelectFoodDB(result.data.name)
      onNavigateToTab('food')
      onClose()
    } else if (result.type === '家計簿') {
      onNavigateToTab('money')
      onClose()
    } else if (result.type === '筋トレ') {
      onNavigateToTab('workout')
      onClose()
    } else if (result.type === '食事') {
      onNavigateToTab('food')
      onClose()
    }
  }

  const getTypeColor = (type: SearchResult['type']) => {
    switch (type) {
      case '家計簿':
        return 'bg-money/10 text-money'
      case '筋トレ':
        return 'bg-workout/10 text-workout'
      case '食事':
      case '食品DB':
        return 'bg-food/10 text-food'
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] bg-background animate-in fade-in-0">
      <div className="flex h-14 items-center gap-3 border-b border-border px-4">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          ref={inputRef}
          type="text"
          placeholder="検索..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border-0 bg-transparent text-foreground placeholder:text-muted-foreground focus-visible:ring-0"
        />
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-muted-foreground"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      <div className="h-[calc(100vh-56px)] overflow-y-auto p-4">
        {query.trim() === '' ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            検索キーワードを入力してください
          </p>
        ) : results.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            結果が見つかりませんでした
          </p>
        ) : (
          <div className="space-y-2">
            {results.map((result) => (
              <button
                key={result.id}
                onClick={() => handleResultClick(result)}
                className="flex w-full items-start justify-between rounded-lg bg-card p-3 text-left transition-colors hover:bg-accent"
              >
                <div className="flex-1">
                  <p className="font-medium text-foreground">{result.label}</p>
                  <p className="mt-0.5 text-xs text-muted-foreground">{result.subtitle}</p>
                </div>
                <span className={cn('ml-3 rounded-full px-2 py-0.5 text-xs font-medium', getTypeColor(result.type))}>
                  {result.type}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
