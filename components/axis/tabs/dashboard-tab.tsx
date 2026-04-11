'use client'

import * as Icons from 'lucide-react'
import { Wallet, Dumbbell, Utensils, TrendingUp, TrendingDown } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type {
  Transaction,
  WorkoutEntry,
  FoodEntry,
  MetricDefinition,
  MetricEntry,
} from '@/lib/types'
import { cn } from '@/lib/utils'

interface DashboardTabProps {
  transactions: Transaction[]
  workouts: WorkoutEntry[]
  foods: FoodEntry[]
  metrics: MetricDefinition[]
  metricEntries: MetricEntry[]
  onNavigateToMetrics?: () => void
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
    case 'sum':
      return todayEntries.reduce((sum, e) => sum + e.value, 0)
    case 'average':
      return todayEntries.reduce((sum, e) => sum + e.value, 0) / todayEntries.length
    case 'latest':
      return todayEntries.sort((a, b) => b.createdAt - a.createdAt)[0].value
  }
}

function formatValue(value: number, step: number = 1): string {
  if (step >= 1) return Math.round(value).toString()
  if (step >= 0.1) return value.toFixed(1)
  return value.toFixed(2)
}

export function DashboardTab({
  transactions,
  workouts,
  foods,
  metrics,
  metricEntries,
  onNavigateToMetrics,
}: DashboardTabProps) {
  const today = new Date().toISOString().split('T')[0]
  
  // Calculate monthly balance
  const thisMonth = new Date().toISOString().slice(0, 7)
  const monthlyTransactions = transactions.filter(t => t.date.startsWith(thisMonth))
  const monthlyIncome = monthlyTransactions
    .filter(t => t.type === '収入')
    .reduce((sum, t) => sum + t.amount, 0)
  const monthlyExpense = monthlyTransactions
    .filter(t => t.type === '支出')
    .reduce((sum, t) => sum + t.amount, 0)
  const monthlyBalance = monthlyIncome - monthlyExpense

  // Calculate weekly workouts
  const oneWeekAgo = new Date()
  oneWeekAgo.setDate(oneWeekAgo.getDate() - 7)
  const weeklyWorkouts = workouts.filter(w => new Date(w.date) >= oneWeekAgo)

  // Calculate today's nutrition
  const todayFoods = foods.filter(f => f.date === today)
  const todayNutrition = {
    calories: todayFoods.reduce((sum, f) => sum + f.calories, 0),
    protein: todayFoods.reduce((sum, f) => sum + f.protein, 0),
    fat: todayFoods.reduce((sum, f) => sum + f.fat, 0),
    carbs: todayFoods.reduce((sum, f) => sum + f.carbs, 0),
  }

  // Target values for PFC
  const targets = { calories: 2000, protein: 120, fat: 60, carbs: 250 }

  const recentTransactions = [...transactions]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4)

  const recentWorkouts = [...workouts]
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 4)

  return (
    <div className="space-y-4">
      {/* Summary Cards */}
      <div className="space-y-3">
        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-money/10">
              <Wallet className="h-6 w-6 text-money" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">今月の収支</p>
              <p className={cn('text-2xl font-bold', monthlyBalance >= 0 ? 'text-money' : 'text-destructive')}>
                {monthlyBalance >= 0 ? '+' : ''}{monthlyBalance.toLocaleString()}円
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-workout/10">
              <Dumbbell className="h-6 w-6 text-workout" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">今週のワークアウト</p>
              <p className="text-2xl font-bold text-workout">{weeklyWorkouts.length}回</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-food/10">
              <Utensils className="h-6 w-6 text-food" />
            </div>
            <div className="flex-1">
              <p className="text-sm text-muted-foreground">今日のカロリー</p>
              <p className="text-2xl font-bold text-food">{Math.round(todayNutrition.calories)} kcal</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's PFC Balance */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-4 text-sm font-medium text-muted-foreground">今日のPFCバランス</h3>
          <div className="space-y-3">
            {[
              { label: 'P (タンパク質)', value: todayNutrition.protein, target: targets.protein, unit: 'g' },
              { label: 'F (脂質)', value: todayNutrition.fat, target: targets.fat, unit: 'g' },
              { label: 'C (炭水化物)', value: todayNutrition.carbs, target: targets.carbs, unit: 'g' },
            ].map(({ label, value, target, unit }) => {
              const percentage = Math.min((value / target) * 100, 100)
              return (
                <div key={label} className="space-y-1">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <span className="text-foreground">
                      {Math.round(value)}{unit} / {target}{unit}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-secondary">
                    <div
                      className="h-full rounded-full bg-food transition-all duration-500"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      {/* 今日のメトリクス進捗 */}
      {metrics.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-muted-foreground">今日の数値</h3>
              {onNavigateToMetrics && (
                <button
                  type="button"
                  onClick={onNavigateToMetrics}
                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  詳細 →
                </button>
              )}
            </div>
            <div className="space-y-3">
              {metrics.map((metric) => {
                const Icon = getIcon(metric.icon)
                const value = computeTodayMetricValue(metric, metricEntries)
                const progress =
                  metric.target && metric.target > 0
                    ? Math.min(100, (value / metric.target) * 100)
                    : null
                return (
                  <div key={metric.id} className="space-y-1.5">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2 min-w-0">
                        <Icon className="h-4 w-4 shrink-0" style={{ color: metric.color }} />
                        <span className="text-muted-foreground truncate">{metric.name}</span>
                      </div>
                      <span className="text-foreground shrink-0 ml-2">
                        <span className="font-medium" style={{ color: metric.color }}>
                          {formatValue(value, metric.step)}
                        </span>
                        {metric.target ? ` / ${metric.target}` : ''} {metric.unit}
                      </span>
                    </div>
                    {progress !== null && (
                      <div className="h-2 overflow-hidden rounded-full bg-secondary">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${progress}%`, backgroundColor: metric.color }}
                        />
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent Transactions */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">最近の取引</h3>
          {recentTransactions.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">取引がありません</p>
          ) : (
            <div className="space-y-2">
              {recentTransactions.map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    {t.type === '収入' ? (
                      <TrendingUp className="h-4 w-4 text-money" />
                    ) : (
                      <TrendingDown className="h-4 w-4 text-destructive" />
                    )}
                    <div>
                      <p className="text-sm font-medium text-foreground">{t.category}</p>
                      <p className="text-xs text-muted-foreground">{t.date}</p>
                    </div>
                  </div>
                  <p className={cn('text-sm font-medium', t.type === '収入' ? 'text-money' : 'text-destructive')}>
                    {t.type === '収入' ? '+' : '-'}{t.amount.toLocaleString()}円
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Workouts */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">最近のワークアウト</h3>
          {recentWorkouts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">ワークアウトがありません</p>
          ) : (
            <div className="space-y-2">
              {recentWorkouts.map((w) => (
                <div key={w.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <div className="flex items-center gap-3">
                    <Dumbbell className="h-4 w-4 text-workout" />
                    <div>
                      <p className="text-sm font-medium text-foreground">{w.exercise}</p>
                      <p className="text-xs text-muted-foreground">{w.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="rounded-full bg-workout/10 px-2 py-0.5 text-xs font-medium text-workout">
                      {w.muscleGroup}
                    </span>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {w.sets}x{w.reps} @ {w.weight}kg
                    </p>
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
