'use client'

import { useState, useMemo } from 'react'
import { Trash2, Moon, Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SleepEntry } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SleepTabProps {
  sleeps: SleepEntry[]
  onAddSleep: (sleep: Omit<SleepEntry, 'id' | 'createdAt'>) => void
  onDeleteSleep: (id: string) => void
}

// 就寝・起床時刻から睡眠分数を計算 (日跨ぎ対応)
function calcDuration(bedtime: string, wakeTime: string): number {
  if (!bedtime || !wakeTime) return 0
  const [bh, bm] = bedtime.split(':').map(Number)
  const [wh, wm] = wakeTime.split(':').map(Number)
  let minutes = (wh * 60 + wm) - (bh * 60 + bm)
  if (minutes <= 0) minutes += 24 * 60 // 日跨ぎ
  return minutes
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${h}時間${m.toString().padStart(2, '0')}分`
}

export function SleepTab({ sleeps, onAddSleep, onDeleteSleep }: SleepTabProps) {
  const [bedtime, setBedtime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [memo, setMemo] = useState('')

  const duration = useMemo(() => calcDuration(bedtime, wakeTime), [bedtime, wakeTime])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!bedtime || !wakeTime) return

    onAddSleep({
      date,
      bedtime,
      wakeTime,
      duration,
      quality,
      memo,
    })

    setMemo('')
  }

  const sortedSleeps = [...sleeps].sort((a, b) => b.createdAt - a.createdAt)

  // 直近7日平均
  const last7Avg = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recent = sleeps.filter(s => new Date(s.date) >= sevenDaysAgo)
    if (recent.length === 0) return null
    const avgMin = recent.reduce((sum, s) => sum + s.duration, 0) / recent.length
    const avgQuality = recent.reduce((sum, s) => sum + s.quality, 0) / recent.length
    return { avgMin, avgQuality, count: recent.length }
  }, [sleeps])

  return (
    <div className="space-y-4">
      {/* 週次サマリー */}
      {last7Avg && (
        <Card className="bg-sleep/10 border-sleep/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Moon className="h-4 w-4 text-sleep" />
              <h3 className="text-sm font-medium text-muted-foreground">直近7日の平均</h3>
            </div>
            <div className="flex items-baseline justify-between">
              <p className="text-2xl font-bold text-sleep">
                {formatDuration(Math.round(last7Avg.avgMin))}
              </p>
              <p className="text-sm text-muted-foreground">
                質: {last7Avg.avgQuality.toFixed(1)} / 5 ({last7Avg.count}日)
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">就寝</Label>
                <Input
                  type="time"
                  value={bedtime}
                  onChange={(e) => setBedtime(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">起床</Label>
                <Input
                  type="time"
                  value={wakeTime}
                  onChange={(e) => setWakeTime(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>

            {/* ライブ計算表示 */}
            {duration > 0 && (
              <div className="rounded-lg bg-sleep/10 p-4 text-center animate-in fade-in-0 slide-in-from-top-2">
                <p className="text-xs text-muted-foreground">睡眠時間</p>
                <p className="text-2xl font-bold text-sleep">{formatDuration(duration)}</p>
              </div>
            )}

            {/* 質 */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">睡眠の質</Label>
              <div className="flex justify-between gap-2">
                {[1, 2, 3, 4, 5].map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => setQuality(q as 1 | 2 | 3 | 4 | 5)}
                    className={cn(
                      'flex-1 flex flex-col items-center gap-1 py-2 rounded-lg border transition-colors',
                      quality >= q
                        ? 'bg-sleep/20 border-sleep text-sleep'
                        : 'bg-secondary border-border text-muted-foreground'
                    )}
                  >
                    <Star className={cn('h-4 w-4', quality >= q && 'fill-sleep')} />
                    <span className="text-xs">{q}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* 日付 */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">日付 (起床日)</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {/* メモ */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">メモ (任意)</Label>
              <Textarea
                placeholder="目覚めの調子、夢、気になったことなど"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="bg-secondary border-border text-foreground resize-none"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-sleep hover:bg-sleep/90 text-background font-medium"
              disabled={!bedtime || !wakeTime || duration === 0}
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 履歴 */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">睡眠履歴</h3>
          {sortedSleeps.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">記録がありません</p>
          ) : (
            <div className="space-y-2">
              {sortedSleeps.map((s) => (
                <div key={s.id} className="rounded-lg bg-secondary/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{s.date}</span>
                      <span className="font-medium text-sleep">{formatDuration(s.duration)}</span>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteSleep(s.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="mt-2 flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-muted-foreground">
                      {s.bedtime} → {s.wakeTime}
                    </span>
                    <span className="flex items-center gap-0.5">
                      {Array.from({ length: s.quality }).map((_, i) => (
                        <Star key={i} className="h-3 w-3 fill-sleep text-sleep" />
                      ))}
                    </span>
                  </div>
                  {s.memo && (
                    <p className="mt-2 text-xs text-muted-foreground">{s.memo}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
