'use client'

import { useState, useMemo } from 'react'
import {
  Trash2,
  Plus,
  Timer,
  Flame,
  Route,
  HeartPulse,
  ChevronDown,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { ActivityEntry, ActivityType, ActivityIntensity } from '@/lib/types'
import {
  cardioPresets,
  stretchPresets,
  bodyPartOptions,
  type ActivityPreset,
} from '@/lib/activity-presets'
import { getIconComponent } from '@/lib/tab-items'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface ActivityTabProps {
  type: ActivityType
  entries: ActivityEntry[]
  onAdd: (entry: Omit<ActivityEntry, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
}

const intensityLabels: Record<ActivityIntensity, { label: string; color: string }> = {
  low: { label: '', color: '#22d3a0' },
  medium: { label: '', color: '#facc15' },
  high: { label: '', color: '#ef4444' },
}

// formatDuration moved to use t.activity.formatDuration

export function ActivityTab({ type, entries, onAdd, onDelete }: ActivityTabProps) {
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const presets = type === 'cardio' ? cardioPresets : stretchPresets
  const isCardio = type === 'cardio'

  // フォーム state
  const [selectedPreset, setSelectedPreset] = useState<ActivityPreset | null>(null)
  const [duration, setDuration] = useState('')
  const [distance, setDistance] = useState('')
  const [calories, setCalories] = useState('')
  const [heartRate, setHeartRate] = useState('')
  const [intensity, setIntensity] = useState<ActivityIntensity>('medium')
  const [selectedBodyParts, setSelectedBodyParts] = useState<Set<string>>(new Set())
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  // 今週の集計
  const weeklySummary = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recent = entries.filter(e => new Date(e.date) >= sevenDaysAgo)
    return {
      count: recent.length,
      totalMinutes: recent.reduce((s, e) => s + e.duration, 0),
      totalCalories: recent.reduce((s, e) => s + (e.calories || 0), 0),
      totalDistance: recent.reduce((s, e) => s + (e.distance || 0), 0),
    }
  }, [entries])

  const resetForm = () => {
    setSelectedPreset(null)
    setDuration('')
    setDistance('')
    setCalories('')
    setHeartRate('')
    setIntensity('medium')
    setSelectedBodyParts(new Set())
    setNotes('')
  }

  const handleSelectPreset = (preset: ActivityPreset) => {
    setSelectedPreset(preset)
    // カロリー自動推定 (duration が入力済みなら)
    if (duration && preset.defaultCaloriesPerMin) {
      setCalories(String(Math.round(parseFloat(duration) * preset.defaultCaloriesPerMin)))
    }
  }

  const handleDurationChange = (val: string) => {
    setDuration(val)
    // カロリー自動推定
    if (selectedPreset?.defaultCaloriesPerMin && val) {
      setCalories(String(Math.round(parseFloat(val) * selectedPreset.defaultCaloriesPerMin)))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPreset || !duration) return
    onAdd({
      type,
      activityName: selectedPreset.name,
      duration: parseFloat(duration),
      distance: distance ? parseFloat(distance) : undefined,
      calories: calories ? parseFloat(calories) : undefined,
      heartRate: heartRate ? parseFloat(heartRate) : undefined,
      bodyParts: selectedBodyParts.size > 0 ? Array.from(selectedBodyParts) : undefined,
      intensity,
      notes: notes || undefined,
      date,
    })
    resetForm()
    setDialogOpen(false)
  }

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [entries]
  )

  const toggleBodyPart = (part: string) => {
    setSelectedBodyParts(prev => {
      const next = new Set(prev)
      if (next.has(part)) next.delete(part)
      else next.add(part)
      return next
    })
  }

  return (
    <div className="space-y-4 pb-20 relative">
      {/* 週次サマリー */}
      <div className={cn('grid gap-2', isCardio ? 'grid-cols-4' : 'grid-cols-2')}>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">{t.activity.thisWeek}</p>
            <p className="text-sm font-bold text-foreground mt-1">{weeklySummary.count} 回</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <p className="text-[10px] text-muted-foreground">{t.activity.totalTime}</p>
            <p className="text-sm font-bold text-foreground mt-1">{t.activity.formatDuration(weeklySummary.totalMinutes)}</p>
          </CardContent>
        </Card>
        {isCardio && (
          <>
            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">{t.activity.distance}</p>
                <p className="text-sm font-bold text-foreground mt-1">{weeklySummary.totalDistance.toFixed(1)} km</p>
              </CardContent>
            </Card>
            <Card className="bg-card border-border">
              <CardContent className="p-3">
                <p className="text-[10px] text-muted-foreground">{t.activity.burned}</p>
                <p className="text-sm font-bold text-foreground mt-1">{weeklySummary.totalCalories} kcal</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      {/* 履歴 */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">
            {isCardio ? t.activity.cardioHistory : t.activity.stretchHistory}
          </h3>
          {sortedEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t.common.noRecords}
            </p>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map((entry) => {
                const preset = presets.find(p => p.name === entry.activityName)
                const Icon = getIconComponent(preset?.icon || 'Activity')
                const intInfo = entry.intensity ? intensityLabels[entry.intensity] : null
                return (
                  <div
                    key={entry.id}
                    className="group flex items-start gap-3 rounded-lg bg-secondary/40 p-3"
                  >
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-lg shrink-0 mt-0.5"
                      style={{ backgroundColor: isCardio ? '#f9731622' : '#60a5fa22' }}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: isCardio ? '#f97316' : '#60a5fa' }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">
                          {entry.activityName}
                        </span>
                        {intInfo && (
                          <span
                            className="text-[10px] font-medium rounded-full px-1.5 py-0"
                            style={{ color: intInfo.color, backgroundColor: intInfo.color + '22' }}
                          >
                            {[t.activity.intensityLow, t.activity.intensityMedium, t.activity.intensityHigh][['low','medium','high'].indexOf(entry.intensity || 'medium')]}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span>{entry.date}</span>
                        <span className="flex items-center gap-0.5">
                          <Timer className="h-3 w-3" />
                          {t.activity.formatDuration(entry.duration)}
                        </span>
                        {entry.distance && (
                          <span className="flex items-center gap-0.5">
                            <Route className="h-3 w-3" />
                            {entry.distance.toFixed(1)} km
                          </span>
                        )}
                        {entry.calories && (
                          <span className="flex items-center gap-0.5">
                            <Flame className="h-3 w-3" />
                            {entry.calories} kcal
                          </span>
                        )}
                        {entry.heartRate && (
                          <span className="flex items-center gap-0.5">
                            <HeartPulse className="h-3 w-3" />
                            {entry.heartRate} bpm
                          </span>
                        )}
                      </div>
                      {entry.bodyParts && entry.bodyParts.length > 0 && (
                        <div className="flex gap-1 mt-1 flex-wrap">
                          {entry.bodyParts.map(bp => (
                            <span key={bp} className="text-[10px] rounded-full bg-secondary px-1.5 py-0 text-muted-foreground">
                              {bp}
                            </span>
                          ))}
                        </div>
                      )}
                      {entry.notes && (
                        <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* FAB */}
      <Button
        type="button"
        size="icon"
        className={cn(
          'fixed bottom-20 right-4 h-14 w-14 rounded-full shadow-lg z-40 text-background',
          isCardio ? 'bg-workout hover:bg-workout/90' : 'bg-sleep hover:bg-sleep/90'
        )}
        onClick={() => {
          resetForm()
          setDialogOpen(true)
        }}
      >
        <Plus className="h-6 w-6" />
      </Button>

      {/* 入力ダイアログ */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {isCardio ? t.activity.recordCardio : t.activity.recordStretch}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 種目選択 */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.activity.exercise}</Label>
              <div className="grid grid-cols-3 gap-2">
                {presets.map((preset) => {
                  const Icon = getIconComponent(preset.icon)
                  const selected = selectedPreset?.name === preset.name
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={cn(
                        'flex flex-col items-center gap-1 p-2 rounded-lg border transition-colors',
                        selected
                          ? 'border-foreground bg-foreground/10'
                          : 'border-border bg-secondary/40 hover:bg-secondary'
                      )}
                    >
                      <Icon
                        className="h-4 w-4"
                        style={{ color: isCardio ? '#f97316' : '#60a5fa' }}
                      />
                      <span className="text-[10px] text-foreground truncate w-full text-center">
                        {preset.name}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 時間 */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.activity.duration}</Label>
              <div className="flex gap-2">
                {[10, 15, 20, 30, 45, 60].map(v => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => handleDurationChange(String(v))}
                    className={cn(
                      'flex-1 rounded-md border py-2 text-xs font-medium transition-colors',
                      duration === String(v)
                        ? isCardio ? 'bg-workout/20 border-workout text-workout' : 'bg-sleep/20 border-sleep text-sleep'
                        : 'bg-secondary border-border text-muted-foreground'
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
              <Input
                type="number"
                inputMode="numeric"
                placeholder={t.common.customValue}
                value={duration}
                onChange={(e) => handleDurationChange(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {/* 有酸素専用: 距離・カロリー・心拍 */}
            {isCardio && (
              <div className="grid grid-cols-3 gap-2">
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.activity.distanceKm}</Label>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step="0.1"
                    placeholder={t.common.optional}
                    value={distance}
                    onChange={(e) => setDistance(e.target.value)}
                    className="bg-secondary border-border text-foreground text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.activity.calories}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={t.activity.autoEstimate}
                    value={calories}
                    onChange={(e) => setCalories(e.target.value)}
                    className="bg-secondary border-border text-foreground text-sm"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-muted-foreground text-xs">{t.activity.heartRate}</Label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    placeholder={t.common.optional}
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="bg-secondary border-border text-foreground text-sm"
                  />
                </div>
              </div>
            )}

            {/* ストレッチ専用: 部位選択 */}
            {!isCardio && (
              <div className="space-y-2">
                <Label className="text-muted-foreground">{t.activity.bodyParts}</Label>
                <div className="flex flex-wrap gap-1">
                  {bodyPartOptions.map(bp => (
                    <button
                      key={bp}
                      type="button"
                      onClick={() => toggleBodyPart(bp)}
                      className={cn(
                        'rounded-full border px-2.5 py-1 text-xs transition-colors',
                        selectedBodyParts.has(bp)
                          ? 'bg-sleep/20 border-sleep text-sleep'
                          : 'bg-secondary border-border text-muted-foreground'
                      )}
                    >
                      {bp}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 強度 */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.activity.intensity}</Label>
              <div className="grid grid-cols-3 gap-2">
                {(['low', 'medium', 'high'] as ActivityIntensity[]).map(level => {
                  const info = intensityLabels[level]
                  return (
                    <button
                      key={level}
                      type="button"
                      onClick={() => setIntensity(level)}
                      className={cn(
                        'rounded-md border py-2 text-xs font-medium transition-colors',
                        intensity === level
                          ? 'border-foreground bg-foreground/10 text-foreground'
                          : 'bg-secondary border-border text-muted-foreground'
                      )}
                    >
                      <span style={{ color: info.color }}>{level === 'low' ? t.activity.intensityLow : level === 'medium' ? t.activity.intensityMedium : t.activity.intensityHigh}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 日付 */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.common.date}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {/* メモ */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.activity.memoOptional}</Label>
              <Textarea
                placeholder={t.activity.memoPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-secondary border-border text-foreground resize-none"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className={cn(
                'w-full font-medium text-background',
                isCardio ? 'bg-workout hover:bg-workout/90' : 'bg-sleep hover:bg-sleep/90'
              )}
              disabled={!selectedPreset || !duration}
            >
              記録する
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
