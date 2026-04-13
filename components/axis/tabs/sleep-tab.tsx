'use client'

import { useState, useMemo, useEffect } from 'react'
import { Trash2, Moon, Star, Smartphone, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { SleepEntry } from '@/lib/types'
import {
  getAvailability,
  requestAccess,
  type NativeHealthAvailability,
} from '@/lib/native-health'
import { scoreLabel } from '@/lib/sleep-score'
import type { SleepGoal } from '@/lib/types'
import { cn } from '@/lib/utils'

interface SleepTabProps {
  sleeps: SleepEntry[]
  sleepGoal: SleepGoal
  onAddSleep: (sleep: Omit<SleepEntry, 'id' | 'createdAt'>) => void
  onDeleteSleep: (id: string) => void
  onSaveSleepGoal: (goal: SleepGoal) => void
  onSyncFromHealth?: () => Promise<number>
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

// 睡眠ステージを積み上げバーで表示
function StageBar({ sleep }: { sleep: SleepEntry }) {
  if (!sleep.stages) return null
  const { deepMinutes, lightMinutes, remMinutes, awakeMinutes } = sleep.stages
  const total = deepMinutes + lightMinutes + remMinutes + awakeMinutes
  if (total === 0) return null
  const deepPct = (deepMinutes / total) * 100
  const lightPct = (lightMinutes / total) * 100
  const remPct = (remMinutes / total) * 100
  const awakePct = (awakeMinutes / total) * 100
  return (
    <div className="space-y-1">
      <div className="flex h-3 overflow-hidden rounded-full bg-secondary">
        <div style={{ width: `${deepPct}%`, backgroundColor: '#1e40af' }} title="深い" />
        <div style={{ width: `${lightPct}%`, backgroundColor: '#60a5fa' }} title="浅い" />
        <div style={{ width: `${remPct}%`, backgroundColor: '#a78bfa' }} title="レム" />
        <div style={{ width: `${awakePct}%`, backgroundColor: '#71717a' }} title="覚醒" />
      </div>
      <div className="flex justify-between text-[10px] text-muted-foreground">
        <span>深 {Math.round(deepMinutes)}分</span>
        <span>浅 {Math.round(lightMinutes)}分</span>
        <span>REM {Math.round(remMinutes)}分</span>
        <span>覚醒 {Math.round(awakeMinutes)}分</span>
      </div>
    </div>
  )
}

export function SleepTab({
  sleeps,
  sleepGoal,
  onAddSleep,
  onDeleteSleep,
  onSaveSleepGoal,
  onSyncFromHealth,
}: SleepTabProps) {
  const [bedtime, setBedtime] = useState('23:00')
  const [wakeTime, setWakeTime] = useState('07:00')
  const [quality, setQuality] = useState<1 | 2 | 3 | 4 | 5>(3)
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [memo, setMemo] = useState('')
  const [availability, setAvailability] = useState<NativeHealthAvailability | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncMessage, setSyncMessage] = useState<string | null>(null)

  useEffect(() => {
    getAvailability()
      .then(setAvailability)
      .catch(() => setAvailability({ available: false, platform: 'web' }))
  }, [])

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
      source: 'manual',
    })

    setMemo('')
  }

  const handleSync = async () => {
    if (!onSyncFromHealth) return
    setSyncing(true)
    setSyncMessage(null)
    try {
      const ok = await requestAccess(['sleep'])
      if (!ok) {
        setSyncMessage('権限が許可されませんでした')
        setSyncing(false)
        return
      }
      const count = await onSyncFromHealth()
      setSyncMessage(
        count === 0 ? '直近7日間のデータはありません' : `${count}晩分を同期しました`
      )
    } catch (err) {
      setSyncMessage(err instanceof Error ? `同期失敗: ${err.message}` : '同期失敗')
    } finally {
      setSyncing(false)
    }
  }

  const sortedSleeps = [...sleeps].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt)

  // 直近7日平均 + 睡眠負債 + 規則性
  const last7Avg = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recent = sleeps.filter(s => new Date(s.date) >= sevenDaysAgo)
    if (recent.length === 0) return null
    const avgMin = recent.reduce((sum, s) => sum + s.duration, 0) / recent.length
    const scores = recent.filter(s => s.autoScore !== undefined).map(s => s.autoScore as number)
    const avgScore =
      scores.length > 0 ? scores.reduce((s, v) => s + v, 0) / scores.length : null
    const manualQualities = recent.filter(s => s.source === 'manual').map(s => s.quality)
    const avgManual =
      manualQualities.length > 0
        ? manualQualities.reduce((s, v) => s + v, 0) / manualQualities.length
        : null

    // 睡眠負債 (目標時間 - 実際の時間の累積差分)
    const targetMin = sleepGoal.targetHours * 60
    const debtMin = recent.reduce((debt, s) => debt + (targetMin - s.duration), 0)

    // 就寝時刻の規則性 (標準偏差、分)
    const bedtimeMinutes = recent
      .filter(s => s.bedtime)
      .map(s => {
        const [h, m] = s.bedtime.split(':').map(Number)
        let mins = h * 60 + m
        if (mins < 720) mins += 1440 // 午後12時前は翌日扱い
        return mins
      })
    let bedtimeStdDev: number | null = null
    if (bedtimeMinutes.length >= 3) {
      const mean = bedtimeMinutes.reduce((s, v) => s + v, 0) / bedtimeMinutes.length
      const variance = bedtimeMinutes.reduce((s, v) => s + (v - mean) ** 2, 0) / bedtimeMinutes.length
      bedtimeStdDev = Math.sqrt(variance)
    }

    return { avgMin, avgScore, avgManual, count: recent.length, debtMin, bedtimeStdDev }
  }, [sleeps, sleepGoal.targetHours])

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
              <div className="text-right text-sm text-muted-foreground">
                {last7Avg.avgScore !== null && (
                  <p>スコア: {Math.round(last7Avg.avgScore)} / 100</p>
                )}
                {last7Avg.avgManual !== null && (
                  <p>質: {last7Avg.avgManual.toFixed(1)} / 5</p>
                )}
                <p>({last7Avg.count}日)</p>
              </div>
            </div>

            {/* 睡眠負債 + 規則性 */}
            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-md bg-secondary/60 p-2">
                <p className="text-[10px] text-muted-foreground">睡眠負債 (7日)</p>
                <p className={cn(
                  'text-sm font-bold',
                  last7Avg.debtMin > 0 ? 'text-destructive' : 'text-money'
                )}>
                  {last7Avg.debtMin > 0 ? '+' : ''}{formatDuration(Math.abs(Math.round(last7Avg.debtMin)))}
                </p>
                <p className="text-[9px] text-muted-foreground">
                  目標 {sleepGoal.targetHours}h
                  <button
                    type="button"
                    className="ml-1 text-sleep underline"
                    onClick={() => {
                      const input = prompt('目標睡眠時間（時間）', String(sleepGoal.targetHours))
                      if (input) {
                        const h = parseFloat(input)
                        if (h > 0 && h <= 24) onSaveSleepGoal({ targetHours: h })
                      }
                    }}
                  >
                    変更
                  </button>
                </p>
              </div>
              <div className="rounded-md bg-secondary/60 p-2">
                <p className="text-[10px] text-muted-foreground">就寝の規則性</p>
                {last7Avg.bedtimeStdDev !== null ? (
                  <>
                    <p className={cn(
                      'text-sm font-bold',
                      last7Avg.bedtimeStdDev < 30 ? 'text-money' : last7Avg.bedtimeStdDev < 60 ? 'text-foreground' : 'text-destructive'
                    )}>
                      {last7Avg.bedtimeStdDev < 30 ? '安定' : last7Avg.bedtimeStdDev < 60 ? 'やや不規則' : '不規則'}
                    </p>
                    <p className="text-[9px] text-muted-foreground">
                      ばらつき {Math.round(last7Avg.bedtimeStdDev)}分
                    </p>
                  </>
                ) : (
                  <p className="text-xs text-muted-foreground">データ不足</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ネイティブヘルス同期カード */}
      {availability && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone
                className="h-4 w-4"
                style={{ color: availability.available ? '#60a5fa' : undefined }}
              />
              <h3 className="text-sm font-medium text-muted-foreground">
                {availability.platform === 'ios'
                  ? 'ヘルスケアから同期'
                  : availability.platform === 'android'
                  ? 'Health Connectから同期'
                  : 'ウェアラブルから自動取得'}
              </h3>
            </div>
            {availability.available && onSyncFromHealth ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full gap-2"
                  disabled={syncing}
                  onClick={handleSync}
                >
                  <RefreshCw className={cn('h-4 w-4', syncing && 'animate-spin')} />
                  {syncing ? '同期中...' : '直近7日分を取得'}
                </Button>
                {syncMessage && (
                  <p className="mt-2 text-xs text-muted-foreground">{syncMessage}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Apple Watch / Fitbit / Oura / Garmin などが計測した睡眠データを取り込み、
                  Fitbit形式のスコア (0-100) で質を自動判定します。
                </p>
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {availability.platform === 'web'
                  ? 'この機能はネイティブアプリでのみ利用できます。スマートウォッチが計測した睡眠ステージ (深い/浅い/レム/覚醒) を取り込み、Fitbit形式のスコアを自動算出します。'
                  : availability.reason || '利用できません'}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">手動で記録</h3>
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

            {duration > 0 && (
              <div className="rounded-lg bg-sleep/10 p-4 text-center animate-in fade-in-0 slide-in-from-top-2">
                <p className="text-xs text-muted-foreground">睡眠時間</p>
                <p className="text-2xl font-bold text-sleep">{formatDuration(duration)}</p>
              </div>
            )}

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

            <div className="space-y-2">
              <Label className="text-muted-foreground">日付 (起床日)</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

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
            <div className="space-y-3">
              {sortedSleeps.map((s) => {
                const isAuto = s.source === 'health' && s.autoScore !== undefined
                const scoreInfo = isAuto && s.autoScore !== undefined ? scoreLabel(s.autoScore) : null
                return (
                  <div key={s.id} className="rounded-lg bg-secondary/50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">{s.date}</span>
                        <span className="font-medium text-sleep">
                          {formatDuration(s.duration)}
                        </span>
                        {isAuto && (
                          <span className="rounded-full bg-sleep/20 px-2 py-0.5 text-[10px] text-sleep">
                            auto
                          </span>
                        )}
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
                    <div className="flex items-center gap-3 flex-wrap text-xs">
                      <span className="text-muted-foreground">
                        {s.bedtime} → {s.wakeTime}
                      </span>
                      {isAuto && s.autoScore !== undefined && scoreInfo ? (
                        <span
                          className="font-semibold"
                          style={{ color: scoreInfo.color }}
                        >
                          スコア {s.autoScore} · {scoreInfo.label}
                        </span>
                      ) : (
                        <span className="flex items-center gap-0.5">
                          {Array.from({ length: s.quality }).map((_, i) => (
                            <Star key={i} className="h-3 w-3 fill-sleep text-sleep" />
                          ))}
                        </span>
                      )}
                    </div>
                    {s.stages && <StageBar sleep={s} />}
                    {s.memo && (
                      <p className="text-xs text-muted-foreground">{s.memo}</p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
