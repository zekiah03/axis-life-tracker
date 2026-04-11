'use client'

import { Wallet, Dumbbell, Utensils, Moon, Scale, LineChart, ChevronUp, ChevronDown } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { TabConfig, NonHomeTabType } from '@/lib/types'
import { defaultTabConfig } from '@/lib/types'
import { cn } from '@/lib/utils'

interface TabSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tabConfig: TabConfig[]
  onChange: (next: TabConfig[]) => void
}

const tabMeta: Record<NonHomeTabType, { label: string; icon: typeof Wallet; color: string }> = {
  money: { label: '家計簿', icon: Wallet, color: 'text-money' },
  workout: { label: '筋トレ', icon: Dumbbell, color: 'text-workout' },
  food: { label: '食事', icon: Utensils, color: 'text-food' },
  sleep: { label: '睡眠', icon: Moon, color: 'text-sleep' },
  body: { label: '体組成', icon: Scale, color: 'text-body' },
  metrics: { label: '数値', icon: LineChart, color: 'text-foreground' },
}

export function TabSettingsDialog({
  open,
  onOpenChange,
  tabConfig,
  onChange,
}: TabSettingsDialogProps) {
  const toggle = (id: NonHomeTabType) => {
    onChange(tabConfig.map(c => (c.id === id ? { ...c, visible: !c.visible } : c)))
  }

  const move = (index: number, direction: -1 | 1) => {
    const next = [...tabConfig]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const reset = () => {
    onChange(defaultTabConfig)
  }

  const visibleCount = tabConfig.filter(c => c.visible).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle>タブの編集</DialogTitle>
          <DialogDescription>
            下部ナビの順番と表示/非表示を設定できます。Homeは固定です。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {tabConfig.map((config, i) => {
            const meta = tabMeta[config.id]
            const Icon = meta.icon
            const isOnlyVisible = config.visible && visibleCount === 1
            return (
              <div
                key={config.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3 transition-opacity',
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

                {/* ラベル */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  <Icon className={cn('h-5 w-5 shrink-0', meta.color)} />
                  <span className="font-medium text-foreground truncate">{meta.label}</span>
                </div>

                {/* 表示トグル */}
                <Switch
                  checked={config.visible}
                  disabled={isOnlyVisible}
                  onCheckedChange={() => toggle(config.id)}
                  aria-label={`${meta.label}を表示`}
                />
              </div>
            )
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-border">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={reset}
            className="text-muted-foreground"
          >
            初期状態に戻す
          </Button>
          <p className="text-xs text-muted-foreground">
            表示中: {visibleCount} / {tabConfig.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
