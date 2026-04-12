'use client'

import { useState, useMemo, useEffect } from 'react'
import { Trash2, TrendingDown, TrendingUp, Minus, Smartphone, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BodyEntry } from '@/lib/types'
import {
  getAvailability,
  requestAccess,
  type NativeHealthAvailability,
} from '@/lib/native-health'
import { cn } from '@/lib/utils'

interface BodyTabProps {
  bodies: BodyEntry[]
  onAddBody: (body: Omit<BodyEntry, 'id' | 'createdAt'>) => void
  onDeleteBody: (id: string) => void
  onSyncFromHealth?: () => Promise<number>
}

export function BodyTab({ bodies, onAddBody, onDeleteBody, onSyncFromHealth }: BodyTabProps) {
  const [weight, setWeight] = useState('')
  const [bodyFat, setBodyFat] = useState('')
  const [muscleMass, setMuscleMass] = useState('')
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

  const handleSync = async () => {
    if (!onSyncFromHealth) return
    setSyncing(true)
    setSyncMessage(null)
    try {
      const ok = await requestAccess(['weight', 'bodyFat'])
      if (!ok) {
        setSyncMessage('権限が許可されませんでした')
        setSyncing(false)
        return
      }
      const count = await onSyncFromHealth()
      setSyncMessage(count === 0 ? '直近のデータはありません' : `${count}件を同期しました`)
    } catch (err) {
      setSyncMessage(err instanceof Error ? `同期失敗: ${err.message}` : '同期失敗')
    } finally {
      setSyncing(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const w = parseFloat(weight)
    if (!w || isNaN(w)) return

    onAddBody({
      date,
      weight: w,
      bodyFat: bodyFat ? parseFloat(bodyFat) : undefined,
      muscleMass: muscleMass ? parseFloat(muscleMass) : undefined,
      memo,
      source: 'manual',
    })

    setWeight('')
    setBodyFat('')
    setMuscleMass('')
    setMemo('')
  }

  const sortedBodies = useMemo(
    () => [...bodies].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [bodies]
  )

  // 最新 vs 7日前の差分
  const trend = useMemo(() => {
    if (bodies.length === 0) return null
    const sorted = [...bodies].sort((a, b) => a.date.localeCompare(b.date))
    const latest = sorted[sorted.length - 1]
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const past = [...sorted].reverse().find(b => new Date(b.date) <= sevenDaysAgo)
    if (!past) return { latest, diff: null }
    return { latest, diff: latest.weight - past.weight }
  }, [bodies])

  return (
    <div className="space-y-4">
      {/* 現在値サマリー */}
      {trend && (
        <Card className="bg-body/10 border-body/20">
          <CardContent className="p-4">
            <h3 className="text-sm font-medium text-muted-foreground mb-2">最新の記録</h3>
            <div className="flex items-baseline justify-between">
              <p className="text-3xl font-bold text-body">
                {trend.latest.weight.toFixed(1)}
                <span className="text-base text-muted-foreground ml-1">kg</span>
              </p>
              {trend.diff !== null && (
                <div
                  className={cn(
                    'flex items-center gap-1 text-sm',
                    trend.diff < 0 && 'text-money',
                    trend.diff > 0 && 'text-workout',
                    trend.diff === 0 && 'text-muted-foreground'
                  )}
                >
                  {trend.diff < 0 ? (
                    <TrendingDown className="h-4 w-4" />
                  ) : trend.diff > 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <Minus className="h-4 w-4" />
                  )}
                  <span>
                    {trend.diff > 0 ? '+' : ''}
                    {trend.diff.toFixed(1)} kg / 7日
                  </span>
                </div>
              )}
            </div>
            {(trend.latest.bodyFat !== undefined || trend.latest.muscleMass !== undefined) && (
              <div className="mt-2 flex gap-4 text-xs text-muted-foreground">
                {trend.latest.bodyFat !== undefined && (
                  <span>体脂肪率: {trend.latest.bodyFat.toFixed(1)}%</span>
                )}
                {trend.latest.muscleMass !== undefined && (
                  <span>筋肉量: {trend.latest.muscleMass.toFixed(1)}kg</span>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ネイティブヘルス同期 */}
      {availability && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Smartphone
                className="h-4 w-4"
                style={{ color: availability.available ? '#ec4899' : undefined }}
              />
              <h3 className="text-sm font-medium text-muted-foreground">
                {availability.platform === 'ios'
                  ? 'ヘルスケアから同期'
                  : availability.platform === 'android'
                  ? 'Health Connectから同期'
                  : 'スマート体組成計から取得'}
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
                  {syncing ? '同期中...' : '体重・体脂肪を取得'}
                </Button>
                {syncMessage && (
                  <p className="mt-2 text-xs text-muted-foreground">{syncMessage}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {availability.platform === 'web'
                  ? 'この機能はネイティブアプリでのみ利用できます。Withings/Tanita 等のスマート体組成計が書き込んだデータを取り込めます。'
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
            <div className="space-y-2">
              <Label className="text-muted-foreground">体重 (kg)</Label>
              <Input
                type="number"
                inputMode="decimal"
                step="0.1"
                placeholder="65.0"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">体脂肪率 (%)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="任意"
                  value={bodyFat}
                  onChange={(e) => setBodyFat(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">筋肉量 (kg)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  placeholder="任意"
                  value={muscleMass}
                  onChange={(e) => setMuscleMass(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">日付</Label>
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
                placeholder="計測タイミング、体調など"
                value={memo}
                onChange={(e) => setMemo(e.target.value)}
                className="bg-secondary border-border text-foreground resize-none"
                rows={2}
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-body hover:bg-body/90 text-background font-medium"
              disabled={!weight}
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 履歴 */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">記録履歴</h3>
          {sortedBodies.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">記録がありません</p>
          ) : (
            <div className="space-y-2">
              {sortedBodies.map((b) => (
                <div key={b.id} className="rounded-lg bg-secondary/50 p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{b.date}</span>
                      <span className="font-medium text-body">{b.weight.toFixed(1)} kg</span>
                      {b.source === 'health' && (
                        <span className="rounded-full bg-body/20 px-2 py-0.5 text-[10px] text-body">
                          auto
                        </span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => onDeleteBody(b.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  {(b.bodyFat !== undefined || b.muscleMass !== undefined || b.memo) && (
                    <div className="mt-2 flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
                      {b.bodyFat !== undefined && <span>体脂肪 {b.bodyFat.toFixed(1)}%</span>}
                      {b.muscleMass !== undefined && <span>筋肉 {b.muscleMass.toFixed(1)}kg</span>}
                      {b.memo && <span className="w-full mt-1">{b.memo}</span>}
                    </div>
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
