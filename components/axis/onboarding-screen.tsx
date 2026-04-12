'use client'

import { useState } from 'react'
import { Check, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { BuiltinTabId, MetricDefinition, TabConfig } from '@/lib/types'
import { BUILTIN_TAB_IDS } from '@/lib/types'
import { metricPresets, metricCategories, type MetricPreset } from '@/lib/metric-presets'
import { BUILTIN_META, getIconComponent } from '@/lib/tab-items'
import { cn } from '@/lib/utils'

interface OnboardingScreenProps {
  onComplete: (
    tabConfig: TabConfig[],
    newMetrics: Omit<MetricDefinition, 'id' | 'createdAt'>[]
  ) => void
}

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [selectedBuiltins, setSelectedBuiltins] = useState<Set<BuiltinTabId>>(
    new Set(['money', 'workout', 'food'])
  )
  const [selectedPresets, setSelectedPresets] = useState<Set<string>>(new Set())

  const toggleBuiltin = (id: BuiltinTabId) => {
    setSelectedBuiltins(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const togglePreset = (name: string) => {
    setSelectedPresets(prev => {
      const next = new Set(prev)
      if (next.has(name)) next.delete(name)
      else next.add(name)
      return next
    })
  }

  const totalSelected = selectedBuiltins.size + selectedPresets.size

  const handleComplete = () => {
    const newMetrics: Omit<MetricDefinition, 'id' | 'createdAt'>[] = []
    for (const preset of metricPresets) {
      if (selectedPresets.has(preset.name)) {
        newMetrics.push({
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
        })
      }
    }

    const tabConfig: TabConfig[] = []
    for (const id of BUILTIN_TAB_IDS) {
      if (selectedBuiltins.has(id)) {
        tabConfig.push({ id, visible: true })
      }
    }
    onComplete(tabConfig, newMetrics)
  }

  return (
    <div className="flex min-h-[100dvh] max-w-[480px] mx-auto flex-col bg-background">
      {/* ヘッダー */}
      <div className="px-6 pt-12 pb-6 shrink-0">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="h-5 w-5 text-foreground" />
          <h1 className="text-2xl font-bold text-foreground">ようこそ</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          記録したい項目を選んでください。
          <br />
          後から設定画面で追加・削除もできます。
        </p>
      </div>

      {/* スクロール可能なコンテンツ */}
      <div className="flex-1 overflow-y-auto px-4 space-y-6">
        {/* カテゴリ */}
        <section className="space-y-2">
          <h2 className="text-xs font-medium text-muted-foreground px-2">
            カテゴリ（高機能）
          </h2>
          <div className="grid grid-cols-2 gap-2">
            {BUILTIN_TAB_IDS.map((id) => {
              const meta = BUILTIN_META[id]
              const Icon = meta.icon
              const selected = selectedBuiltins.has(id)
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => toggleBuiltin(id)}
                  className={cn(
                    'relative flex flex-col items-start gap-1 rounded-lg border p-3 text-left transition-colors',
                    selected
                      ? 'border-foreground bg-foreground/5'
                      : 'border-border bg-secondary/40 hover:bg-secondary/60'
                  )}
                >
                  <div className="flex w-full items-center justify-between">
                    <Icon className={cn('h-5 w-5', meta.colorClass)} />
                    {selected && <Check className="h-4 w-4 text-foreground" />}
                  </div>
                  <span className="text-sm font-medium text-foreground">{meta.label}</span>
                  <span className="text-xs text-muted-foreground">{meta.description}</span>
                </button>
              )
            })}
          </div>
        </section>

        {/* 数値ログ（カテゴリごと） */}
        {metricCategories.map((cat) => {
          const items = metricPresets.filter(p => p.category === cat)
          if (items.length === 0) return null
          return (
            <section key={cat} className="space-y-2">
              <h2 className="text-xs font-medium text-muted-foreground px-2">{cat}</h2>
              <div className="grid grid-cols-2 gap-2">
                {items.map((preset) => {
                  const Icon = getIconComponent(preset.icon)
                  const selected = selectedPresets.has(preset.name)
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => togglePreset(preset.name)}
                      className={cn(
                        'relative flex items-start gap-2 rounded-lg border p-3 text-left transition-colors',
                        selected
                          ? 'border-foreground bg-foreground/5'
                          : 'border-border bg-secondary/40 hover:bg-secondary/60'
                      )}
                    >
                      <Icon
                        className="h-5 w-5 shrink-0 mt-0.5"
                        style={{ color: preset.color }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-foreground truncate">
                          {preset.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {preset.unit}
                          {preset.target ? ` / 目標${preset.target}` : ''}
                        </p>
                      </div>
                      {selected && (
                        <Check className="h-4 w-4 text-foreground shrink-0 mt-0.5" />
                      )}
                    </button>
                  )
                })}
              </div>
            </section>
          )
        })}

        {/* 下に余白（フッター分） */}
        <div className="h-4" />
      </div>

      {/* 下部の確定バー — sticky ではなく flex の shrink-0 */}
      <div className="shrink-0 p-4 pb-8 bg-background border-t border-border">
        <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
          <span>選択中: {totalSelected} 項目</span>
          <button
            type="button"
            className="hover:text-foreground transition-colors"
            onClick={() => {
              setSelectedBuiltins(new Set())
              setSelectedPresets(new Set())
            }}
          >
            クリア
          </button>
        </div>
        <Button
          type="button"
          onClick={handleComplete}
          className="w-full h-12 bg-foreground text-background hover:bg-foreground/90 font-medium text-base"
          disabled={totalSelected === 0}
        >
          {totalSelected === 0 ? '項目を選択してください' : '始める'}
        </Button>
      </div>
    </div>
  )
}
