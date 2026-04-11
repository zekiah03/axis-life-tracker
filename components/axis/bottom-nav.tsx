'use client'

import { Home, Wallet, Dumbbell, Utensils } from 'lucide-react'
import type { TabType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface BottomNavProps {
  activeTab: TabType
  onTabChange: (tab: TabType) => void
}

const tabs: { id: TabType; label: string; icon: typeof Home; color: string }[] = [
  { id: 'home', label: 'Home', icon: Home, color: 'text-foreground' },
  { id: 'money', label: '家計簿', icon: Wallet, color: 'text-money' },
  { id: 'workout', label: '筋トレ', icon: Dumbbell, color: 'text-workout' },
  { id: 'food', label: '食事', icon: Utensils, color: 'text-food' },
]

export function BottomNav({ activeTab, onTabChange }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 flex h-16 items-center justify-around bg-background/95 backdrop-blur-sm border-t border-border">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        const Icon = tab.icon
        return (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={cn(
              'relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors',
              isActive ? tab.color : 'text-muted-foreground'
            )}
          >
            {isActive && (
              <span
                className={cn(
                  'absolute top-0 left-1/2 h-0.5 w-8 -translate-x-1/2 rounded-full',
                  tab.id === 'money' && 'bg-money',
                  tab.id === 'workout' && 'bg-workout',
                  tab.id === 'food' && 'bg-food',
                  tab.id === 'home' && 'bg-foreground'
                )}
              />
            )}
            <Icon className="h-5 w-5" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        )
      })}
    </nav>
  )
}
