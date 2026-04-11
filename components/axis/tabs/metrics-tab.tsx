'use client'

import { useState, useMemo } from 'react'
import * as Icons from 'lucide-react'
import { Plus, Trash2, X } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import type { MetricDefinition, MetricEntry } from '@/lib/types'
import { metricPresets, metricCategories, type MetricPreset } from '@/lib/metric-presets'
import { cn } from '@/lib/utils'

interface MetricsTabProps {
  metrics: MetricDefinition[]
  metricEntries: MetricEntry[]
  onAddMetric: (metric: Omit<MetricDefinition, 'id' | 'createdAt'>) => void
  onDeleteMetric: (id: string) => void
  onAddEntry: (entry: Omit<MetricEntry, 'id' | 'createdAt'>) => void
  onDeleteEntry: (id: string) => void
}

// Lucideアイコン名から実際のコンポーネントを取得
function getIcon(name: string): React.ComponentType<{ className?: string }> {
  const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]
  return IconComp || Icons.Circle
}

// 日次合算値を計算
function computeTodayValue(metric: MetricDefinition, entries: MetricEntry[]): number {
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

export function MetricsTab({
  metrics,
  metricEntries,
  onAddMetric,
  onDeleteMetric,
  onAddEntry,
  onDeleteEntry,
}: MetricsTabProps) {
  const [addMetricOpen, setAddMetricOpen] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<MetricDefinition | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [inputDate, setInputDate] = useState(new Date().toISOString().split('T')[0])

  const handleAddPreset = (preset: MetricPreset) => {
    onAddMetric({
      name: preset.name,
      unit: preset.unit,
      icon: preset.icon,
      color: preset.color,
      aggregation: preset.aggregation,
      target: preset.target,
      minValue: preset.minValue,
      maxValue: preset.maxValue,
      step: preset.step,
    })
    setAddMetricOpen(false)
  }

  const handleLogValue = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMetric || !inputValue) return
    const num = parseFloat(inputValue)
    if (isNaN(num)) return
    onAddEntry({
      metricId: selectedMetric.id,
      value: num,
      date: inputDate,
    })
    setInputValue('')
  }

  // メトリクス毎の直近エントリリスト
  const recentEntriesByMetric = useMemo(() => {
    const map = new Map<string, MetricEntry[]>()
    for (const entry of metricEntries) {
      const list = map.get(entry.metricId) || []
      list.push(entry)
      map.set(entry.metricId, list)
    }
    for (const list of map.values()) {
      list.sort((a, b) => b.createdAt - a.createdAt)
    }
    return map
  }, [metricEntries])

  const usedPresetNames = new Set(metrics.map(m => m.name))
  const availablePresets = metricPresets.filter(p => !usedPresetNames.has(p.name))

  return (
    <div className="space-y-4">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-muted-foreground">数値ログ</h2>
        <Dialog open={addMetricOpen} onOpenChange={setAddMetricOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="outline" className="gap-1">
              <Plus className="h-4 w-4" />
              項目を追加
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[420px] max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>項目を追加</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              {availablePresets.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  追加できるプリセットがありません
                </p>
              ) : (
                metricCategories.map((cat) => {
                  const items = availablePresets.filter(p => p.category === cat)
                  if (items.length === 0) return null
                  return (
                    <div key={cat} className="space-y-2">
                      <h3 className="text-xs font-medium text-muted-foreground">{cat}</h3>
                      <div className="grid grid-cols-2 gap-2">
                        {items.map((preset) => {
                          const Icon = getIcon(preset.icon)
                          return (
                            <button
                              key={preset.name}
                              type="button"
                              onClick={() => handleAddPreset(preset)}
                              className="flex items-start gap-2 rounded-lg border border-border bg-secondary/50 p-3 text-left hover:bg-secondary transition-colors"
                            >
                              <Icon
                                className="h-5 w-5 shrink-0 mt-0.5"
                                style={{ color: preset.color }}
                              />
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {preset.name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {preset.unit}
                                  {preset.target ? ` / 目標${preset.target}` : ''}
                                </p>
                              </div>
                            </button>
                          )
                        })}
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* メトリクス一覧 */}
      {metrics.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="p-8 text-center">
            <p className="text-sm text-muted-foreground mb-3">
              記録する項目を追加してください
            </p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddMetricOpen(true)}
              className="gap-1"
            >
              <Plus className="h-4 w-4" />
              項目を追加
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {metrics.map((metric) => {
            const Icon = getIcon(metric.icon)
            const todayValue = computeTodayValue(metric, metricEntries)
            const progress =
              metric.target && metric.target > 0
                ? Math.min(100, (todayValue / metric.target) * 100)
                : null
            return (
              <button
                key={metric.id}
                type="button"
                onClick={() => {
                  setSelectedMetric(metric)
                  setInputValue('')
                  setInputDate(new Date().toISOString().split('T')[0])
                }}
                className="rounded-lg border border-border bg-card p-3 text-left hover:bg-secondary/50 transition-colors relative overflow-hidden"
              >
                <div className="flex items-center gap-2 mb-2">
                  <Icon className="h-4 w-4 shrink-0" style={{ color: metric.color }} />
                  <span className="text-sm font-medium text-foreground truncate">
                    {metric.name}
                  </span>
                </div>
                <p className="text-xl font-bold" style={{ color: metric.color }}>
                  {formatValue(todayValue, metric.step)}
                  <span className="text-xs text-muted-foreground ml-1">{metric.unit}</span>
                </p>
                {metric.target && (
                  <>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      / {metric.target} {metric.unit}
                    </p>
                    {progress !== null && (
                      <div className="mt-2 h-1 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{ width: `${progress}%`, backgroundColor: metric.color }}
                        />
                      </div>
                    )}
                  </>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* メトリクス詳細・入力ダイアログ */}
      <Dialog
        open={selectedMetric !== null}
        onOpenChange={(open) => !open && setSelectedMetric(null)}
      >
        <DialogContent className="max-w-[420px] max-h-[85vh] overflow-y-auto">
          {selectedMetric && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {(() => {
                    const Icon = getIcon(selectedMetric.icon)
                    return <Icon className="h-5 w-5" style={{ color: selectedMetric.color }} />
                  })()}
                  {selectedMetric.name}
                </DialogTitle>
              </DialogHeader>

              {/* 入力フォーム */}
              <form onSubmit={handleLogValue} className="space-y-3">
                <div className="space-y-2">
                  <Label className="text-muted-foreground">値 ({selectedMetric.unit})</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={selectedMetric.step}
                    min={selectedMetric.minValue}
                    max={selectedMetric.maxValue}
                    placeholder={`${selectedMetric.minValue ?? 0} 〜 ${selectedMetric.maxValue ?? ''}`}
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                    autoFocus
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-muted-foreground">日付</Label>
                  <Input
                    type="date"
                    value={inputDate}
                    onChange={(e) => setInputDate(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full font-medium"
                  style={{ backgroundColor: selectedMetric.color, color: '#0a0a0f' }}
                  disabled={!inputValue}
                >
                  記録する
                </Button>
              </form>

              {/* 最近の履歴 */}
              <div className="space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground">直近の記録</h4>
                {(() => {
                  const recent = (recentEntriesByMetric.get(selectedMetric.id) || []).slice(0, 10)
                  if (recent.length === 0) {
                    return (
                      <p className="text-xs text-muted-foreground py-2 text-center">
                        まだ記録がありません
                      </p>
                    )
                  }
                  return (
                    <div className="space-y-1">
                      {recent.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between rounded-md bg-secondary/50 px-3 py-2"
                        >
                          <span className="text-xs text-muted-foreground">{entry.date}</span>
                          <div className="flex items-center gap-2">
                            <span
                              className="text-sm font-medium"
                              style={{ color: selectedMetric.color }}
                            >
                              {formatValue(entry.value, selectedMetric.step)} {selectedMetric.unit}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 text-muted-foreground hover:text-destructive"
                              onClick={() => onDeleteEntry(entry.id)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </div>

              {/* 項目自体を削除 */}
              <div className="pt-2 border-t border-border">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10 gap-1"
                  onClick={() => {
                    if (confirm(`「${selectedMetric.name}」を削除しますか?記録もすべて消えます。`)) {
                      onDeleteMetric(selectedMetric.id)
                      setSelectedMetric(null)
                    }
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                  この項目を削除
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
