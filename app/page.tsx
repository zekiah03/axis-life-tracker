'use client'

import { useState, useCallback, useRef, useEffect, useMemo } from 'react'
import { TopBar } from '@/components/axis/top-bar'
import { BottomNav } from '@/components/axis/bottom-nav'
import { SearchOverlay } from '@/components/axis/search-overlay'
import { ToastNotification } from '@/components/axis/toast-notification'
import { OnboardingScreen } from '@/components/axis/onboarding-screen'
import { DashboardTab } from '@/components/axis/tabs/dashboard-tab'
import { MoneyTab } from '@/components/axis/tabs/money-tab'
import { WorkoutTab } from '@/components/axis/tabs/workout-tab'
import { FoodTab } from '@/components/axis/tabs/food-tab'
import { SleepTab } from '@/components/axis/tabs/sleep-tab'
import { BodyTab } from '@/components/axis/tabs/body-tab'
import { MetricDetailTab } from '@/components/axis/tabs/metric-detail-tab'
import { TabSettingsDialog } from '@/components/axis/tab-settings-dialog'
import { useLocalStorage } from '@/hooks/use-local-storage'
import type {
  TabType,
  Transaction,
  WorkoutEntry,
  FoodEntry,
  SleepEntry,
  BodyEntry,
  MetricDefinition,
  MetricEntry,
  TabConfig,
  BuiltinTabId,
} from '@/lib/types'
import { isMetricTabId, getMetricIdFromTabId } from '@/lib/types'
import type { MetricPreset } from '@/lib/metric-presets'

export default function AxisApp() {
  const [activeTab, setActiveTab] = useState<TabType>('home')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)
  const [prefilledFood, setPrefilledFood] = useState<string | undefined>()
  const [toast, setToast] = useState({ message: '', visible: false, color: 'bg-foreground' })
  const scrollRef = useRef<HTMLDivElement>(null)

  // Data storage
  const [transactions, setTransactions] = useLocalStorage<Transaction[]>('axis-transactions', [])
  const [workouts, setWorkouts] = useLocalStorage<WorkoutEntry[]>('axis-workouts', [])
  const [foods, setFoods] = useLocalStorage<FoodEntry[]>('axis-foods', [])
  const [sleeps, setSleeps] = useLocalStorage<SleepEntry[]>('axis-sleeps', [])
  const [bodies, setBodies] = useLocalStorage<BodyEntry[]>('axis-bodies', [])
  const [metrics, setMetrics] = useLocalStorage<MetricDefinition[]>('axis-metrics', [])
  const [metricEntries, setMetricEntries] = useLocalStorage<MetricEntry[]>('axis-metric-entries', [])

  // v2 タブ設定 (組み込み + metric:id の統一形式)
  const [tabConfig, setTabConfig] = useLocalStorage<TabConfig[]>('axis-tab-config-v2', [])
  const [onboarded, setOnboarded] = useLocalStorage<boolean>('axis-onboarded', false)

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

  // Sleep handlers
  const handleAddSleep = useCallback((data: Omit<SleepEntry, 'id' | 'createdAt'>) => {
    const newSleep: SleepEntry = {
      ...data,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
    }
    setSleeps(prev => [...prev, newSleep])
    showToast('睡眠を記録しました', 'bg-sleep')
  }, [setSleeps, showToast])

  const handleDeleteSleep = useCallback((id: string) => {
    setSleeps(prev => prev.filter(s => s.id !== id))
    showToast('睡眠を削除しました', 'bg-destructive')
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

  // オンボーディング画面
  if (!onboarded) {
    return <OnboardingScreen onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="flex min-h-screen max-w-[480px] mx-auto flex-col bg-background">
      <TopBar
        onSearchClick={() => setIsSearchOpen(true)}
        onAddClick={handleAddClick}
        onSettingsClick={() => setIsSettingsOpen(true)}
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

        {activeTab === 'sleep' && (
          <SleepTab
            sleeps={sleeps}
            onAddSleep={handleAddSleep}
            onDeleteSleep={handleDeleteSleep}
          />
        )}

        {activeTab === 'body' && (
          <BodyTab
            bodies={bodies}
            onAddBody={handleAddBody}
            onDeleteBody={handleDeleteBody}
          />
        )}

        {activeMetric && (
          <MetricDetailTab
            key={activeMetric.id}
            metric={activeMetric}
            entries={activeMetricEntries}
            onAddEntry={handleAddMetricEntry}
            onDeleteEntry={handleDeleteMetricEntry}
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

      <ToastNotification
        message={toast.message}
        isVisible={toast.visible}
        onClose={hideToast}
        color={toast.color}
      />
    </div>
  )
}
