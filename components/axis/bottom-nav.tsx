'use client'

import { Home, Wallet, Dumbbell, Utensils, Moon, Scale, LineChart } from 'lucide-react'
import type { TabType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs: { id: TabType; label: string; icon: typeof Home; color: string; indicatorColor: string }[] = [
  { id: 'home', label: 'Home', icon: Home, color: 'text-foreground', indicatorColor: 'bg-foreground' },
  { id: 'money', label: '家計簿', icon: Wallet, color: 'text-money', indicatorColor: 'bg-money' },
  { id: 'workout', label: '筋トレ', icon: Dumbbell, color: 'text-workout', indicatorColor: 'bg-workout' },
  { id: 'food', label: '食事', icon: Utensils, color: 'text-food', indicatorColor: 'bg-food' },
  { id: 'sleep', label: '睡眠', icon: Moon, color: 'text-sleep', indicatorColor: 'bg-sleep' },
  { id: 'body', label: '体組成', icon: Scale, color: 'text-body', indicatorColor: 'bg-body' },
  { id: 'metrics', label: '数値', icon: LineChart, color: 'text-foreground', indicatorColor: 'bg-foreground' },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 max-w-[480px] mx-auto h-16 bg-background/95 backdrop-blur-sm border-t border-border">
      <div className="h-full overflow-x-auto overflow-y-hidden scrollbar-hide">
        <div className="flex h-full items-center min-w-full w-max">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={cn(
                  'relative flex min-w-[72px] flex-col items-center justify-center gap-1 py-2 px-3 transition-colors shrink-0',
                  isActive ? tab.color : 'text-muted-foreground'
                )}
              >
                {isActive && (
                  <span
                    className={cn(
                      'absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full',
                      tab.indicatorColor
                    )}
                  />
                )}
                <Icon className="h-5 w-5" />
                <span className="text-xs font-medium">{tab.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </nav>
  )
}
