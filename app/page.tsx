'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { TopBar } from '@/components/axis/top-bar'
import { BottomNav } from '@/components/axis/bottom-nav'
import { SearchOverlay } from '@/components/axis/search-overlay'
import { ToastNotification } from '@/components/axis/toast-notification'
import { OnboardingScreen } from '@/components/axis/onboarding-screen'
import { ReminderSettingsDialog } from '@/components/axis/reminder-settings-dialog'
import { I18nContext, translations, type Locale } from '@/lib/i18n'
import {
  DEFAULT_REMINDER_CONFIG,
  startDailyReminderCheck,
  stopDailyReminderCheck,
  type ReminderConfig,
} from '@/lib/notifications'
import { DashboardTab } from '@/components/axis/tabs/dashboard-tab'
import { MoneyTab } from '@/components/axis/tabs/money-tab'
import { WorkoutTab } from '@/components/axis/tabs/workout-tab'
import { FoodTab } from '@/components/axis/tabs/food-tab'
import { SleepTab } from '@/components/axis/tabs/sleep-tab'
import { BodyTab } from '@/components/axis/tabs/body-tab'
import { MetricDetailTab } from '@/components/axis/tabs/metric-detail-tab'
import { TabSettingsDialog } from '@/components/axis/tab-settings-dialog'
import { DataManagementDialog } from '@/components/axis/data-management-dialog'
import { useLocalStorage } from '@/hooks/use-local-storage'
import type {
  TabType,
  Transaction,
  WorkoutEntry,
  WorkoutSession,
  FoodEntry,
  FoodGoal,
  CustomFoodItem,
  Recipe,
  SleepEntry,
  BodyEntry,
  MetricDefinition,
  MetricEntry,
  TabConfig,
  BuiltinTabId,
  MoneyCategory,
  Budget,
} from '@/lib/types'
import { isMetricTabId, getMetricIdFromTabId } from '@/lib/types'
import type { MetricPreset } from '@/lib/metric-presets'
import { fetchDailyValues, fetchSleepSessions } from '@/lib/native-health'
import { metricPresets } from '@/lib/metric-presets'
import { computeSleepScore } from '@/lib/sleep-score'
import { allDefaultCategories } from '@/lib/money-categories'
import { foodDatabase } from '@/lib/food-database'

export default function AxisApp() {
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [isDataMgmtOpen, setIsDataMgmtOpen] = useState(false)
  const [isReminderOpen, setIsReminderOpen] = useState(false)

  // i18n
  const [locale, setLocale] = useLocalStorage<Locale>('axis-locale', 'ja')
  const t = translations[locale]

  // Reminder config
  const [reminderConfig, setReminderConfig] = useLocalStorage<ReminderConfig>(
    'axis-reminders',
    DEFAULT_REMINDER_CONFIG
  )
  const [prefilledFood, setPrefilledFood] = useState<string | undefined>()
  const [toast, setToast] = useState({ message: '', visible: false, color: 'bg-foreground' })
  const scrollRef = useRef<HTMLDivElement>(null)

  // Data storage
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('axis-transactions', [])
  const [moneyCategories, setMoneyCategories] = useLocalStorage<MoneyCategory[]>('axis-money-categories', [])
  const [budgets, setBudgets] = useLocalStorage<Budget[]>('axis-budgets', [])
  const [workouts, setWorkouts] = useLocalStorage<WorkoutEntry[]>('axis-workouts', [])
  const [workoutSessions, setWorkoutSessions] = useLocalStorage<WorkoutSession[]>('axis-workout-sessions', [])
  const [foods, setFoods] = useLocalStorage<FoodEntry[]>('axis-foods', [])
  const [foodGoal, setFoodGoal] = useLocalStorage<FoodGoal>('axis-food-goal', {
    calories: 2200,
    protein: 120,
    fat: 65,
    carbs: 260,
  })
  const [customFoods, setCustomFoods] = useLocalStorage<CustomFoodItem[]>('axis-custom-foods', [])
  const [recipes, setRecipes] = useLocalStorage<Recipe[]>('axis-recipes', [])
  const [sleeps, setSleeps] = useLocalStorage<SleepEntry[]>('axis-sleeps', [])
  const [bodies, setBodies] = useLocalStorage<BodyEntry[]>('axis-bodies', [])
  const [metrics, setMetrics] = useLocalStorage<MetricDefinition[]>('axis-metrics', [])
  const [metricEntries, setMetricEntries] = useLocalStorage<MetricEntry[]>('axis-metric-entries', [])

  // v2 タブ設定 (組み込み + metric:id の統一形式)
  const [tabConfig, setTabConfig] = useLocalStorage<TabConfig[]>('axis-tab-config-v2', [])
  const [onboarded, setOnboarded] = useLocalStorage<boolean>('axis-onboarded', false)

  // 家計簿カテゴリの初期投入 (初回 or 空の場合)
  useEffect(() => {
    if (moneyCategories.length > 0) return
    const now = Date.now()
    const initial: MoneyCategory[] = allDefaultCategories.map((c, i) => ({
      ...c,
      id: `cat-${now}-${i}`,
    }))
    setMoneyCategories(initial)
  }, [moneyCategories.length, setMoneyCategories])

  // 既存取引に categoryId を後付け (名前マッチで補完)
  useEffect(() => {
    if (moneyCategories.length === 0) return
    const byName = new Map(moneyCategories.map(c => [c.name, c.id]))
    let changed = false
    const updated = transactions.map(t => {
      if (t.categoryId) return t
      const id = byName.get(t.category)
      if (id) {
        changed = true
        return { ...t, categoryId: id }
      }
      return t
    })
    if (changed) setTransactions(updated)
  }, [moneyCategories, transactions, setTransactions])

  // 既存メトリクスに healthSource / multiplier を後付けで補完
  useEffect(() => {
    let needsUpdate = false
    const updated = metrics.map(m => {
      const preset = metricPresets.find(p => p.name === m.name)
      if (!preset) return m
      const next = { ...m }
      if (next.healthSource === undefined && preset.healthSource) {
        next.healthSource = preset.healthSource
        needsUpdate = true
      }
      if (next.healthValueMultiplier === undefined && preset.healthValueMultiplier !== undefined) {
        next.healthValueMultiplier = preset.healthValueMultiplier
        needsUpdate = true
      }
      return next
    })
    if (needsUpdate) {
      setMetrics(updated)
    }
  }, [metrics, setMetrics])

  // 一回だけの互換性 migration: v1 config (旧形式) と既存メトリクスから v2 を構築
  useEffect(() => {
    if (onboarded) return
    if (tabConfig.length > 0) {
      // 既にv2あり → オンボード済み扱い
      setOnboarded(true)
      return
    }

    // 旧形式を読む
    let migrated = false
    try {
      const oldRaw = typeof window !== 'undefined' ? window.localStorage.getItem('axis-tab-config') : null
      if (oldRaw) {
        const oldConfig = JSON.parse(oldRaw) as Array<{ id: string; visible: boolean }>
        const next: TabConfig[] = []
        // 組み込み: 'metrics' は除外
        for (const entry of oldConfig) {
          if (entry.id === 'metrics') continue
          if (['money', 'workout', 'food', 'sleep', 'body'].includes(entry.id)) {
            next.push({ id: entry.id as BuiltinTabId, visible: entry.visible })
          }
        }
        // 既存メトリクスを metric:id として末尾に追加
        for (const m of metrics) {
          next.push({ id: `metric:${m.id}`, visible: true })
        }
        if (next.length > 0) {
          setTabConfig(next)
          setOnboarded(true)
          migrated = true
        }
      }
    } catch {
      // noop
    }

    // 旧データが無いがメトリクスだけある場合(念のため)
    if (!migrated && metrics.length > 0) {
      const next: TabConfig[] = [
        { id: 'money', visible: true },
        { id: 'workout', visible: true },
        { id: 'food', visible: true },
        { id: 'sleep', visible: true },
        { id: 'body', visible: true },
        ...metrics.map(m => ({ id: `metric:${m.id}` as const, visible: true })),
      ]
      setTabConfig(next)
      setOnboarded(true)
    }
  }, [onboarded, tabConfig.length, metrics, setTabConfig, setOnboarded])

  // 非表示タブ / 存在しないメトリクスタブをアクティブにした状態なら home に戻す
  useEffect(() => {
    if (activeTab === 'home') return
    const conf = tabConfig.find(c => c.id === activeTab)
    if (!conf || !conf.visible) {
      setActiveTab('home')
      return
    }
    // メトリクスタブの場合、該当メトリクスが存在しなければ戻す
    if (isMetricTabId(activeTab)) {
      const metricId = getMetricIdFromTabId(activeTab)
      if (!metrics.find(m => m.id === metricId)) {
        setActiveTab('home')
      }
    }
  }, [tabConfig, activeTab, metrics])

  // Reset scroll on tab change
  useEffect(() => {
    scrollRef.current?.scrollTo(0, 0)
  }, [activeTab])

  // Daily reminder scheduler
  useEffect(() => {
    const today = new Date().toISOString().split('T')[0]
    const hasRecordToday = () => {
      // 今日のどれかのデータがあるか
      return (
        transactions.some(t => t.date === today) ||
        foods.some(f => f.date === today) ||
        workoutSessions.some(s => s.date === today) ||
        sleeps.some(s => s.date === today) ||
        bodies.some(b => b.date === today) ||
        metricEntries.some(e => e.date === today)
      )
    }
    startDailyReminderCheck(reminderConfig, hasRecordToday, {
      title: t.notifications.reminderTitle,
      body: t.notifications.reminderBody,
    })
    return () => stopDailyReminderCheck()
  }, [reminderConfig, t, transactions, foods, workoutSessions, sleeps, bodies, metricEntries])

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

  const handleUpdateTransaction = useCallback(
    (id: string, data: Omit<Transaction, 'id' | 'createdAt'>) => {
      setTransactions(prev =>
        prev.map(t => (t.id === id ? { ...t, ...data } : t))
      )
      showToast('取引を更新しました', 'bg-money')
    },
    [setTransactions, showToast]
  )

  // Money category handlers
  const handleAddCategory = useCallback(
    (data: Omit<MoneyCategory, 'id' | 'order'>) => {
      const newCat: MoneyCategory = {
        ...data,
        id: crypto.randomUUID(),
        order: moneyCategories.filter(c => c.type === data.type).length,
      }
      setMoneyCategories(prev => [...prev, newCat])
      showToast(`${data.name}を追加しました`, 'bg-money')
    },
    [moneyCategories, setMoneyCategories, showToast]
  )

  const handleDeleteCategory = useCallback(
    (id: string) => {
      setMoneyCategories(prev => prev.filter(c => c.id !== id))
      // カテゴリ削除時、そのカテゴリの予算も削除
      setBudgets(prev => prev.filter(b => b.categoryId !== id))
      showToast('カテゴリを削除しました', 'bg-destructive')
    },
    [setMoneyCategories, setBudgets, showToast]
  )

  const handleMoveCategory = useCallback(
    (id: string, direction: -1 | 1) => {
      setMoneyCategories(prev => {
        const target = prev.find(c => c.id === id)
        if (!target) return prev
        const sameType = prev
          .filter(c => c.type === target.type)
          .sort((a, b) => a.order - b.order)
        const index = sameType.findIndex(c => c.id === id)
        const newIndex = index + direction
        if (newIndex < 0 || newIndex >= sameType.length) return prev
        // 入れ替え
        const newOrderMap = new Map<string, number>()
        sameType.forEach((c, i) => newOrderMap.set(c.id, i))
        const movedId = sameType[newIndex].id
        newOrderMap.set(id, newIndex)
        newOrderMap.set(movedId, index)
        return prev.map(c => {
          const newOrder = newOrderMap.get(c.id)
          return newOrder !== undefined ? { ...c, order: newOrder } : c
        })
      })
    },
    [setMoneyCategories]
  )

  // Budget handlers
  const handleSaveBudget = useCallback(
    (categoryId: string, month: string, amount: number) => {
      setBudgets(prev => {
        const existing = prev.find(b => b.categoryId === categoryId && b.month === month)
        if (existing) {
          return prev.map(b =>
            b.id === existing.id ? { ...b, amount } : b
          )
        }
        return [
          ...prev,
          { id: crypto.randomUUID(), categoryId, month, amount },
        ]
      })
    },
    [setBudgets]
  )

  const handleDeleteBudget = useCallback(
    (categoryId: string, month: string) => {
      setBudgets(prev =>
        prev.filter(b => !(b.categoryId === categoryId && b.month === month))
      )
    },
    [setBudgets]
  )

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

  // WorkoutSession handlers (Strong/Hevy 型の新モデル)
  const handleStartWorkoutSession = useCallback((): WorkoutSession => {
    const now = Date.now()
    const session: WorkoutSession = {
      id: crypto.randomUUID(),
      date: new Date().toISOString().split('T')[0],
      startedAt: now,
      exercises: [],
    }
    setWorkoutSessions(prev => [...prev, session])
    return session
  }, [setWorkoutSessions])

  const handleUpdateWorkoutSession = useCallback((next: WorkoutSession) => {
    setWorkoutSessions(prev => prev.map(s => (s.id === next.id ? next : s)))
  }, [setWorkoutSessions])

  const handleFinishWorkoutSession = useCallback((next: WorkoutSession) => {
    setWorkoutSessions(prev => prev.map(s => (s.id === next.id ? next : s)))
    showToast('ワークアウト完了!', 'bg-workout')
  }, [setWorkoutSessions, showToast])

  const handleCancelWorkoutSession = useCallback((id: string) => {
    setWorkoutSessions(prev => prev.filter(s => s.id !== id))
    showToast('ワークアウトを破棄しました', 'bg-destructive')
  }, [setWorkoutSessions, showToast])

  const handleDeleteWorkoutSession = useCallback((id: string) => {
    setWorkoutSessions(prev => prev.filter(s => s.id !== id))
    showToast('セッションを削除しました', 'bg-destructive')
  }, [setWorkoutSessions, showToast])

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

  const handleSaveFoodGoal = useCallback((goal: FoodGoal) => {
    setFoodGoal(goal)
    showToast('栄養目標を更新しました', 'bg-food')
  }, [setFoodGoal, showToast])

  const handleAddCustomFood = useCallback(
    (data: Omit<CustomFoodItem, 'id' | 'createdAt'>): CustomFoodItem => {
      const newFood: CustomFoodItem = {
        ...data,
        id: crypto.randomUUID(),
        createdAt: Date.now(),
      }
      setCustomFoods(prev => [...prev, newFood])
      return newFood
    },
    [setCustomFoods]
  )

  // レシピ保存 (新規 or 編集)
  const handleSaveRecipe = useCallback(
    (data: Omit<Recipe, 'id' | 'createdAt'>, editingId?: string) => {
      if (editingId) {
        setRecipes(prev =>
          prev.map(r =>
            r.id === editingId
              ? { ...r, ...data, id: editingId, createdAt: r.createdAt }
              : r
          )
        )
        showToast('レシピを更新しました', 'bg-food')
      } else {
        const newRecipe: Recipe = {
          ...data,
          id: crypto.randomUUID(),
          createdAt: Date.now(),
        }
        setRecipes(prev => [...prev, newRecipe])
        showToast('レシピを作成しました', 'bg-food')
      }
    },
    [setRecipes, showToast]
  )

  const handleDeleteRecipe = useCallback(
    (id: string) => {
      setRecipes(prev => prev.filter(r => r.id !== id))
      showToast('レシピを削除しました', 'bg-destructive')
    },
    [setRecipes, showToast]
  )

  // レシピを食事記録として展開 (各itemがそれぞれFoodEntryになる、recipeIdでタグ付け)
  const handleApplyRecipe = useCallback(
    (
      recipe: Recipe,
      mealTiming: '朝食' | '昼食' | '夕食' | '間食',
      date: string
    ) => {
      // 全食品 (builtin + custom) でアイテムを解決して栄養を計算
      const byId = new Map<string, { calories: number; protein: number; fat: number; carbs: number; category?: string }>()
      for (const f of foodDatabase) {
        byId.set(f.id, { calories: f.calories, protein: f.protein, fat: f.fat, carbs: f.carbs, category: f.category })
      }
      for (const c of customFoods) {
        byId.set(`custom:${c.id}`, { calories: c.calories, protein: c.protein, fat: c.fat, carbs: c.carbs })
      }
      const now = Date.now()
      const newEntries: FoodEntry[] = []
      for (const item of recipe.items) {
        const food = byId.get(item.foodItemId)
        if (!food) continue
        const multiplier = item.amount / 100
        newEntries.push({
          id: crypto.randomUUID(),
          foodName: item.foodName,
          foodItemId: item.foodItemId,
          amount: item.amount,
          calories: food.calories * multiplier,
          protein: food.protein * multiplier,
          fat: food.fat * multiplier,
          carbs: food.carbs * multiplier,
          mealTiming,
          date,
          recipeId: recipe.id,
          createdAt: now,
        })
      }
      if (newEntries.length > 0) {
        setFoods(prev => [...prev, ...newEntries])
        showToast(`${recipe.name} を追加しました`, 'bg-food')
      }
    },
    [customFoods, setFoods, showToast]
  )

  // Sleep handlers
  const handleAddSleep = useCallback((data: Omit<SleepEntry, 'id' | 'createdAt'>) => {
    const newSleep: SleepEntry = {
      ...data,
      source: data.source || 'manual',
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    setSleeps(prev => [...prev, newSleep])
    showToast('睡眠を記録しました', 'bg-sleep')
  }, [setSleeps, showToast])

  // 既存の睡眠エントリに source を後付け (migration)
  useEffect(() => {
    const needs = sleeps.some(s => s.source === undefined)
    if (needs) {
      setSleeps(sleeps.map(s => (s.source ? s : { ...s, source: 'manual' as const })))
    }
  }, [sleeps, setSleeps])

  const handleDeleteSleep = useCallback((id: string) => {
    setSleeps(prev => prev.filter(s => s.id !== id))
    showToast('睡眠を削除しました', 'bg-destructive')
  }, [setSleeps, showToast])

  // ネイティブヘルスから睡眠を取り込み、Fitbit風スコアを算出して登録
  const handleSyncSleepFromHealth = useCallback(async (): Promise<number> => {
    const sessions = await fetchSleepSessions(7)
    if (sessions.length === 0) return 0

    const now = Date.now()
    const newEntries: SleepEntry[] = sessions.map(session => {
      const breakdown = computeSleepScore(session.durationMinutes, session.stages)
      return {
        id: crypto.randomUUID(),
        date: session.date,
        bedtime: session.bedtime,
        wakeTime: session.wakeTime,
        duration: session.durationMinutes,
        quality: Math.max(1, Math.round((breakdown.total / 100) * 5)) as 1 | 2 | 3 | 4 | 5,
        autoScore: breakdown.total,
        stages: session.stages,
        memo: 'ヘルスケアから同期',
        source: 'health',
        createdAt: now,
      }
    })

    // 同じ日付の health 由来エントリは置換、手動入力は残す
    setSleeps(prev => {
      const syncedDates = new Set(newEntries.map(e => e.date))
      const filtered = prev.filter(
        s => !(s.source === 'health' && syncedDates.has(s.date))
      )
      return [...filtered, ...newEntries]
    })

    showToast(`${sessions.length}晩分を同期しました`, 'bg-sleep')
    return sessions.length
  }, [setSleeps, showToast])

  // Body handlers
  const handleAddBody = useCallback((data: Omit<BodyEntry, 'id' | 'createdAt'>) => {
    const newBody: BodyEntry = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    setBodies(prev => [...prev, newBody])
    showToast('体組成を記録しました', 'bg-body')
  }, [setBodies, showToast])

  const handleDeleteBody = useCallback((id: string) => {
    setBodies(prev => prev.filter(b => b.id !== id))
    showToast('体組成を削除しました', 'bg-destructive')
  }, [setBodies, showToast])

  // ネイティブヘルスから体重・体脂肪を取り込む。同日の2データを1エントリにまとめる
  const handleSyncBodyFromHealth = useCallback(async (): Promise<number> => {
    const [weights, fats] = await Promise.all([
      fetchDailyValues('weight', 30, 'latest'),
      fetchDailyValues('bodyFat', 30, 'latest'),
    ])
    if (weights.length === 0 && fats.length === 0) return 0

    // 日付ごとにマージ
    const byDate = new Map<string, { weight?: number; bodyFat?: number }>()
    for (const w of weights) {
      byDate.set(w.date, { ...(byDate.get(w.date) || {}), weight: w.value })
    }
    for (const f of fats) {
      // bodyFat は割合なので、プラグインによっては 0-1 または 0-100 で返る。
      // 0-1 で返った場合は *100 に直す (値が 1 未満なら割合と判断)
      const value = f.value <= 1 ? f.value * 100 : f.value
      byDate.set(f.date, { ...(byDate.get(f.date) || {}), bodyFat: value })
    }

    const now = Date.now()
    const newEntries: BodyEntry[] = Array.from(byDate.entries())
      .filter(([, data]) => data.weight !== undefined) // 体重必須
      .map(([date, data]) => ({
        id: crypto.randomUUID(),
        date,
        weight: data.weight as number,
        bodyFat: data.bodyFat,
        memo: 'ヘルスケアから同期',
        source: 'health' as const,
        createdAt: now,
      }))

    if (newEntries.length === 0) return 0

    // 同日の health 由来エントリは置換、手動入力は残す
    setBodies(prev => {
      const syncedDates = new Set(newEntries.map(e => e.date))
      const filtered = prev.filter(
        b => !(b.source === 'health' && syncedDates.has(b.date))
      )
      return [...filtered, ...newEntries]
    })
    showToast(`${newEntries.length}件を同期しました`, 'bg-body')
    return newEntries.length
  }, [setBodies, showToast])

  // Metric handlers
  const handleAddMetricEntry = useCallback((data: Omit<MetricEntry, 'id' | 'createdAt'>) => {
    const newEntry: MetricEntry = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    setMetricEntries(prev => [...prev, newEntry])
    showToast('記録しました', 'bg-foreground')
  }, [setMetricEntries, showToast])

  const handleDeleteMetricEntry = useCallback((id: string) => {
    setMetricEntries(prev => prev.filter(e => e.id !== id))
  }, [setMetricEntries])

  // ネイティブヘルスから同期: 直近7日分の日次値を取得してエントリを upsert
  const handleSyncMetricFromHealth = useCallback(
    async (metric: MetricDefinition): Promise<number | null> => {
      if (!metric.healthSource) return null
      // メトリクスの集計方式を尊重 (sum/latest/average)
      const sums = await fetchDailyValues(metric.healthSource, 7, metric.aggregation)
      if (sums.length === 0) return 0
      const now = Date.now()
      const multiplier = metric.healthValueMultiplier ?? 1
      const newEntries: MetricEntry[] = sums.map(s => ({
        id: crypto.randomUUID(),
        metricId: metric.id,
        value: s.value * multiplier,
        date: s.date,
        memo: 'ヘルスケアから同期',
        createdAt: now,
      }))
      // 同じ日のヘルス由来エントリは置換(手動入力は残す)
      setMetricEntries(prev => {
        const syncedDates = new Set(sums.map(s => s.date))
        const filtered = prev.filter(
          e =>
            !(
              e.metricId === metric.id &&
              syncedDates.has(e.date) &&
              e.memo === 'ヘルスケアから同期'
            )
        )
        return [...filtered, ...newEntries]
      })
      showToast(`${sums.length}日分を同期しました`, 'bg-foreground')
      return sums.length
    },
    [setMetricEntries, showToast]
  )

  // 組み込みタブを追加
  const handleAddBuiltin = useCallback((id: BuiltinTabId) => {
    setTabConfig(prev => {
      if (prev.find(c => c.id === id)) return prev
      return [...prev, { id, visible: true }]
    })
  }, [setTabConfig])

  // プリセットから新しいメトリクスを作成してタブも追加
  const handleAddMetricFromPreset = useCallback((preset: MetricPreset) => {
    const newMetric: MetricDefinition = {
      id: crypto.randomUUID(),
      name: preset.name,
      unit: preset.unit,
      icon: preset.icon,
      color: preset.color,
      aggregation: preset.aggregation,
      target: preset.target,
      minValue: preset.minValue,
      maxValue: preset.maxValue,
      step: preset.step,
      healthSource: preset.healthSource,
      healthValueMultiplier: preset.healthValueMultiplier,
      createdAt: Date.now(),
    }
    setMetrics(prev => [...prev, newMetric])
    setTabConfig(prev => [...prev, { id: `metric:${newMetric.id}`, visible: true }])
    showToast(`${preset.name}を追加しました`, 'bg-foreground')
  }, [setMetrics, setTabConfig, showToast])

  // メトリクス自体を削除 (タブ設定からも外す、エントリも削除)
  const handleRemoveMetric = useCallback((metricId: string) => {
    setMetrics(prev => prev.filter(m => m.id !== metricId))
    setMetricEntries(prev => prev.filter(e => e.metricId !== metricId))
    setTabConfig(prev => prev.filter(c => c.id !== `metric:${metricId}`))
    showToast('項目を削除しました', 'bg-destructive')
  }, [setMetrics, setMetricEntries, setTabConfig, showToast])

  // Search handlers
  const handleSelectFoodDB = useCallback((foodName: string) => {
    setPrefilledFood(foodName)
  }, [])

  const handleClearPrefill = useCallback(() => {
    setPrefilledFood(undefined)
  }, [])

  // Add button handler
  const handleAddClick = useCallback(() => {
    if (activeTab === 'home') {
      // 最初の表示中タブに飛ぶ、無ければ設定を開く
      const firstVisible = tabConfig.find(c => c.visible)
      if (firstVisible) {
        setActiveTab(firstVisible.id as TabType)
      } else {
        setIsSettingsOpen(true)
      }
    }
    scrollRef.current?.scrollTo(0, 0)
  }, [activeTab, tabConfig])

  // オンボーディング完了時: メトリクスとタブ設定を一括で保存
  const handleOnboardingComplete = useCallback(
    (builtinConfig: TabConfig[], newMetricsData: Omit<MetricDefinition, 'id' | 'createdAt'>[]) => {
      const now = Date.now()
      const createdMetrics: MetricDefinition[] = newMetricsData.map(m => ({
        ...m,
        id: crypto.randomUUID(),
        createdAt: now,
      }))
      const metricTabs: TabConfig[] = createdMetrics.map(m => ({
        id: `metric:${m.id}`,
        visible: true,
      }))
      setMetrics(prev => [...prev, ...createdMetrics])
      setTabConfig([...builtinConfig, ...metricTabs])
      setOnboarded(true)
    },
    [setMetrics, setTabConfig, setOnboarded]
  )

  // アクティブタブがメトリクスの場合、該当メトリクスを解決
  const activeMetric = useMemo(() => {
    if (!isMetricTabId(activeTab)) return null
    const metricId = getMetricIdFromTabId(activeTab)
    return metrics.find(m => m.id === metricId) || null
  }, [activeTab, metrics])

  const activeMetricEntries = useMemo(() => {
    if (!activeMetric) return []
    return metricEntries.filter(e => e.metricId === activeMetric.id)
  }, [activeMetric, metricEntries])

  const i18nValue = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  )

  // オンボーディング画面
  if (!onboarded) {
    return (
      <I18nContext.Provider value={i18nValue}>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </I18nContext.Provider>
    )
  }

  return (
    <I18nContext.Provider value={i18nValue}>
      <div className="flex min-h-screen max-w-[480px] mx-auto flex-col bg-background">
      <TopBar
        onSearchClick={() => setIsSearchOpen(true)}
        onAddClick={handleAddClick}
        onSettingsClick={() => setIsSettingsOpen(true)}
        onReminderClick={() => setIsReminderOpen(true)}
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
            metrics={metrics}
            metricEntries={metricEntries}
            onNavigateToMetric={(metricId) => setActiveTab(`metric:${metricId}`)}
          />
        )}

        {activeTab === 'money' && (
          <MoneyTab
            transactions={transactions}
            categories={moneyCategories}
            budgets={budgets}
            onAddTransaction={handleAddTransaction}
            onUpdateTransaction={handleUpdateTransaction}
            onDeleteTransaction={handleDeleteTransaction}
            onAddCategory={handleAddCategory}
            onDeleteCategory={handleDeleteCategory}
            onMoveCategory={handleMoveCategory}
            onSaveBudget={handleSaveBudget}
            onDeleteBudget={handleDeleteBudget}
          />
        )}

        {activeTab === 'workout' && (
          <WorkoutTab
            sessions={workoutSessions}
            legacyEntries={workouts}
            onStartSession={handleStartWorkoutSession}
            onUpdateSession={handleUpdateWorkoutSession}
            onFinishSession={handleFinishWorkoutSession}
            onCancelSession={handleCancelWorkoutSession}
            onDeleteSession={handleDeleteWorkoutSession}
            onDeleteLegacy={handleDeleteWorkout}
          />
        )}

        {activeTab === 'food' && (
          <FoodTab
            foods={foods}
            goal={foodGoal}
            customFoods={customFoods}
            recipes={recipes}
            onAddFood={handleAddFood}
            onDeleteFood={handleDeleteFood}
            onSaveGoal={handleSaveFoodGoal}
            onAddCustomFood={handleAddCustomFood}
            onApplyRecipe={handleApplyRecipe}
            onSaveRecipe={handleSaveRecipe}
            onDeleteRecipe={handleDeleteRecipe}
            prefilledFood={prefilledFood}
            onClearPrefill={handleClearPrefill}
          />
        )}

        {activeTab === 'sleep' && (
          <SleepTab
            sleeps={sleeps}
            onAddSleep={handleAddSleep}
            onDeleteSleep={handleDeleteSleep}
            onSyncFromHealth={handleSyncSleepFromHealth}
          />
        )}

        {activeTab === 'body' && (
          <BodyTab
            bodies={bodies}
            onAddBody={handleAddBody}
            onDeleteBody={handleDeleteBody}
            onSyncFromHealth={handleSyncBodyFromHealth}
          />
        )}

        {activeMetric && (
          <MetricDetailTab
            key={activeMetric.id}
            metric={activeMetric}
            entries={activeMetricEntries}
            onAddEntry={handleAddMetricEntry}
            onDeleteEntry={handleDeleteMetricEntry}
            onSyncFromHealth={handleSyncMetricFromHealth}
          />
        )}
      </main>

      <BottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        tabConfig={tabConfig}
        metrics={metrics}
      />

      <TabSettingsDialog
        open={isSettingsOpen}
        onOpenChange={setIsSettingsOpen}
        tabConfig={tabConfig}
        metrics={metrics}
        onChangeConfig={setTabConfig}
        onAddBuiltin={handleAddBuiltin}
        onAddMetricFromPreset={handleAddMetricFromPreset}
        onRemoveMetric={handleRemoveMetric}
        onOpenDataManagement={() => setIsDataMgmtOpen(true)}
      />

      <DataManagementDialog
        open={isDataMgmtOpen}
        onOpenChange={setIsDataMgmtOpen}
        onAfterImport={() => {
          // インポート成功後はフルリロードして全stateを確実に再読み込み
          if (typeof window !== 'undefined') {
            window.location.reload()
          }
        }}
      />

      <SearchOverlay
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        transactions={transactions}
        workouts={workouts}
        foods={foods}
        onSelectFoodDB={handleSelectFoodDB}
        onNavigateToTab={setActiveTab}
      />

      <ReminderSettingsDialog
        open={isReminderOpen}
        onOpenChange={setIsReminderOpen}
        config={reminderConfig}
        onSave={setReminderConfig}
      />

      <ToastNotification
        message={toast.message}
        isVisible={toast.visible}
        onClose={hideToast}
        color={toast.color}
      />
      </div>
    </I18nContext.Provider>
  )
}
