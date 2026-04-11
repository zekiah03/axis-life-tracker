'use client'

import { Home, Wallet, Dumbbell, Utensils, Moon, Scale, LineChart } from 'lucide-react'
import type { TabType, TabConfig, NonHomeTabType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
  tabConfig: TabConfig[]
}

interface TabMeta {
  label: string
  icon: typeof Home
  color: string
  indicatorColor: string
}

const homeMeta: TabMeta = {
  label: 'Home',
  icon: Home,
  color: 'text-foreground',
  indicatorColor: 'bg-foreground',
}

const tabMetaMap: Record<NonHomeTabType, TabMeta> = {
  money: { label: '家計簿', icon: Wallet, color: 'text-money', indicatorColor: 'bg-money' },
  workout: { label: '筋トレ', icon: Dumbbell, color: 'text-workout', indicatorColor: 'bg-workout' },
  food: { label: '食事', icon: Utensils, color: 'text-food', indicatorColor: 'bg-food' },
  sleep: { label: '睡眠', icon: Moon, color: 'text-sleep', indicatorColor: 'bg-sleep' },
  body: { label: '体組成', icon: Scale, color: 'text-body', indicatorColor: 'bg-body' },
  metrics: { label: '数値', icon: LineChart, color: 'text-foreground', indicatorColor: 'bg-foreground' },
}

export function BottomNav({ activeTab, onTabChange, tabConfig }: BottomNavProps) {
  const visibleTabs: { id: TabType; meta: TabMeta }[] = [
    { id: 'home', meta: homeMeta },
    ...tabConfig
      .filter(c => c.visible)
      .map(c => ({ id: c.id as TabType, meta: tabMetaMap[c.id] })),
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto h-16 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="h-full overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex h-full items-center min-w-full w-max">
          {visibleTabs.map(({ id, meta }) => {
            const isActive = activeTab === id
            const Icon = meta.icon
            return (
              <button
                key={id}
                onClick={() => onTabChange(id)}
                className={cn(
                  'relative flex min-w-[72px] flex-col items-center justify-center gap-1 py-2 px-3 transition-colors shrink-0',
                  isActive ? meta.color : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <span
                    className={cn(
                      'absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full',
                      meta.indicatorColor
                    )}
                  />
                )}
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{meta.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
