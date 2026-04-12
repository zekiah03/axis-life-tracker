'use client'

import { useState, useMemo } from 'react'
import {
  BookOpen,
  Book,
  Sparkles,
  Smartphone,
  Plus,
  Trash2,
  Target,
  Flame,
  Settings2,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import type { HabitEntry, HabitGoal, HabitType } from '@/lib/types'
import { cn } from '@/lib/utils'

interface HabitsTabProps {
  entries: HabitEntry[]
  goals: HabitGoal[]
  onAdd: (entry: Omit<HabitEntry, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
  onSaveGoals: (goals: HabitGoal[]) => void
  singleHabitMode?: HabitType // 指定すると1種類だけ表示
}

interface HabitMeta {
  type: HabitType
  label: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  defaultUnit: string
  subjectLabel?: string
  subjectPlaceholder?: string
  quickValues: number[]
}

const habitMetas: HabitMeta[] = [
  {
    type: 'study',
    label: '勉強',
    icon: BookOpen,
    color: '#a78bfa',
    defaultUnit: '分',
    subjectLabel: '科目',
    subjectPlaceholder: '例: 数学, 英語, プログラミング',
    quickValues: [15, 30, 45, 60, 90, 120],
  },
  {
    type: 'reading',
    label: '読書',
    icon: Book,
    color: '#60a5fa',
    defaultUnit: 'ページ',
    subjectLabel: 'タイトル',
    subjectPlaceholder: '例: アトミック・ハビッツ',
    quickValues: [10, 20, 30, 50, 100],
  },
  {
    type: 'meditation',
    label: '瞑想',
    icon: Sparkles,
    color: '#22d3a0',
    defaultUnit: '分',
    subjectLabel: '種類',
    subjectPlaceholder: '例: 呼吸法, ボディスキャン, 歩行瞑想',
    quickValues: [5, 10, 15, 20, 30],
  },
  {
    type: 'screentime',
    label: 'スクリーンタイム',
    icon: Smartphone,
    color: '#71717a',
    defaultUnit: '時間',
    quickValues: [1, 2, 3, 4, 5, 6],
  },
]

function getHabitMeta(type: HabitType): HabitMeta {
  return habitMetas.find(m => m.type === type) || habitMetas[0]
}

export function HabitsTab({ entries, goals, onAdd, onDelete, onSaveGoals, singleHabitMode }: HabitsTabProps) {
  const visibleMetas = singleHabitMode
    ? habitMetas.filter(m => m.type === singleHabitMode)
    : habitMetas
  const [selectedHabit, setSelectedHabit] = useState<HabitMeta | null>(null)
  const [value, setValue] = useState('')
  const [subject, setSubject] = useState('')
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [goalDialogOpen, setGoalDialogOpen] = useState(false)
  const [goalDrafts, setGoalDrafts] = useState<Record<string, string>>({})

  const today = new Date().toISOString().split('T')[0]

  // 今日の習慣ごとの合計
  const todaySummary = useMemo(() => {
    const todayEntries = entries.filter(e => e.date === today)
    const map = new Map<HabitType, number>()
    for (const e of todayEntries) {
      map.set(e.habitType, (map.get(e.habitType) || 0) + e.value)
    }
    return map
  }, [entries, today])

  // 今週のストリーク (7日中何日記録があるか)
  const weeklyStats = useMemo(() => {
    const result = new Map<HabitType, { days: number; total: number }>()
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recent = entries.filter(e => new Date(e.date) >= sevenDaysAgo)

    for (const meta of habitMetas) {
      const typeEntries = recent.filter(e => e.habitType === meta.type)
      const uniqueDays = new Set(typeEntries.map(e => e.date)).size
      const total = typeEntries.reduce((s, e) => s + e.value, 0)
      result.set(meta.type, { days: uniqueDays, total })
    }
    return result
  }, [entries])

  // 目標のマップ
  const goalMap = useMemo(() => {
    const map = new Map<HabitType, number>()
    for (const g of goals) map.set(g.habitType, g.target)
    return map
  }, [goals])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedHabit || !value) return
    onAdd({
      habitType: selectedHabit.type,
      value: parseFloat(value),
      unit: selectedHabit.defaultUnit,
      subject: subject || undefined,
      notes: notes || undefined,
      date,
    })
    setValue('')
    setSubject('')
    setNotes('')
    setSelectedHabit(null)
  }

  const handleSaveGoals = () => {
    const newGoals: HabitGoal[] = visibleMetas
      .map(meta => {
        const raw = goalDrafts[meta.type]
        const val = raw !== undefined ? parseFloat(raw) : goalMap.get(meta.type)
        if (!val || val <= 0) return null
        return { habitType: meta.type, target: val, unit: meta.defaultUnit }
      })
      .filter((g): g is HabitGoal => g !== null)
    onSaveGoals(newGoals)
    setGoalDialogOpen(false)
    setGoalDrafts({})
  }

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [entries]
  )

  return (
    <div className="space-y-4">
      {/* 今日のサマリーカード (4習慣を横並び) */}
      <div className={cn('grid gap-2', singleHabitMode ? 'grid-cols-1' : 'grid-cols-2')}>
        {visibleMetas.map((meta) => {
          const Icon = meta.icon
          const todayVal = todaySummary.get(meta.type) || 0
          const goal = goalMap.get(meta.type)
          const pct = goal ? Math.min(100, (todayVal / goal) * 100) : null
          const week = weeklyStats.get(meta.type)
          return (
            <button
              key={meta.type}
              type="button"
              onClick={() => {
                setSelectedHabit(meta)
                setValue('')
                setSubject('')
                setNotes('')
                setDate(today)
              }}
              className="rounded-lg border border-border bg-card p-3 text-left hover:bg-secondary/50 transition-colors"
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" style={{ color: meta.color }} />
                <span className="text-xs font-medium text-foreground">{meta.label}</span>
              </div>
              <p className="text-xl font-bold" style={{ color: meta.color }}>
                {meta.type === 'screentime' && todayVal > 0
                  ? todayVal.toFixed(1)
                  : Math.round(todayVal)}
                <span className="text-[10px] text-muted-foreground ml-1">{meta.defaultUnit}</span>
              </p>
              {goal && (
                <>
                  <p className="text-[10px] text-muted-foreground">/ {goal} {meta.defaultUnit}</p>
                  <div className="mt-1.5 h-1 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${pct}%`, backgroundColor: meta.color }}
                    />
                  </div>
                </>
              )}
              {week && week.days > 0 && (
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Flame className="h-3 w-3" style={{ color: week.days >= 5 ? meta.color : undefined }} />
                  {week.days}/7日
                </div>
              )}
            </button>
          )
        })}
      </div>

      {/* 目標設定ボタン */}
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="gap-1 text-xs"
        onClick={() => {
          setGoalDrafts({})
          setGoalDialogOpen(true)
        }}
      >
        <Target className="h-3.5 w-3.5" />
        目標を設定
      </Button>

      {/* 入力ダイアログ */}
      <Dialog open={selectedHabit !== null} onOpenChange={(open) => !open && setSelectedHabit(null)}>
        {selectedHabit && (
          <DialogContent className="max-w-[420px] max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {(() => { const Icon = selectedHabit.icon; return <Icon className="h-5 w-5" style={{ color: selectedHabit.color }} /> })()}
                {selectedHabit.label}を記録
              </DialogTitle>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* クイック入力ボタン */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">
                  {selectedHabit.defaultUnit === 'ページ' ? 'ページ数' : `時間 (${selectedHabit.defaultUnit})`}
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {selectedHabit.quickValues.map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setValue(String(v))}
                      className={cn(
                        'rounded-md border px-3 py-2 text-sm font-medium transition-colors',
                        value === String(v)
                          ? 'border-foreground bg-foreground/10 text-foreground'
                          : 'bg-secondary border-border text-muted-foreground'
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="カスタム値"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>

              {/* 科目/タイトル (任意) */}
              {selectedHabit.subjectLabel && (
                <div className="space-y-2">
                  <Label className="text-muted-foreground">{selectedHabit.subjectLabel} (任意)</Label>
                  <Input
                    type="text"
                    placeholder={selectedHabit.subjectPlaceholder}
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="bg-secondary border-border text-foreground"
                  />
                </div>
              )}

              {/* メモ */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">メモ (任意)</Label>
                <Input
                  type="text"
                  placeholder="気づき、内容など"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>

              {/* 日付 */}
              <div className="space-y-2">
                <Label className="text-muted-foreground">日付</Label>
                <Input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>

              <Button
                type="submit"
                className="w-full font-medium text-background"
                style={{ backgroundColor: selectedHabit.color }}
                disabled={!value}
              >
                記録する
              </Button>
            </form>

            {/* このhabbitの直近履歴 */}
            <div className="space-y-1 pt-2 border-t border-border">
              <h4 className="text-xs text-muted-foreground">直近の記録</h4>
              {entries
                .filter(e => e.habitType === selectedHabit.type)
                .sort((a, b) => b.createdAt - a.createdAt)
                .slice(0, 5)
                .map(e => (
                  <div key={e.id} className="flex items-center justify-between rounded-md bg-secondary/40 px-2 py-1.5">
                    <div className="flex items-center gap-2 text-xs min-w-0">
                      <span className="text-muted-foreground">{e.date}</span>
                      <span className="font-medium" style={{ color: selectedHabit.color }}>
                        {e.value} {e.unit}
                      </span>
                      {e.subject && (
                        <span className="text-muted-foreground truncate">{e.subject}</span>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive shrink-0"
                      onClick={() => onDelete(e.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
            </div>
          </DialogContent>
        )}
      </Dialog>

      {/* 全履歴 */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">習慣の記録</h3>
          {sortedEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              上のカードをタップして記録を始めましょう
            </p>
          ) : (
            <div className="space-y-1.5">
              {sortedEntries.slice(0, 20).map((entry) => {
                const meta = getHabitMeta(entry.habitType)
                const Icon = meta.icon
                return (
                  <div
                    key={entry.id}
                    className="group flex items-center gap-2 rounded-md hover:bg-secondary/40 p-1.5 -mx-1 transition-colors"
                  >
                    <Icon className="h-4 w-4 shrink-0" style={{ color: meta.color }} />
                    <span className="text-xs text-muted-foreground w-16 shrink-0">{entry.date}</span>
                    <span className="text-xs font-medium text-foreground">
                      {entry.value} {entry.unit}
                    </span>
                    {entry.subject && (
                      <span className="text-xs text-muted-foreground truncate">{entry.subject}</span>
                    )}
                    <div className="flex-1" />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                      onClick={() => onDelete(entry.id)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* 目標設定ダイアログ */}
      <Dialog open={goalDialogOpen} onOpenChange={setGoalDialogOpen}>
        <DialogContent className="max-w-[420px]">
          <DialogHeader>
            <DialogTitle>日次目標を設定</DialogTitle>
            <DialogDescription>
              各習慣の1日あたりの目標を入力してください。0にすると目標が解除されます。
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {visibleMetas.map(meta => {
              const Icon = meta.icon
              const existing = goalMap.get(meta.type)
              const val = goalDrafts[meta.type] ?? (existing ? String(existing) : '')
              return (
                <div key={meta.type} className="flex items-center gap-3 rounded-lg border border-border bg-secondary/40 p-3">
                  <Icon className="h-5 w-5 shrink-0" style={{ color: meta.color }} />
                  <Label className="flex-1 text-sm font-medium text-foreground">{meta.label}</Label>
                  <div className="relative w-24">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="0"
                      value={val}
                      onChange={(e) => setGoalDrafts(prev => ({ ...prev, [meta.type]: e.target.value }))}
                      className="bg-secondary border-border text-foreground text-right pr-8 h-9"
                    />
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                      {meta.defaultUnit}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" className="flex-1" onClick={() => setGoalDialogOpen(false)}>
              キャンセル
            </Button>
            <Button type="button" className="flex-1" onClick={handleSaveGoals}>
              保存
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
