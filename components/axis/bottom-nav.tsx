'use client'

import { Home } from 'lucide-react'
import type { TabType, TabConfig, MetricDefinition, BuiltinTabId } from '@/lib/types'
import { isMetricTabId, getMetricIdFromTabId } from '@/lib/types'
import { BUILTIN_META, getIconComponent } from '@/lib/tab-items'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  tabConfig: TabConfig[]
  metrics: MetricDefinition[]
}

interface ResolvedTab {
  id: TabType
  label: string
  Icon: React.ComponentType<{ className?: string }>
  colorClass?: string // 組み込み用 tailwind クラス
  colorStyle?: string // メトリクス用 インラインスタイル
  indicatorClass?: string // 組み込み用
  indicatorStyle?: string // メトリクス用
}

export function BottomNav({ activeTab, onTabChange, tabConfig, metrics }: BottomNavProps) {
  const resolved: ResolvedTab[] = [
    {
      id: 'home',
      label: 'Home',
      Icon: Home,
      colorClass: 'text-foreground',
      indicatorClass: 'bg-foreground',
    },
  ]

  for (const config of tabConfig) {
    if (!config.visible) continue
    if (isMetricTabId(config.id)) {
      const metricId = getMetricIdFromTabId(config.id)
      const metric = metrics.find(m => m.id === metricId)
      if (!metric) continue
      resolved.push({
        id: config.id as TabType,
        label: metric.name,
        Icon: getIconComponent(metric.icon),
        colorStyle: metric.color,
        indicatorStyle: metric.color,
      })
    } else {
      const bm = BUILTIN_META[config.id as BuiltinTabId]
      if (!bm) continue
      resolved.push({
        id: config.id as TabType,
        label: bm.label,
        Icon: bm.icon,
        colorClass: bm.colorClass,
        indicatorClass: bm.indicatorClass,
      })
    }
  }

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto h-16 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="h-full overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex h-full items-center min-w-full w-max">
          {resolved.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.Icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative flex min-w-[72px] flex-col items-center justify-center gap-1 py-2 px-3 transition-colors shrink-0',
                  isActive
                    ? tab.colorClass || 'text-foreground'
                    : 'text-muted-foreground'
                )}
                style={isActive && tab.colorStyle ? { color: tab.colorStyle } : undefined}
              >
                {isActive && (
                  <span
                    className={cn(
                      'absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full',
                      tab.indicatorClass
                    )}
                    style={tab.indicatorStyle ? { backgroundColor: tab.indicatorStyle } : undefined}
                  />
                )}
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium truncate max-w-[72px]">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
