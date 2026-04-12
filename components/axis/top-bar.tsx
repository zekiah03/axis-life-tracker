'use client'

import { Search, Plus, Settings, Bell, Globe } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useI18n, type Locale } from '@/lib/i18n'

interface TopBarProps {
  onSearchClick: () => void
  onAddClick: () => void
  onSettingsClick: () => void
  onReminderClick: () => void
}

export function TopBar({ onSearchClick, onAddClick, onSettingsClick, onReminderClick }: TopBarProps) {
  const { locale, setLocale, t } = useI18n()

  const toggleLocale = () => {
    const next: Locale = locale === 'ja' ? 'en' : 'ja'
    setLocale(next)
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex h-14 items-center justify-between bg-background/95 px-4 backdrop-blur-sm border-b border-border">
      <h1 className="text-xl font-bold tracking-tight text-foreground">{t.app.title}</h1>
      <div className="flex items-center gap-1">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleLocale}
          className="text-muted-foreground hover:text-foreground h-9 w-9"
          title={t.language.title}
        >
          <Globe className="h-4 w-4" />
          <span className="sr-only">{t.language.title}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSearchClick}
          className="text-muted-foreground hover:text-foreground h-9 w-9"
        >
          <Search className="h-4 w-4" />
          <span className="sr-only">{t.common.search}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onReminderClick}
          className="text-muted-foreground hover:text-foreground h-9 w-9"
        >
          <Bell className="h-4 w-4" />
          <span className="sr-only">{t.notifications.title}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onAddClick}
          className="text-muted-foreground hover:text-foreground h-9 w-9"
        >
          <Plus className="h-4 w-4" />
          <span className="sr-only">{t.common.add}</span>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSettingsClick}
          className="text-muted-foreground hover:text-foreground h-9 w-9"
        >
          <Settings className="h-4 w-4" />
          <span className="sr-only">{t.common.settings}</span>
        </Button>
      </div>
    </header>
  )
}
