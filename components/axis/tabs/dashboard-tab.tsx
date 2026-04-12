'use client'

import { useState, useMemo } from 'react'
import * as Icons from 'lucide-react'
import {
  Wallet,
  Dumbbell,
  Utensils,
  Moon,
  Scale,
  TrendingUp,
  TrendingDown,
  Flame,
  Settings2,
  Star,
  Minus,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type {
  Transaction,
  WorkoutEntry,
  WorkoutSession,
  FoodEntry,
  FoodGoal,
  SleepEntry,
  BodyEntry,
  MetricDefinition,
  MetricEntry,
} from '@/lib/types'
import type { WidgetConfig, WidgetId } from '@/lib/widgets'
import { sessionVolume, sessionSetCount, weeklyVolume } from '@/lib/workout-stats'
import { scoreLabel } from '@/lib/sleep-score'
import { WidgetEditDialog } from '@/components/axis/widget-edit-dialog'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface DashboardTabProps {
  transactions: Transaction[]
  workouts: WorkoutEntry[]
  workoutSessions: WorkoutSession[]
  foods: FoodEntry[]
  foodGoal: FoodGoal
  sleeps: SleepEntry[]
  bodies: BodyEntry[]
  metrics: MetricDefinition[]
  metricEntries: MetricEntry[]
  widgetConfig: WidgetConfig[]
  onWidgetConfigChange: (config: WidgetConfig[]) => void
  onNavigateToTab: (tab: string) => void
  onNavigateToMetric?: (metricId: string) => void
}

function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]
  return IconComp || Icons.Circle
}

function computeTodayMetricValue(metric: MetricDefinition, entries: MetricEntry[]): number {
  const today = new Date().toISOString().split('T')[0]
  const todayEntries = entries.filter(e => e.metricId === metric.id && e.date === today)
  if (todayEntries.length === 0) return 0
  switch (metric.aggregation) {
    case 'sum': return todayEntries.reduce((sum, e) => sum + e.value, 0)
    case 'average': return todayEntries.reduce((sum, e) => sum + e.value, 0) / todayEntries.length
    case 'latest': return todayEntries.sort((a, b) => b.createdAt - a.createdAt)[0].value
  }
}

function formatVal(value: number, step: number = 1): string {
  if (step >= 1) return Math.round(value).toString()
  if (step >= 0.1) return value.toFixed(1)
  return value.toFixed(2)
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}h ${m.toString().padStart(2, '0')}m`
}

export function DashboardTab(props: DashboardTabProps) {
  const {
    transactions, workouts, workoutSessions, foods, foodGoal,
    sleeps, bodies, metrics, metricEntries,
    widgetConfig, onWidgetConfigChange,
    onNavigateToTab, onNavigateToMetric,
  } = props

  const { locale, t } = useI18n()
  const [editOpen, setEditOpen] = useState(false)

  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().toISOString().slice(0, 7)

  // Pre-compute data for all widgets
  const data = useMemo(() => {
    // Money
    const monthTx = transactions.filter(t => t.date.startsWith(thisMonth))
    const income = monthTx.filter(t => t.type === '収入').reduce((s, t) => s + t.amount, 0)
    const expense = monthTx.filter(t => t.type === '支出').reduce((s, t) => s + t.amount, 0)

    // Food
    const todayFoods = foods.filter(f => f.date === today)
    const nutrition = {
      calories: todayFoods.reduce((s, f) => s + f.calories, 0),
      protein: todayFoods.reduce((s, f) => s + f.protein, 0),
      fat: todayFoods.reduce((s, f) => s + f.fat, 0),
      carbs: todayFoods.reduce((s, f) => s + f.carbs, 0),
    }

    // Workout (new sessions)
    const wkVolume = weeklyVolume(workoutSessions)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const weeklySessions = workoutSessions.filter(
      s => s.endedAt && new Date(s.date) >= sevenDaysAgo
    )

    // Sleep - last night
    const sortedSleeps = [...sleeps].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    const lastSleep = sortedSleeps[0] || null

    // Body - latest
    const sortedBodies = [...bodies].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)
    const latestBody = sortedBodies[0] || null
    const prevBody = sortedBodies.find(b => {
      const d = new Date()
      d.setDate(d.getDate() - 7)
      return new Date(b.date) <= d
    })

    // Streak — 最大60日遡って連続記録日数を数える
    let streak = 0
    const checkDate = new Date()
    let skippedToday = false
    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      const hasRecord =
        transactions.some(t => t.date === dateStr) ||
        foods.some(f => f.date === dateStr) ||
        workoutSessions.some(s => s.date === dateStr) ||
        sleeps.some(s => s.date === dateStr) ||
        bodies.some(b => b.date === dateStr) ||
        metricEntries.some(e => e.date === dateStr)
      if (hasRecord) {
        streak++
      } else if (streak === 0 && !skippedToday) {
        // 今日まだ記録がなければ昨日から数える（1回だけスキップ）
        skippedToday = true
      } else {
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }

    const recentTx = [...transactions].sort((a, b) => b.createdAt - a.createdAt).slice(0, 4)

    return {
      income, expense, balance: income - expense,
      nutrition,
      wkVolume, weeklySessions,
      lastSleep,
      latestBody, prevBody,
      streak,
      recentTx,
    }
  }, [transactions, foods, workoutSessions, sleeps, bodies, metricEntries, today, thisMonth])

  // Render a widget by ID
  const renderWidget = (id: WidgetId) => {
    switch (id) {
      case 'money-summary':
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-money/10">
                <Wallet className="h-6 w-6 text-money" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t.home.monthlyBalance}</p>
                <p className={cn('text-2xl font-bold', data.balance >= 0 ? 'text-money' : 'text-destructive')}>
                  {data.balance >= 0 ? '+' : ''}{data.balance.toLocaleString()}{t.common.yen}
                </p>
              </div>
            </CardContent>
          </Card>
        )

      case 'food-calories':
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-food/10">
                <Utensils className="h-6 w-6 text-food" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t.home.todayCalories}</p>
                <p className="text-2xl font-bold text-food">
                  {Math.round(data.nutrition.calories)}
                  <span className="text-sm text-muted-foreground ml-1">
                    / {foodGoal.calories} {t.common.kcal}
                  </span>
                </p>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-secondary">
                  <div
                    className="h-full rounded-full bg-food transition-all"
                    style={{ width: `${Math.min(100, (data.nutrition.calories / Math.max(1, foodGoal.calories)) * 100)}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 'food-pfc':
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.home.todayPFC}</h3>
              <div className="space-y-2">
                {[
                  { label: t.home.protein, value: data.nutrition.protein, target: foodGoal.protein, color: '#60a5fa' },
                  { label: t.home.fat, value: data.nutrition.fat, target: foodGoal.fat, color: '#facc15' },
                  { label: t.home.carbs, value: data.nutrition.carbs, target: foodGoal.carbs, color: '#a78bfa' },
                ].map(({ label, value, target, color }) => (
                  <div key={label} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-muted-foreground">{label}</span>
                      <span className="text-foreground">{Math.round(value)}g / {target}g</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (value / Math.max(1, target)) * 100)}%`, backgroundColor: color }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )

      case 'workout-summary':
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-workout/10">
                <Dumbbell className="h-6 w-6 text-workout" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">{t.home.weeklyWorkouts}</p>
                <p className="text-2xl font-bold text-workout">
                  {data.weeklySessions.length}
                  <span className="text-sm text-muted-foreground ml-1">{t.home.times}</span>
                </p>
                {data.wkVolume > 0 && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t.workout.volume}: {data.wkVolume.toLocaleString()} kg
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )

      case 'sleep-summary':
        if (!data.lastSleep) return null
        const sInfo = data.lastSleep.autoScore !== undefined ? scoreLabel(data.lastSleep.autoScore) : null
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sleep/10">
                <Moon className="h-6 w-6 text-sleep" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'Last Night' : '昨夜の睡眠'}
                </p>
                <p className="text-2xl font-bold text-sleep">
                  {formatDuration(data.lastSleep.duration)}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-xs text-muted-foreground">
                    {data.lastSleep.bedtime} → {data.lastSleep.wakeTime}
                  </span>
                  {sInfo && (
                    <span className="text-xs font-semibold" style={{ color: sInfo.color }}>
                      {data.lastSleep.autoScore} {sInfo.label}
                    </span>
                  )}
                  {!sInfo && (
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(5, data.lastSleep.quality) }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-sleep text-sleep" />
                      ))}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 'body-latest':
        if (!data.latestBody) return null
        const diff = data.prevBody ? data.latestBody.weight - data.prevBody.weight : null
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-body/10">
                <Scale className="h-6 w-6 text-body" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'Body Composition' : '体組成'}
                </p>
                <p className="text-2xl font-bold text-body">
                  {data.latestBody.weight.toFixed(1)}
                  <span className="text-sm text-muted-foreground ml-1">{t.common.kg}</span>
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  {diff !== null && (
                    <span className={cn('flex items-center gap-0.5 text-xs',
                      diff < 0 ? 'text-money' : diff > 0 ? 'text-workout' : 'text-muted-foreground'
                    )}>
                      {diff < 0 ? <TrendingDown className="h-3 w-3" /> : diff > 0 ? <TrendingUp className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
                      {diff > 0 ? '+' : ''}{diff.toFixed(1)}kg / 7d
                    </span>
                  )}
                  {data.latestBody.bodyFat !== undefined && (
                    <span className="text-xs text-muted-foreground">
                      BF {data.latestBody.bodyFat.toFixed(1)}%
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 'metrics-today':
        if (metrics.length === 0) return null
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.home.todayMetrics}</h3>
              <div className="space-y-2">
                {metrics.map((metric) => {
                  const Icon = getIcon(metric.icon)
                  const value = computeTodayMetricValue(metric, metricEntries)
                  const progress = metric.target && metric.target > 0
                    ? Math.min(100, (value / metric.target) * 100) : null
                  return (
                    <button
                      key={metric.id}
                      type="button"
                      onClick={() => onNavigateToMetric?.(metric.id)}
                      className="w-full space-y-1 text-left hover:bg-secondary/30 -mx-2 px-2 py-1 rounded transition-colors"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2 min-w-0">
                          <Icon className="h-3.5 w-3.5 shrink-0" style={{ color: metric.color }} />
                          <span className="text-muted-foreground truncate">{metric.name}</span>
                        </div>
                        <span className="text-foreground shrink-0 ml-2">
                          <span className="font-semibold" style={{ color: metric.color }}>
                            {formatVal(value, metric.step)}
                          </span>
                          {metric.target ? ` / ${metric.target}` : ''} {metric.unit}
                        </span>
                      </div>
                      {progress !== null && (
                        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${progress}%`, backgroundColor: metric.color }}
                          />
                        </div>
                      )}
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )

      case 'streak':
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-workout/10">
                <Flame className="h-6 w-6 text-workout" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'Recording Streak' : '連続記録'}
                </p>
                <p className="text-2xl font-bold text-foreground">
                  {data.streak}
                  <span className="text-sm text-muted-foreground ml-1">{t.common.days}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        )

      case 'recent-transactions':
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.home.recentTransactions}</h3>
              {data.recentTx.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">{t.home.noTransactions}</p>
              ) : (
                <div className="space-y-1">
                  {data.recentTx.map((tx) => (
                    <div key={tx.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div className="flex items-center gap-2">
                        {tx.type === '収入' ? <TrendingUp className="h-3.5 w-3.5 text-money" /> : <TrendingDown className="h-3.5 w-3.5 text-destructive" />}
                        <div>
                          <p className="text-xs font-medium text-foreground">{tx.category}</p>
                          <p className="text-[10px] text-muted-foreground">{tx.date}</p>
                        </div>
                      </div>
                      <p className={cn('text-xs font-semibold', tx.type === '収入' ? 'text-money' : 'text-destructive')}>
                        {tx.type === '収入' ? '+' : '-'}{tx.amount.toLocaleString()}{t.common.yen}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )

      case 'recent-workouts':
        const recentSessions = [...workoutSessions]
          .filter(s => s.endedAt)
          .sort((a, b) => b.startedAt - a.startedAt)
          .slice(0, 3)
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.home.recentWorkouts}</h3>
              {recentSessions.length === 0 ? (
                <p className="py-2 text-center text-xs text-muted-foreground">{t.home.noWorkouts}</p>
              ) : (
                <div className="space-y-1">
                  {recentSessions.map((s) => (
                    <div key={s.id} className="flex items-center justify-between py-1.5 border-b border-border last:border-0">
                      <div>
                        <p className="text-xs font-medium text-foreground">{s.name || s.date}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {s.exercises.length} {locale === 'en' ? 'exercises' : '種目'} · {sessionSetCount(s)} {t.workout.sets}
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-workout">
                        {sessionVolume(s).toLocaleString()} kg
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-3">
      {/* 編集ボタン */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">
          {locale === 'en' ? 'Dashboard' : 'ダッシュボード'}
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 gap-1 text-xs text-muted-foreground"
          onClick={() => setEditOpen(true)}
        >
          <Settings2 className="h-3.5 w-3.5" />
          {locale === 'en' ? 'Edit' : '編集'}
        </Button>
      </div>

      {/* ウィジェット一覧 */}
      {widgetConfig
        .filter(w => w.visible)
        .map(w => renderWidget(w.id))}

      <WidgetEditDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        config={widgetConfig}
        onChange={onWidgetConfigChange}
      />
    </div>
  )
}
