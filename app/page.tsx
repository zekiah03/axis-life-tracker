'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import { TopBar } from '@/components/axis/top-bar'
import { BottomNav } from '@/components/axis/bottom-nav'
import { SearchOverlay } from '@/components/axis/search-overlay'
import { ToastNotification } from '@/components/axis/toast-notification'
import { DashboardTab } from '@/components/axis/tabs/dashboard-tab'
import { MoneyTab } from '@/components/axis/tabs/money-tab'
import { WorkoutTab } from '@/components/axis/tabs/workout-tab'
import { FoodTab } from '@/components/axis/tabs/food-tab'
import { useLocalStorage } from '@/hooks/use-local-storage'
import type { TabType, Transaction, WorkoutEntry, FoodEntry } from '@/lib/types'

export default function AxisApp() {
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [prefilledFood, setPrefilledFood] = useState<string | undefined>()
  const [toast, setToast] = useState({ message: '', visible: false, color: 'bg-foreground' })
  const scrollRef = useRef<HTMLDivElement>(null)

  // Data storage
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('axis-transactions', [])
  const [workouts, setWorkouts] = useLocalStorage<WorkoutEntry[]>('axis-workouts', [])
  const [foods, setFoods] = useLocalStorage<FoodEntry[]>('axis-foods', [])

  // Reset scroll on tab change
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [activeTab])

  const showToast = useCallback((message: string, color: string) => {
    setToast({ message, visible: true, color })
  }, [])

  const hideToast = useCallback(() => {
    setToast(prev => ({ ...prev, visible: false }))
  }, [])

  // Transaction handlers
  const handleAddTransaction = useCallback((data: Omit<Transaction, 'id' | 'createdAt'>) => {
    const newTransaction: Transaction = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    setTransactions(prev => [...prev, newTransaction])
    showToast('取引を記録しました', 'bg-money')
  }, [setTransactions, showToast])

  const handleDeleteTransaction = useCallback((id: string) => {
    setTransactions(prev => prev.filter(t => t.id !== id))
    showToast('取引を削除しました', 'bg-destructive')
  }, [setTransactions, showToast])

  // Workout handlers
  const handleAddWorkout = useCallback((data: Omit<WorkoutEntry, 'id' | 'createdAt'>) => {
    const newWorkout: WorkoutEntry = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    setWorkouts(prev => [...prev, newWorkout])
    showToast('ワークアウトを記録しました', 'bg-workout')
  }, [setWorkouts, showToast])

  const handleDeleteWorkout = useCallback((id: string) => {
    setWorkouts(prev => prev.filter(w => w.id !== id))
    showToast('ワークアウトを削除しました', 'bg-destructive')
  }, [setWorkouts, showToast])

  // Food handlers
  const handleAddFood = useCallback((data: Omit<FoodEntry, 'id' | 'createdAt'>) => {
    const newFood: FoodEntry = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    setFoods(prev => [...prev, newFood])
    showToast('食事を記録しました', 'bg-food')
  }, [setFoods, showToast])

  const handleDeleteFood = useCallback((id: string) => {
    setFoods(prev => prev.filter(f => f.id !== id))
    showToast('食事を削除しました', 'bg-destructive')
  }, [setFoods, showToast])

  // Search handlers
  const handleSelectFoodDB = useCallback((foodName: string) => {
    setPrefilledFood(foodName)
  }, [])

  const handleClearPrefill = useCallback(() => {
    setPrefilledFood(undefined)
  }, [])

  // Add button handler - navigates to appropriate form tab
  const handleAddClick = useCallback(() => {
    if (activeTab === 'home') {
      // Default to money tab when on home
      setActiveTab('money')
    }
    // If already on a form tab, focus on form (scrolls to top)
    scrollRef.current?.scrollTo(0, 0)
  }, [activeTab])

  return (
    <div className="flex min-h-screen max-w-[480px] mx-auto flex-col bg-background">
      <TopBar
        onSearchClick={() => setIsSearchOpen(true)}
        onAddClick={handleAddClick}
      />

      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-4 pb-20 pt-16"
      >
        {activeTab === 'home' && (
          <DashboardTab
            transactions={transactions}
            workouts={workouts}
            foods={foods}
          />
        )}

        {activeTab === 'money' && (
          <MoneyTab
            transactions={transactions}
            onAddTransaction={handleAddTransaction}
            onDeleteTransaction={handleDeleteTransaction}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutTab
            workouts={workouts}
            onAddWorkout={handleAddWorkout}
            onDeleteWorkout={handleDeleteWorkout}
          />
        )}

        {activeTab === 'food' && (
          <FoodTab
            foods={foods}
            onAddFood={handleAddFood}
            onDeleteFood={handleDeleteFood}
            prefilledFood={prefilledFood}
            onClearPrefill={handleClearPrefill}
          />
        )}
      </main>

      <BottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        transactions={transactions}
        workouts={workouts}
        foods={foods}
        onSelectFoodDB={handleSelectFoodDB}
        onNavigateToTab={setActiveTab}
      />

      <ToastNotification
        message={toast.message}
        isVisible={toast.visible}
        onClose={hideToast}
        color={toast.color}
      />
    </div>
  )
}
