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
  HeartPulse,
  StretchHorizontal,
  Brain,
  Timer,
  Route,
  Smile,
  Zap,
  Wind,
  Target,
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
  ActivityEntry,
  MentalEntry,
  HabitEntry,
  MetricDefinition,
  MetricEntry,
} from '@/lib/types'
import type { TabConfig } from '@/lib/types'
import { isMetricTabId } from '@/lib/types'
import type { WidgetConfig, WidgetId } from '@/lib/widgets'
import { sessionVolume, sessionSetCount, weeklyVolume } from '@/lib/workout-stats'
import { scoreLabel } from '@/lib/sleep-score'
import {
  computeTrends,
  detectInsights,
  computeWeeklyScore,
  type TrendLine,
  type Insight,
  type WeeklyScore,
} from '@/lib/analytics'
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
  activities: ActivityEntry[]
  mentalEntries: MentalEntry[]
  habitEntries: HabitEntry[]
  metrics: MetricDefinition[]
  metricEntries: MetricEntry[]
  widgetConfig: WidgetConfig[]
  tabConfig: TabConfig[] // ユーザーが有効にしているタブ
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
    sleeps, bodies, activities, mentalEntries, habitEntries, metrics, metricEntries,
    widgetConfig, tabConfig, onWidgetConfigChange,
    onNavigateToTab, onNavigateToMetric,
  } = props

  const { locale, t } = useI18n()
  const [editOpen, setEditOpen] = useState(false)

  // ユーザーが有効にしているタブの組み込みIDセット
  const enabledTabs = useMemo(() => {
    const set = new Set<string>()
    for (const tc of tabConfig) {
      if (tc.visible) set.add(tc.id)
    }
    return set
  }, [tabConfig])

  // ウィジェットIDとタブIDのマッピング: そのウィジェットが関連するタブ
  const widgetRequiresTab: Partial<Record<WidgetId, string>> = {
    'money-summary': 'money',
    'food-calories': 'food',
    'food-pfc': 'food',
    'workout-summary': 'workout',
    'sleep-summary': 'sleep',
    'body-latest': 'body',
    'recent-transactions': 'money',
    'recent-workouts': 'workout',
    'cardio-summary': 'cardio',
    'stretch-summary': 'stretch',
    'mental-summary': 'mental',
  }
  // 'metrics-today' と 'streak' はタブに依存しない(横断的)

  const today = new Date().toISOString().split('T')[0]
  const thisMonth = new Date().toISOString().slice(0, 7)

  // 分析データ — 空配列チェックで不要な計算をスキップ
  const hasAnyData = transactions.length > 0 || workoutSessions.length > 0 ||
    foods.length > 0 || sleeps.length > 0 || bodies.length > 0 ||
    activities.length > 0 || mentalEntries.length > 0 || metricEntries.length > 0

  const analyticsInput = useMemo(() => ({
    transactions, workoutSessions, foods, foodGoal,
    sleeps, bodies, activities, mentalEntries, habitEntries,
    metrics, metricEntries,
  }), [transactions, workoutSessions, foods, foodGoal, sleeps, bodies, activities, mentalEntries, habitEntries, metrics, metricEntries])

  // Analytics — 遅延計算 (データが十分にある場合のみ)
  const trendLines: TrendLine[] = []
  const autoInsights: Insight[] = []
  const weekScore: WeeklyScore | null = null

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

    // Cardio weekly
    const weeklyCardio = activities.filter(
      a => a.type === 'cardio' && new Date(a.date) >= sevenDaysAgo
    )
    const cardioTotalMin = weeklyCardio.reduce((s, a) => s + a.duration, 0)
    const cardioTotalDist = weeklyCardio.reduce((s, a) => s + (a.distance || 0), 0)
    const cardioTotalCal = weeklyCardio.reduce((s, a) => s + (a.calories || 0), 0)

    // Stretch weekly
    const weeklyStretch = activities.filter(
      a => a.type === 'stretch' && new Date(a.date) >= sevenDaysAgo
    )
    const stretchTotalMin = weeklyStretch.reduce((s, a) => s + a.duration, 0)

    // Mental today
    const todayMental = mentalEntries.find(e => e.date === today)

    return {
      income, expense, balance: income - expense,
      nutrition,
      wkVolume, weeklySessions,
      lastSleep,
      latestBody, prevBody,
      weeklyCardio, cardioTotalMin, cardioTotalDist, cardioTotalCal,
      weeklyStretch, stretchTotalMin,
      todayMental,
      streak,
      recentTx,
    }
  }, [transactions, foods, workoutSessions, sleeps, bodies, metricEntries, today, thisMonth])

  // Render a widget by ID
  const renderWidget = (id: WidgetId) => {
    switch (id) {
      // --- 分析ウィジェット ---
      case 'weekly-score': {
        if (!weekScore) return null
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {locale === 'en' ? 'Weekly Score' : '今週のスコア'}
              </h3>
              <div className="flex items-center gap-4">
                {/* 円形スコア */}
                <div className="relative shrink-0" style={{ width: 80, height: 80 }}>
                  <svg width={80} height={80} className="-rotate-90">
                    <circle cx={40} cy={40} r={32} stroke="var(--color-secondary)" strokeWidth={8} fill="none" />
                    <circle
                      cx={40} cy={40} r={32}
                      stroke={weekScore.overall >= 70 ? '#22d3a0' : weekScore.overall >= 40 ? '#facc15' : '#ef4444'}
                      strokeWidth={8} fill="none"
                      strokeDasharray={2 * Math.PI * 32}
                      strokeDashoffset={2 * Math.PI * 32 * (1 - weekScore.overall / 100)}
                      strokeLinecap="round"
                      className="transition-all duration-500"
                    />
                  </svg>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-xl font-bold text-foreground">{weekScore.overall}</span>
                  </div>
                </div>
                {/* カテゴリ別 */}
                <div className="flex-1 space-y-1.5">
                  {weekScore.categories.map((cat) => (
                    <div key={cat.label} className="space-y-0.5">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-muted-foreground">{cat.label}</span>
                        <span className="font-semibold text-foreground">{cat.score}</span>
                      </div>
                      <div className="h-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${cat.score}%`, backgroundColor: cat.color }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )
      }

      case 'trends': {
        if (trendLines.length === 0) return null
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {locale === 'en' ? '2-Week Trends' : '2週間の変化'}
              </h3>
              <div className="space-y-3">
                {trendLines.map((line) => {
                  const maxVal = Math.max(...line.points.map(p => p.value), 1)
                  return (
                    <div key={line.label} className="space-y-1">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">{line.label}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="font-semibold text-foreground">
                            {line.current} {line.unit}
                          </span>
                          {line.direction !== 'stable' && (
                            <span className={cn(
                              'text-[10px] font-medium',
                              line.direction === 'up' ? 'text-money' : 'text-destructive'
                            )}>
                              {line.changePercent > 0 ? '+' : ''}{line.changePercent.toFixed(0)}%
                            </span>
                          )}
                        </div>
                      </div>
                      {/* ミニスパークライン (14日) */}
                      <div className="flex items-end gap-px h-6">
                        {line.points.map((p, i) => (
                          <div
                            key={i}
                            className="flex-1 rounded-sm min-h-[1px]"
                            style={{
                              height: `${Math.max(4, (p.value / maxVal) * 100)}%`,
                              backgroundColor: p.value > 0 ? line.color : 'var(--color-secondary)',
                              opacity: i < 7 ? 0.4 : 1,
                            }}
                          />
                        ))}
                      </div>
                      <div className="flex justify-between text-[8px] text-muted-foreground">
                        <span>{locale === 'en' ? '2w ago' : '2週間前'}</span>
                        <span>{locale === 'en' ? 'Today' : '今日'}</span>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      }

      case 'insights': {
        if (autoInsights.length === 0) return null
        const iconMap: Record<string, { icon: string; color: string }> = {
          positive: { icon: 'TrendingUp', color: '#22d3a0' },
          warning: { icon: 'AlertTriangle', color: '#facc15' },
          neutral: { icon: 'Minus', color: '#71717a' },
          achievement: { icon: 'Trophy', color: '#f97316' },
        }
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">
                {locale === 'en' ? 'Insights' : '気づき'}
              </h3>
              <div className="space-y-2">
                {autoInsights.slice(0, 5).map((insight, i) => {
                  const iconInfo = iconMap[insight.type]
                  const InsightIcon = getIcon(iconInfo.icon)
                  return (
                    <div key={i} className="flex items-start gap-2 rounded-md bg-secondary/40 p-2">
                      <InsightIcon className="h-4 w-4 shrink-0 mt-0.5" style={{ color: iconInfo.color }} />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground">{insight.title}</p>
                        <p className="text-[10px] text-muted-foreground">{insight.description}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        )
      }

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

      case 'metrics-today': {
        // タブに含まれているメトリクスだけ表示
        const enabledMetrics = metrics.filter(m => enabledTabs.has(`metric:${m.id}`))
        if (enabledMetrics.length === 0) return null
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="p-4">
              <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.home.todayMetrics}</h3>
              <div className="space-y-2">
                {enabledMetrics.map((metric) => {
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
      }

      case 'cardio-summary':
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-workout/10">
                <HeartPulse className="h-6 w-6 text-workout" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'Weekly Cardio' : '今週の有酸素'}
                </p>
                <p className="text-2xl font-bold text-workout">
                  {data.weeklyCardio.length}
                  <span className="text-sm text-muted-foreground ml-1">{t.home.times}</span>
                </p>
                <div className="flex gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-0.5">
                    <Timer className="h-3 w-3" />{data.cardioTotalMin}{t.common.minutes}
                  </span>
                  {data.cardioTotalDist > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Route className="h-3 w-3" />{data.cardioTotalDist.toFixed(1)}km
                    </span>
                  )}
                  {data.cardioTotalCal > 0 && (
                    <span className="flex items-center gap-0.5">
                      <Flame className="h-3 w-3" />{data.cardioTotalCal}kcal
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )

      case 'stretch-summary':
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-sleep/10">
                <StretchHorizontal className="h-6 w-6 text-sleep" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? 'Weekly Stretch' : '今週のストレッチ'}
                </p>
                <p className="text-2xl font-bold text-sleep">
                  {data.weeklyStretch.length}
                  <span className="text-sm text-muted-foreground ml-1">{t.home.times}</span>
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  <Timer className="h-3 w-3 inline mr-0.5" />{data.stretchTotalMin}{t.common.minutes}
                </p>
              </div>
            </CardContent>
          </Card>
        )

      case 'mental-summary': {
        if (!data.todayMental) return null
        const m = data.todayMental
        const overall = Math.round(((m.mood + m.energy + (10 - m.stress) + m.focus) / 4) * 10) / 10
        return (
          <Card key={id} className="bg-card border-border">
            <CardContent className="flex items-center gap-4 p-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-food/10">
                <Brain className="h-6 w-6 text-food" />
              </div>
              <div className="flex-1">
                <p className="text-sm text-muted-foreground">
                  {locale === 'en' ? "Today's Mental" : '今日のメンタル'}
                </p>
                <p className="text-2xl font-bold text-food">
                  {overall}
                  <span className="text-sm text-muted-foreground ml-1">/ 10</span>
                </p>
                <div className="flex gap-2 mt-0.5 text-[10px]">
                  <span style={{ color: '#22d3a0' }}>
                    <Smile className="h-3 w-3 inline" /> {m.mood}
                  </span>
                  <span style={{ color: '#facc15' }}>
                    <Zap className="h-3 w-3 inline" /> {m.energy}
                  </span>
                  <span style={{ color: '#ef4444' }}>
                    <Wind className="h-3 w-3 inline" /> {m.stress}
                  </span>
                  <span style={{ color: '#a78bfa' }}>
                    <Target className="h-3 w-3 inline" /> {m.focus}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        )
      }

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

      {/* ウィジェット一覧: visible かつ 対応タブが有効なもののみ */}
      {widgetConfig
        .filter(w => {
          if (!w.visible) return false
          const requiredTab = widgetRequiresTab[w.id]
          // タブ依存なし(streak, metrics-today)は常に表示
          if (!requiredTab) return true
          // 対応するタブがユーザーの有効タブに含まれているか
          return enabledTabs.has(requiredTab)
        })
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
