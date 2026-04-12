'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  requestPermission,
  isPermissionGranted,
  isNotificationSupported,
  type ReminderConfig,
} from '@/lib/notifications'
import { useI18n } from '@/lib/i18n'

interface ReminderSettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  config: ReminderConfig
  onSave: (config: ReminderConfig) => void
}

export function ReminderSettingsDialog({
  open,
  onOpenChange,
  config,
  onSave,
}: ReminderSettingsDialogProps) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<ReminderConfig>(config)
  const [permissionGranted, setPermissionGranted] = useState(false)
  const supported = isNotificationSupported()

  useEffect(() => {
    if (open) {
      setDraft(config)
      setPermissionGranted(isPermissionGranted())
    }
  }, [open, config])

  const handleRequestPermission = async () => {
    const ok = await requestPermission()
    setPermissionGranted(ok)
  }

  const handleSave = () => {
    onSave(draft)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5" />
            {t.notifications.title}
          </DialogTitle>
          <DialogDescription>
            {t.notifications.desc}
          </DialogDescription>
        </DialogHeader>

        {!supported ? (
          <p className="text-sm text-muted-foreground py-4 text-center">
            この環境では通知がサポートされていません。
          </p>
        ) : !permissionGranted ? (
          <div className="space-y-3 py-4">
            <div className="flex items-center gap-3 rounded-lg bg-secondary/40 p-4">
              <BellOff className="h-5 w-5 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium text-foreground">
                  {t.notifications.permissionDenied}
                </p>
              </div>
            </div>
            <Button
              type="button"
              className="w-full"
              onClick={handleRequestPermission}
            >
              通知を許可する
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* 毎日のリマインダー */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t.notifications.dailyReminder}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t.notifications.dailyReminderDesc}
                </p>
              </div>
              <Switch
                checked={draft.dailyReminder}
                onCheckedChange={(checked) =>
                  setDraft(prev => ({ ...prev, dailyReminder: checked }))
                }
              />
            </div>

            {draft.dailyReminder && (
              <div className="space-y-2 pl-4 animate-in fade-in-0 slide-in-from-top-1">
                <Label className="text-muted-foreground text-xs">
                  {t.notifications.time}
                </Label>
                <Input
                  type="time"
                  value={draft.dailyReminderTime}
                  onChange={(e) =>
                    setDraft(prev => ({ ...prev, dailyReminderTime: e.target.value }))
                  }
                  className="bg-secondary border-border text-foreground w-32"
                />
              </div>
            )}

            {/* 目標達成通知 */}
            <div className="flex items-center justify-between rounded-lg border border-border bg-secondary/40 p-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">
                  {t.notifications.goalAlert}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {t.notifications.goalAlertDesc}
                </p>
              </div>
              <Switch
                checked={draft.goalAlert}
                onCheckedChange={(checked) =>
                  setDraft(prev => ({ ...prev, goalAlert: checked }))
                }
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => onOpenChange(false)}
              >
                {t.common.cancel}
              </Button>
              <Button type="button" className="flex-1" onClick={handleSave}>
                {t.common.save}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
