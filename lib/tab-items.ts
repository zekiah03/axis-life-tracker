// BottomNav とオンボーディング/設定画面で共有するタブメタデータ。
// 組み込みとメトリクスの両方を統一インターフェースで扱う。

import { Wallet, Dumbbell, Utensils, Moon, Scale } from 'lucide-react'
import * as Icons from 'lucide-react'
import type { BuiltinTabId, MetricDefinition, TabType } from './types'

export interface TabItemMeta {
  id: Exclude<TabType, 'home'>
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  color: string // CSS color (tailwind class 'text-xxx' or CSS var / hex)
  indicatorColor: string // bg utility for active indicator
  kind: 'builtin' | 'metric'
}

export interface BuiltinMeta {
  id: BuiltinTabId
  label: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  colorClass: string // 'text-money' など
  indicatorClass: string // 'bg-money' など
}

export const BUILTIN_META: Record<BuiltinTabId, BuiltinMeta> = {
  money: {
    id: 'money',
    label: '家計簿',
    description: '収支を記録',
    icon: Wallet,
    colorClass: 'text-money',
    indicatorClass: 'bg-money',
  },
  workout: {
    id: 'workout',
    label: '筋トレ',
    description: 'セット・レップ・重量',
    icon: Dumbbell,
    colorClass: 'text-workout',
    indicatorClass: 'bg-workout',
  },
  food: {
    id: 'food',
    label: '食事',
    description: 'PFCとカロリー',
    icon: Utensils,
    colorClass: 'text-food',
    indicatorClass: 'bg-food',
  },
  sleep: {
    id: 'sleep',
    label: '睡眠',
    description: '就寝・起床・質',
    icon: Moon,
    colorClass: 'text-sleep',
    indicatorClass: 'bg-sleep',
  },
  body: {
    id: 'body',
    label: '体組成',
    description: '体重・体脂肪',
    icon: Scale,
    colorClass: 'text-body',
    indicatorClass: 'bg-body',
  },
}

export function getIconComponent(name: string): React.ComponentType<{ className?: string }> {
  const IconComp = (Icons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[name]
  return IconComp || Icons.Circle
}

// MetricDefinition からタブメタを作る
export function getMetricTabMeta(metric: MetricDefinition): TabItemMeta {
  return {
    id: `metric:${metric.id}`,
    label: metric.name,
    description: metric.unit + (metric.target ? ` / 目標${metric.target}` : ''),
    icon: getIconComponent(metric.icon),
    color: metric.color,
    indicatorColor: metric.color,
    kind: 'metric',
  }
}
