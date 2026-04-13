'use client'

import { useState, useMemo, useEffect } from 'react'
import { Trash2, TrendingDown, TrendingUp, Minus, Smartphone, RefreshCw } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { BodyEntry, BodyGoal } from '@/lib/types'
import {
  getAvailability,
  requestAccess,
  type NativeHealthAvailability,
} from '@/lib/native-health'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface BodyTabProps {
  bodies: BodyEntry[]
  bodyGoal: BodyGoal
  onAddBody: (body: Omit<BodyEntry, 'id' | 'createdAt'>) => void
  onDeleteBody: (id: string) => void
  onSaveBodyGoal: (goal: BodyGoal) => void
  onSyncFromHealth?: () => Promise<number>
}

export function BodyTab({ bodies, bodyGoal, onAddBody, onDeleteBody, onSaveBodyGoal, onSyncFromHealth }: BodyTabProps) {
  const { t } = useI18n()
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
        setSyncMessage(t.common.permissionDenied)
        setSyncing(false)
        return
      }
      const count = await onSyncFromHealth()
      setSyncMessage(count === 0 ? t.common.noRecentData : t.common.syncedCount(count))
    } catch (err) {
      setSyncMessage(err instanceof Error ? t.common.syncFailedWith(err.message) : t.common.syncFailed)
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
            <h3 className="text-sm font-medium text-muted-foreground mb-2">{t.body.latestRecord}</h3>
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
            {/* 詳細指標 */}
            <div className="mt-3 grid grid-cols-2 gap-2">
              {trend.latest.bodyFat !== undefined && (
                <div className="rounded-md bg-secondary/60 p-2">
                  <p className="text-[10px] text-muted-foreground">{t.body.bodyFatLabel}</p>
                  <p className="text-sm font-bold text-foreground">{trend.latest.bodyFat.toFixed(1)}%</p>
                </div>
              )}
              {bodyGoal.height && (
                <div className="rounded-md bg-secondary/60 p-2">
                  <p className="text-[10px] text-muted-foreground">{t.body.bmi}</p>
                  <p className={cn('text-sm font-bold', (() => {
                    const bmi = trend.latest.weight / ((bodyGoal.height / 100) ** 2)
                    return bmi < 18.5 ? 'text-sleep' : bmi < 25 ? 'text-money' : 'text-destructive'
                  })())}>
                    {(trend.latest.weight / ((bodyGoal.height / 100) ** 2)).toFixed(1)}
                  </p>
                </div>
              )}
              {trend.latest.bodyFat !== undefined && (
                <div className="rounded-md bg-secondary/60 p-2">
                  <p className="text-[10px] text-muted-foreground">{t.body.leanBodyMass}</p>
                  <p className="text-sm font-bold text-foreground">
                    {(trend.latest.weight * (1 - trend.latest.bodyFat / 100)).toFixed(1)} kg
                  </p>
                </div>
              )}
              {bodyGoal.targetWeight && (
                <div className="rounded-md bg-secondary/60 p-2">
                  <p className="text-[10px] text-muted-foreground">{t.body.goalRemaining}</p>
                  <p className={cn('text-sm font-bold',
                    Math.abs(trend.latest.weight - bodyGoal.targetWeight) < 1 ? 'text-money' : 'text-foreground'
                  )}>
                    {trend.latest.weight > bodyGoal.targetWeight ? '-' : '+'}
                    {Math.abs(trend.latest.weight - bodyGoal.targetWeight).toFixed(1)} kg
                  </p>
                  <p className="text-[9px] text-muted-foreground">{t.body.targetWeight} {bodyGoal.targetWeight}kg</p>
                </div>
              )}
            </div>

            {/* 目標設定リンク */}
            <div className="mt-2 flex gap-2 text-[10px]">
              {!bodyGoal.height && (
                <button
                  type="button"
                  className="text-body underline"
                  onClick={() => {
                    const input = prompt(t.body.heightPrompt, '')
                    if (input) {
                      const h = parseFloat(input)
                      if (h > 0) onSaveBodyGoal({ ...bodyGoal, height: h })
                    }
                  }}
                >
                  身長を設定(BMI計算)
                </button>
              )}
              {!bodyGoal.targetWeight && (
                <button
                  type="button"
                  className="text-body underline"
                  onClick={() => {
                    const input = prompt(t.body.targetWeightPrompt, '')
                    if (input) {
                      const w = parseFloat(input)
                      if (w > 0) onSaveBodyGoal({ ...bodyGoal, targetWeight: w })
                    }
                  }}
                >
                  目標体重を設定
                </button>
              )}
            </div>
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
                  ? t.body.syncFromHealthIOS
                  : availability.platform === 'android'
                  ? t.body.syncFromHealthAndroid
                  : t.body.syncFromHealth}
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
                  {syncing ? t.sleep.syncing : t.body.syncButton}
                </Button>
                {syncMessage && (
                  <p className="mt-2 text-xs text-muted-foreground">{syncMessage}</p>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">
                {availability.platform === 'web'
                  ? t.body.nativeWebDesc
                  : availability.reason || t.common.notAvailable}
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {/* Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.common.manualRecord}</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.body.weight}</Label>
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
                <Label className="text-muted-foreground">{t.body.bodyFat}</Label>
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
                <Label className="text-muted-foreground">{t.body.muscleMass}</Label>
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
              <Label className="text-muted-foreground">{t.common.date}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.common.memo} ({t.common.optional})</Label>
              <Textarea
                placeholder={t.body.measureMemo}
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
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.body.recordHistory}</h3>
          {sortedBodies.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">{t.common.noRecords}</p>
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
                      {b.bodyFat !== undefined && <span>{t.body.bodyFatLabel} {b.bodyFat.toFixed(1)}%</span>}
                      {b.muscleMass !== undefined && <span>{t.body.muscleLabel} {b.muscleMass.toFixed(1)}kg</span>}
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
