'use client'

import { useState } from 'react'
import { ChevronUp, ChevronDown, Plus, X, Trash2, Database } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { BuiltinTabId, MetricDefinition, TabConfig } from '@/lib/types'
import { isMetricTabId, getMetricIdFromTabId } from '@/lib/types'
import { BUILTIN_META, getIconComponent } from '@/lib/tab-items'
import { metricPresets, type MetricPreset } from '@/lib/metric-presets'
import { TAB_CATEGORIES, METRIC_CATEGORIES } from '@/lib/tab-categories'
import { cn } from '@/lib/utils'

interface TabSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tabConfig: TabConfig[]
  metrics: MetricDefinition[]
  onChangeConfig: (next: TabConfig[]) => void
  onAddBuiltin: (id: BuiltinTabId) => void
  onAddMetricFromPreset: (preset: MetricPreset) => void
  onRemoveMetric: (metricId: string) => void
  onOpenDataManagement?: () => void
}

type View = 'list' | 'add'

export function TabSettingsDialog({
  open,
  onOpenChange,
  tabConfig,
  metrics,
  onChangeConfig,
  onAddBuiltin,
  onAddMetricFromPreset,
  onRemoveMetric,
  onOpenDataManagement,
}: TabSettingsDialogProps) {
  const [view, setView] = useState<View>('list')

  const toggle = (id: string) => {
    onChangeConfig(
      tabConfig.map(c => (c.id === id ? { ...c, visible: !c.visible } : c))
    )
  }

  const move = (index: number, direction: -1 | 1) => {
    const next = [...tabConfig]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChangeConfig(next)
  }

  const removeItem = (config: TabConfig) => {
    if (isMetricTabId(config.id)) {
      const metricId = getMetricIdFromTabId(config.id)
      if (metricId) onRemoveMetric(metricId) // メトリクス削除(エントリも一緒に消える)
    } else {
      // 組み込みの場合はタブから外すだけ(データは保持)
      onChangeConfig(tabConfig.filter(c => c.id !== config.id))
    }
  }

  // 追加可能な組み込み・プリセット
  const enabledBuiltinIds = new Set(
    tabConfig.filter(c => !isMetricTabId(c.id)).map(c => c.id as BuiltinTabId)
  )
  const availableBuiltins = (Object.keys(BUILTIN_META) as BuiltinTabId[]).filter(
    id => !enabledBuiltinIds.has(id)
  )

  const enabledMetricNames = new Set(metrics.map(m => m.name))
  const availablePresets = metricPresets.filter(p => !enabledMetricNames.has(p.name))

  // config → 表示用メタ解決
  const getMeta = (config: TabConfig) => {
    if (isMetricTabId(config.id)) {
      const metricId = getMetricIdFromTabId(config.id)
      const metric = metrics.find(m => m.id === metricId)
      if (!metric) return null
      return {
        icon: getIconComponent(metric.icon),
        label: metric.name,
        color: metric.color,
        useStyle: true as const,
      }
    }
    const bm = BUILTIN_META[config.id as BuiltinTabId]
    return {
      icon: bm.icon,
      label: bm.label,
      color: bm.colorClass,
      useStyle: false as const,
    }
  }

  const visibleCount = tabConfig.filter(c => c.visible).length

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) setView('list')
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
        {view === 'list' ? (
          <>
            <DialogHeader>
              <DialogTitle>タブの編集</DialogTitle>
              <DialogDescription>
                下部ナビに表示する項目の順番と表示/非表示を設定できます。Homeは固定です。
              </DialogDescription>
            </DialogHeader>

            {tabConfig.length === 0 ? (
              <p className="text-center text-sm text-muted-foreground py-8">
                項目がありません。「追加」から選んでください。
              </p>
            ) : (
              <div className="space-y-2">
                {tabConfig.map((config, i) => {
                  const meta = getMeta(config)
                  if (!meta) return null
                  const Icon = meta.icon
                  const isOnlyVisible = config.visible && visibleCount === 1
                  return (
                    <div
                      key={config.id}
                      className={cn(
                        'flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2 transition-opacity',
                        !config.visible && 'opacity-60'
                      )}
                    >
                      {/* 並び替え */}
                      <div className="flex flex-col">
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={i === 0}
                          onClick={() => move(i, -1)}
                        >
                          <ChevronUp className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-5 w-5 text-muted-foreground hover:text-foreground disabled:opacity-30"
                          disabled={i === tabConfig.length - 1}
                          onClick={() => move(i, 1)}
                        >
                          <ChevronDown className="h-3.5 w-3.5" />
                        </Button>
                      </div>

                      <div className="flex-1 flex items-center gap-2 min-w-0">
                        {meta.useStyle ? (
                          <Icon className="h-5 w-5 shrink-0" style={{ color: meta.color }} />
                        ) : (
                          <Icon className={cn('h-5 w-5 shrink-0', meta.color)} />
                        )}
                        <span className="font-medium text-foreground truncate">
                          {meta.label}
                        </span>
                      </div>

                      <Switch
                        checked={config.visible}
                        disabled={isOnlyVisible}
                        onCheckedChange={() => toggle(config.id)}
                        aria-label={`${meta.label}を表示`}
                      />

                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={() => {
                          if (
                            confirm(
                              isMetricTabId(config.id)
                                ? `「${meta.label}」を削除しますか?記録もすべて消えます。`
                                : `「${meta.label}」をタブから外しますか?`
                            )
                          ) {
                            removeItem(config)
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                })}
              </div>
            )}

            <div className="pt-2 border-t border-border space-y-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setView('add')}
                disabled={availableBuiltins.length === 0 && availablePresets.length === 0}
                className="w-full gap-1"
              >
                <Plus className="h-4 w-4" />
                項目を追加
              </Button>
              {onOpenDataManagement && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    onOpenChange(false)
                    onOpenDataManagement()
                  }}
                  className="w-full gap-1 text-muted-foreground"
                >
                  <Database className="h-4 w-4" />
                  データの管理
                </Button>
              )}
              <p className="text-xs text-muted-foreground text-center">
                表示中: {visibleCount} / {tabConfig.length}
              </p>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7"
                  onClick={() => setView('list')}
                >
                  <X className="h-4 w-4" />
                </Button>
                項目を追加
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              {/* 組み込みタブ（カテゴリ別） */}
              {TAB_CATEGORIES.map((cat) => {
                const items = cat.builtinIds.filter(id => availableBuiltins.includes(id))
                if (items.length === 0) return null
                return (
                  <div key={cat.id} className="space-y-2">
                    <h3 className="text-xs font-medium text-muted-foreground">{cat.label}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((id) => {
                        const bm = BUILTIN_META[id]
                        if (!bm) return null
                        const Icon = bm.icon
                        return (
                          <button
                            key={id}
                            type="button"
                            onClick={() => {
                              onAddBuiltin(id)
                              setView('list')
                            }}
                            className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-left hover:bg-secondary transition-colors"
                          >
                            <Icon className={cn('h-5 w-5 shrink-0 mt-0.5', bm.colorClass)} />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-foreground truncate">
                                {bm.label}
                              </p>
                              <p className="text-xs text-muted-foreground truncate">
                                {bm.description}
                              </p>
                            </div>
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )
              })}

              {/* 数値プリセット（バイタル・嗜好品） */}
              {METRIC_CATEGORIES.map((cat) => {
                const items = availablePresets.filter(p => {
                  if (cat.id === 'vitals') return p.category === '健康'
                  if (cat.id === 'substances') return p.category === '嗜好品'
                  return false
                })
                if (items.length === 0) return null
                return (
                  <div key={cat.id} className="space-y-2">
                    <h3 className="text-xs font-medium text-muted-foreground">{cat.label}</h3>
                    <div className="grid grid-cols-2 gap-2">
                      {items.map((preset) => {
                        const Icon = getIconComponent(preset.icon)
                        return (
                          <button
                            key={preset.name}
                            type="button"
                            onClick={() => {
                              onAddMetricFromPreset(preset)
                              setView('list')
                            }}
                            className="flex items-start gap-2 rounded-lg border border-border bg-secondary/40 p-3 text-left hover:bg-secondary transition-colors"
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
              })}

              {availableBuiltins.length === 0 && availablePresets.length === 0 && (
                <p className="text-center text-sm text-muted-foreground py-4">
                  追加できる項目がありません
                </p>
              )}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
