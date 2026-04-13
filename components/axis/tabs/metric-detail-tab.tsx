'use client'

import { useState, useMemo, useEffect } from 'react'
import { Trash2, Smartphone, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import type { MetricDefinition, MetricEntry } from '@/lib/types'
import { getIconComponent } from '@/lib/tab-items'
import {
  getAvailability,
  requestAccess,
  fetchDailySums,
  type NativeHealthAvailability,
} from '@/lib/native-health'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface MetricDetailTabProps {
  metric: MetricDefinition
  entries: MetricEntry[] // このメトリクス固有のエントリのみ
  onAddEntry: (entry: Omit<MetricEntry, 'id' | 'createdAt'>) => void
  onDeleteEntry: (id: string) => void
  onSyncFromHealth?: (metric: MetricDefinition) => Promise<number | null>
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
  onSyncFromHealth,
}: MetricDetailTabProps) {
  const { t } = useI18n()
  const [value, setValue] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [availability, setAvailability] = useState<NativeHealthAvailability | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  // 初回のみ: ネイティブヘルスが使えるかチェック
  useEffect(() => {
    if (!metric.healthSource) return
    getAvailability().then(setAvailability).catch(() => {
      setAvailability({ available: false, platform: 'web' })
    })
  }, [metric.healthSource])

  const Icon = getIconComponent(metric.icon)

  // 今日の集計値
  const today = new Date().toISOString().split('T')[0]
  const todayEntries = useMemo(() => entries.filter(e => e.date === today), [entries, today])
  const todayValue = aggregate(metric, todayEntries)
  const progress =
    metric.target && metric.target > 0
      ? Math.min(100, (todayValue / metric.target) * 100)
      : null

  // 直近7日の平均 + ミニトレンド + ストリーク
  const weeklyData = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recent = entries.filter(e => new Date(e.date) >= sevenDaysAgo)
    if (recent.length === 0) return null
    const byDate = new Map<string, MetricEntry[]>()
    for (const e of recent) {
      byDate.set(e.date, [...(byDate.get(e.date) || []), e])
    }
    const dailyValues = Array.from(byDate.entries())
      .map(([date, es]) => ({ date, value: aggregate(metric, es) }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const avg = dailyValues.reduce((s, v) => s + v.value, 0) / dailyValues.length

    // 7日分のバー用 (空の日も含む)
    const bars: { date: string; value: number }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateStr = d.toISOString().split('T')[0]
      const found = dailyValues.find(v => v.date === dateStr)
      bars.push({ date: dateStr, value: found?.value ?? 0 })
    }

    // ストリーク
    let streak = 0
    const checkDate = new Date()
    let skippedFirst = false
    for (let i = 0; i < 60; i++) {
      const dateStr = checkDate.toISOString().split('T')[0]
      if (byDate.has(dateStr) || entries.some(e => e.date === dateStr)) {
        streak++
      } else if (streak === 0 && !skippedFirst) {
        skippedFirst = true
      } else {
        break
      }
      checkDate.setDate(checkDate.getDate() - 1)
    }

    return { avg, bars, streak, days: byDate.size }
  }, [entries, metric])
  const last7Avg = weeklyData?.avg ?? null

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

  const handleSync = async () => {
    if (!metric.healthSource) return
    setSyncing(true)
    setSyncMessage(null)
    try {
      const ok = await requestAccess([metric.healthSource])
      if (!ok) {
        setSyncMessage(t.common.permissionDenied)
        setSyncing(false)
        return
      }
      const sums = await fetchDailySums(metric.healthSource, 7)
      if (sums.length === 0) {
        setSyncMessage(t.common.noDataFor7Days)
        setSyncing(false)
        return
      }
      // 既存エントリと重複しないように、同日同ソースのものは置換ではなく追加
      // (手動入力と混在する可能性があるため保守的に)
      // より洗練されたロジックは呼び出し元に委ねる
      const added = onSyncFromHealth ? await onSyncFromHealth(metric) : 0
      setSyncMessage(
        added !== null && added !== undefined
          ? t.common.syncedDays(added)
          : t.common.syncedDaysFetched(sums.length)
      )
    } catch (err) {
      setSyncMessage(
        err instanceof Error ? t.metrics.syncFailedWith(err.message) : t.metrics.syncFailedGeneric
      )
    } finally {
      setSyncing(false)
    }
  }

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
            <h3 className="text-sm font-medium text-muted-foreground">{t.metrics.todayValue(metric.name)}</h3>
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
          {weeklyData && (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>{t.metrics.avg7Days}: <span className="font-semibold text-foreground">{formatValue(weeklyData.avg, metric.step)} {metric.unit}</span></span>
                {weeklyData.streak > 0 && (
                  <span className="flex items-center gap-1" style={{ color: metric.color }}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-3 w-3"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
                    {t.metrics.consecutiveDays(weeklyData.streak)}
                  </span>
                )}
              </div>
              {/* ミニ7日バー */}
              <div className="flex items-end gap-0.5 h-8">
                {weeklyData.bars.map((bar, i) => {
                  const maxVal = Math.max(...weeklyData.bars.map(b => b.value), 1)
                  const pct = (bar.value / maxVal) * 100
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                      <div
                        className="w-full rounded-sm min-h-[2px]"
                        style={{
                          height: `${Math.max(4, pct)}%`,
                          backgroundColor: bar.value > 0 ? metric.color : 'var(--color-secondary)',
                        }}
                      />
                      <span className="text-[7px] text-muted-foreground">
                        {t.dow[new Date(bar.date).getDay()]}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ネイティブヘルス同期 (対応メトリクスかつ対応プラットフォーム時のみ) */}
      {metric.healthSource && availability && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone
                className="h-4 w-4"
                style={{ color: availability.available ? metric.color : undefined }}
              />
              <h3 className="text-sm font-medium text-muted-foreground">
                {availability.platform === 'ios'
                  ? t.metrics.syncFromHealthIOS
                  : availability.platform === 'android'
                  ? t.metrics.syncFromHealthAndroid
                  : t.metrics.syncFromHealth}
              </h3>
            </div>
            {availability.available ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={syncing}
                  onClick={handleSync}
                >
                  <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
                  {syncing ? t.sleep.syncing : t.metrics.syncButton}
                </Button>
                {syncMessage && (
                  <p className="mt-2 text-xs text-muted-foreground">{syncMessage}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {availability.platform === 'web'
                  ? t.metrics.nativeOnly
                  : availability.reason || t.common.notAvailable}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* 入力フォーム */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.metrics.value(metric.unit)}</Label>
              <Input
                type="number"
                inputMode="decimal"
                step={metric.step}
                min={metric.minValue}
                max={metric.maxValue}
                placeholder={
                  metric.minValue !== undefined && metric.maxValue !== undefined
                    ? `${metric.minValue} 〜 ${metric.maxValue}`
                    : t.metrics.enterValue
                }
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.common.date}</Label>
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
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.metrics.recordHistory}</h3>
          {sortedEntries.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t.metrics.noRecords}</p>
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
