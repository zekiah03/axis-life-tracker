'use client'

import { useState, useMemo } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MetricDefinition, MetricEntry } from '@/lib/types'
import { getIconComponent } from '@/lib/tab-items'

interface MetricDetailTabProps {
  metric: MetricDefinition
  entries: MetricEntry[] // このメトリクス固有のエントリのみ
  onAddEntry: (entry: Omit<MetricEntry, 'id' | 'createdAt'>) => void
  onDeleteEntry: (id: string) => void
}

function formatValue(value: number, step: number = 1): string {
  if (step >= 1) return Math.round(value).toString()
  if (step >= 0.1) return value.toFixed(1)
  return value.toFixed(2)
}

function aggregate(metric: MetricDefinition, entries: MetricEntry[]): number {
  if (entries.length === 0) return 0
  switch (metric.aggregation) {
    case 'sum':
      return entries.reduce((s, e) => s + e.value, 0)
    case 'average':
      return entries.reduce((s, e) => s + e.value, 0) / entries.length
    case 'latest':
      return entries.sort((a, b) => b.createdAt - a.createdAt)[0].value
  }
}

export function MetricDetailTab({
  metric,
  entries,
  onAddEntry,
  onDeleteEntry,
}: MetricDetailTabProps) {
  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  const Icon = getIconComponent(metric.icon)

  // 今日の集計値
  const today = new Date().toISOString().split('T')[0]
  const todayEntries = useMemo(() => entries.filter(e => e.date === today), [entries, today])
  const todayValue = aggregate(metric, todayEntries)
  const progress =
    metric.target && metric.target > 0
      ? Math.min(100, (todayValue / metric.target) * 100)
      : null

  // 直近7日の平均
  const last7Avg = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recent = entries.filter(e => new Date(e.date) >= sevenDaysAgo)
    if (recent.length === 0) return null
    // 日次集計を取ってから平均
    const byDate = new Map<string, MetricEntry[]>()
    for (const e of recent) {
      byDate.set(e.date, [...(byDate.get(e.date) || []), e])
    }
    const dailyValues = Array.from(byDate.values()).map(es => aggregate(metric, es))
    return dailyValues.reduce((s, v) => s + v, 0) / dailyValues.length
  }, [entries, metric])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const num = parseFloat(value)
    if (isNaN(num)) return
    onAddEntry({ metricId: metric.id, value: num, date })
    setValue('')
  }

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.createdAt - a.createdAt),
    [entries]
  )

  return (
    <div className="space-y-4">
      {/* 今日のサマリー */}
      <Card
        className="border"
        style={{
          backgroundColor: metric.color + '1a', // 10% alpha
          borderColor: metric.color + '33', // 20% alpha
        }}
      >
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Icon className="h-4 w-4" style={{ color: metric.color }} />
            <h3 className="text-sm font-medium text-muted-foreground">今日の{metric.name}</h3>
          </div>
          <div className="flex items-baseline justify-between">
            <p className="text-3xl font-bold" style={{ color: metric.color }}>
              {formatValue(todayValue, metric.step)}
              <span className="text-base text-muted-foreground ml-1">{metric.unit}</span>
            </p>
            {metric.target && (
              <p className="text-sm text-muted-foreground">
                / {metric.target} {metric.unit}
              </p>
            )}
          </div>
          {progress !== null && (
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-secondary">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, backgroundColor: metric.color }}
              />
            </div>
          )}
          {last7Avg !== null && (
            <p className="mt-2 text-xs text-muted-foreground">
              直近7日平均: {formatValue(last7Avg, metric.step)} {metric.unit}
            </p>
          )}
        </CardContent>
      </Card>

      {/* 入力フォーム */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">値 ({metric.unit})</Label>
              <Input
                type="number"
                inputMode="decimal"
                step={metric.step}
                min={metric.minValue}
                max={metric.maxValue}
                placeholder={
                  metric.minValue !== undefined && metric.maxValue !== undefined
                    ? `${metric.minValue} 〜 ${metric.maxValue}`
                    : '値を入力'
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
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
              className="w-full font-medium"
              style={{ backgroundColor: metric.color, color: '#0a0a0f' }}
              disabled={!value}
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 履歴 */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">記録履歴</h3>
          {sortedEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">記録がありません</p>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
                >
                  <span className="text-sm text-muted-foreground">{entry.date}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: metric.color }}>
                      {formatValue(entry.value, metric.step)} {metric.unit}
                    </span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteEntry(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
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
