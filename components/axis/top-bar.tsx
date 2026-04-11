'use client'

import { Search, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface TopBarProps {
  onSearchClick: () => void
  onAddClick: () => void
  onSettingsClick: () => void
}

export function TopBar({ onSearchClick, onAddClick, onSettingsClick }: TopBarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between bg-background/95 px-4 backdrop-blur-sm border-b border-border">
      <h1 className="text-xl font-bold tracking-tight text-foreground">AXIS</h1>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchClick}
          className="text-muted-foreground hover:text-foreground"
        >
          <Search className="h-5 w-5" />
          <span className="sr-only">Search</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddClick}
          className="text-muted-foreground hover:text-foreground"
        >
          <Plus className="h-5 w-5" />
          <span className="sr-only">Add</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="text-muted-foreground hover:text-foreground"
        >
          <Settings className="h-5 w-5" />
          <span className="sr-only">Settings</span>
        </Button>
      </div>
    </header>
  )
}
