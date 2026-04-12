'use client'

import { ChevronUp, ChevronDown, RotateCcw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import type { WidgetConfig } from '@/lib/widgets'
import { WIDGET_META, DEFAULT_WIDGET_CONFIG } from '@/lib/widgets'
import { getIconComponent } from '@/lib/tab-items'
import { useI18n } from '@/lib/i18n'
import { cn } from '@/lib/utils'

interface WidgetEditDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: WidgetConfig[]
  onChange: (config: WidgetConfig[]) => void
}

export function WidgetEditDialog({
  open,
  onOpenChange,
  config,
  onChange,
}: WidgetEditDialogProps) {
  const { locale } = useI18n()

  const toggle = (id: string) => {
    onChange(config.map(c => (c.id === id ? { ...c, visible: !c.visible } : c)))
  }

  const move = (index: number, direction: -1 | 1) => {
    const next = [...config]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    onChange(next)
  }

  const reset = () => onChange(DEFAULT_WIDGET_CONFIG)

  const visibleCount = config.filter(c => c.visible).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {locale === 'en' ? 'Edit Home Widgets' : 'ホームウィジェットの編集'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'en'
              ? 'Choose which widgets to show on Home and drag to reorder.'
              : 'ホーム画面に表示するウィジェットと順番を設定できます。'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {config.map((widget, i) => {
            const meta = WIDGET_META.find(m => m.id === widget.id)
            if (!meta) return null
            const Icon = getIconComponent(meta.icon)
            const label = locale === 'en' ? meta.labelEn : meta.label
            return (
              <div
                key={widget.id}
                className={cn(
                  'flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-2 transition-opacity',
                  !widget.visible && 'opacity-50'
                )}
              >
                <div className="flex flex-col">
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 disabled:opacity-30"
                    disabled={i === 0}
                    onClick={() => move(i, -1)}
                  >
                    <ChevronUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-5 w-5 disabled:opacity-30"
                    disabled={i === config.length - 1}
                    onClick={() => move(i, 1)}
                  >
                    <ChevronDown className="h-3.5 w-3.5" />
                  </Button>
                </div>
                <Icon className="h-5 w-5 shrink-0" style={{ color: meta.color }} />
                <span className="flex-1 text-sm font-medium text-foreground truncate">
                  {label}
                </span>
                <Switch
                  checked={widget.visible}
                  onCheckedChange={() => toggle(widget.id)}
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
            className="text-muted-foreground gap-1"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            {locale === 'en' ? 'Reset' : '初期状態に戻す'}
          </Button>
          <p className="text-xs text-muted-foreground">
            {visibleCount} / {config.length}
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
