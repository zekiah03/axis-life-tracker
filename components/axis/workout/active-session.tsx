'use client'

import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Plus,
  Trash2,
  Check,
  Flame,
  X,
  Clock,
  Search,
  Copy,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type {
  WorkoutSession,
  SessionExercise,
  WorkoutSet,
} from '@/lib/types'
import { exercisePresets, muscleGroups, searchExercises } from '@/lib/exercise-presets'
import {
  estimate1RM,
  sessionVolume,
  sessionSetCount,
  computeExerciseRecords,
  type ExerciseRecords,
} from '@/lib/workout-stats'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface ActiveSessionProps {
  session: WorkoutSession
  allSessions: WorkoutSession[] // 前回の記録を引くため
  onUpdate: (session: WorkoutSession) => void
  onFinish: (session: WorkoutSession) => void
  onCancel: () => void
}

// 経過時間 (mm:ss)
function formatElapsed(ms: number): string {
  const total = Math.floor(ms / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  if (h > 0) return `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  return `${m}:${String(s).padStart(2, '0')}`
}

export function ActiveSession({
  session,
  allSessions,
  onUpdate,
  onFinish,
  onCancel,
}: ActiveSessionProps) {
  const { t } = useI18n()
  const [addExerciseOpen, setAddExerciseOpen] = useState(false)
  const [exerciseSearch, setExerciseSearch] = useState('')
  const [elapsed, setElapsed] = useState(Date.now() - session.startedAt)
  // 休憩タイマー
  const [restTimer, setRestTimer] = useState<{ start: number; seconds: number } | null>(null)
  const [restElapsed, setRestElapsed] = useState(0)

  // 経過時間の更新
  useEffect(() => {
    const t = setInterval(() => setElapsed(Date.now() - session.startedAt), 1000)
    return () => clearInterval(t)
  }, [session.startedAt])

  // 休憩タイマー更新
  useEffect(() => {
    if (!restTimer) return
    const t = setInterval(() => {
      setRestElapsed(Math.floor((Date.now() - restTimer.start) / 1000))
    }, 1000)
    return () => clearInterval(t)
  }, [restTimer])

  // 前回の記録を引くため
  const pastRecords = useMemo(
    () => computeExerciseRecords(allSessions.filter(s => s.id !== session.id)),
    [allSessions, session.id]
  )

  const searchResults = useMemo(() => {
    const q = exerciseSearch.trim()
    if (!q) return exercisePresets.slice(0, 20)
    return searchExercises(q)
  }, [exerciseSearch])

  // セッション操作
  const updateSession = (patch: Partial<WorkoutSession>) => {
    onUpdate({ ...session, ...patch })
  }

  const addExercise = (name: string, muscleGroup: string) => {
    // 前回の記録があれば最後のセットを元にテンプレを作る
    const prev = pastRecords.get(name)
    const template: WorkoutSet[] =
      prev?.lastSession?.sets.map(s => ({
        id: crypto.randomUUID(),
        weight: s.weight,
        reps: s.reps,
        completed: false,
      })) || [
        { id: crypto.randomUUID(), weight: 0, reps: 0, completed: false },
      ]
    const newExercise: SessionExercise = {
      id: crypto.randomUUID(),
      exerciseName: name,
      muscleGroup,
      sets: template,
      order: session.exercises.length,
    }
    updateSession({ exercises: [...session.exercises, newExercise] })
    setAddExerciseOpen(false)
    setExerciseSearch('')
  }

  const removeExercise = (exId: string) => {
    updateSession({ exercises: session.exercises.filter(e => e.id !== exId) })
  }

  const updateExercise = (exId: string, patch: Partial<SessionExercise>) => {
    updateSession({
      exercises: session.exercises.map(e => (e.id === exId ? { ...e, ...patch } : e)),
    })
  }

  const addSet = (exId: string) => {
    const ex = session.exercises.find(e => e.id === exId)
    if (!ex) return
    const last = ex.sets[ex.sets.length - 1]
    const newSet: WorkoutSet = {
      id: crypto.randomUUID(),
      weight: last?.weight ?? 0,
      reps: last?.reps ?? 0,
      completed: false,
    }
    updateExercise(exId, { sets: [...ex.sets, newSet] })
  }

  const updateSet = (exId: string, setId: string, patch: Partial<WorkoutSet>) => {
    const ex = session.exercises.find(e => e.id === exId)
    if (!ex) return
    updateExercise(exId, {
      sets: ex.sets.map(s => (s.id === setId ? { ...s, ...patch } : s)),
    })
  }

  const removeSet = (exId: string, setId: string) => {
    const ex = session.exercises.find(e => e.id === exId)
    if (!ex) return
    updateExercise(exId, { sets: ex.sets.filter(s => s.id !== setId) })
  }

  const toggleSetComplete = (exId: string, setId: string) => {
    const ex = session.exercises.find(e => e.id === exId)
    if (!ex) return
    const set = ex.sets.find(s => s.id === setId)
    if (!set) return
    const nowComplete = !set.completed
    updateSet(exId, setId, { completed: nowComplete })
    // 完了時は休憩タイマー開始 (90秒デフォルト)
    if (nowComplete && !set.isWarmup) {
      setRestTimer({ start: Date.now(), seconds: 90 })
      setRestElapsed(0)
    }
  }

  // 統計
  const totalVolume = sessionVolume(session)
  const totalSets = sessionSetCount(session)

  const handleFinish = () => {
    if (session.exercises.length === 0) {
      if (!confirm(t.workout.finishEmptyConfirm)) return
    }
    onFinish({ ...session, endedAt: Date.now() })
  }

  return (
    <div className="space-y-3 pb-20">
      {/* ヘッダー: 経過時間・ボリューム・完了ボタン */}
      <Card className="bg-workout/10 border-workout/30">
        <CardContent className="p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Flame className="h-4 w-4 text-workout" />
              <h2 className="text-sm font-bold text-workout">{t.workout.active}</h2>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-muted-foreground hover:text-destructive"
                onClick={() => {
                  if (confirm(t.workout.discardConfirm)) onCancel()
                }}
              >
                破棄
              </Button>
              <Button
                type="button"
                size="sm"
                className="h-8 bg-workout hover:bg-workout/90 text-background text-xs"
                onClick={handleFinish}
              >
                完了
              </Button>
            </div>
          </div>
          <Input
            type="text"
            placeholder={t.workout.sessionName}
            value={session.name || ''}
            onChange={(e) => updateSession({ name: e.target.value })}
            className="bg-secondary/60 border-border text-foreground h-8 text-sm mb-2"
          />
          <div className="grid grid-cols-3 gap-1 text-center text-xs">
            <div>
              <p className="text-muted-foreground">{t.workout.time}</p>
              <p className="font-semibold text-foreground">{formatElapsed(elapsed)}</p>
            </div>
            <div>
              <p className="text-muted-foreground">{t.workout.volume}</p>
              <p className="font-semibold text-foreground">
                {totalVolume.toLocaleString()} kg
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">{t.workout.sets}</p>
              <p className="font-semibold text-foreground">{totalSets}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 休憩タイマー */}
      {restTimer && (
        <Card className="bg-card border-border">
          <CardContent className="p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-workout" />
                <span className="text-sm font-medium text-foreground">{t.workout.rest}</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    'font-mono text-base font-bold',
                    restElapsed >= restTimer.seconds
                      ? 'text-workout'
                      : 'text-foreground'
                  )}
                >
                  {formatElapsed(restElapsed * 1000)}
                  <span className="text-xs text-muted-foreground">
                    {' / '}
                    {formatElapsed(restTimer.seconds * 1000)}
                  </span>
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => setRestTimer(null)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* 種目一覧 */}
      {session.exercises.map((ex) => {
        const prev = pastRecords.get(ex.exerciseName)
        return (
          <ExerciseBlock
            key={ex.id}
            exercise={ex}
            previousRecord={prev}
            onAddSet={() => addSet(ex.id)}
            onUpdateSet={(setId, patch) => updateSet(ex.id, setId, patch)}
            onRemoveSet={(setId) => removeSet(ex.id, setId)}
            onToggleComplete={(setId) => toggleSetComplete(ex.id, setId)}
            onRemoveExercise={() => {
              if (confirm(t.common.deleteConfirmName(ex.exerciseName))) removeExercise(ex.id)
            }}
          />
        )
      })}

      {/* 種目追加ボタン */}
      <Button
        type="button"
        variant="outline"
        className="w-full gap-2 border-dashed"
        onClick={() => setAddExerciseOpen(true)}
      >
        <Plus className="h-4 w-4" />
        種目を追加
      </Button>

      {/* 種目選択ダイアログ */}
      <Dialog open={addExerciseOpen} onOpenChange={setAddExerciseOpen}>
        <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{t.workout.selectExercise}</DialogTitle>
          </DialogHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder={t.workout.searchExercise}
              value={exerciseSearch}
              onChange={(e) => setExerciseSearch(e.target.value)}
              className="bg-secondary border-border text-foreground pl-9"
              autoFocus
            />
          </div>
          {/* 部位フィルタ */}
          <div className="space-y-1 max-h-[50vh] overflow-y-auto">
            {muscleGroups.map((group) => {
              const items = searchResults.filter(p => p.muscleGroup === group)
              if (items.length === 0) return null
              return (
                <div key={group}>
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1 px-1">
                    {group}
                  </h4>
                  {items.map((preset) => {
                    const prev = pastRecords.get(preset.name)
                    return (
                      <button
                        key={preset.name}
                        type="button"
                        className="flex w-full items-center justify-between px-2 py-2 rounded-md hover:bg-secondary transition-colors text-left"
                        onClick={() => addExercise(preset.name, preset.muscleGroup)}
                      >
                        <span className="text-sm text-foreground">{preset.name}</span>
                        {prev && (
                          <span className="text-[10px] text-muted-foreground">
                            最大 {prev.bestWeight}kg
                          </span>
                        )}
                      </button>
                    )
                  })}
                </div>
              )
            })}
            {searchResults.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">
                {t.workout.noExerciseMatch}
              </p>
            )}
          </div>
          {/* カスタム種目 */}
          {exerciseSearch.trim() && searchResults.length === 0 && (
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              onClick={() => addExercise(exerciseSearch.trim(), t.workout.other)}
            >
              <Plus className="h-4 w-4" />
              {t.workout.addExercise}: {exerciseSearch.trim()}
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

// 種目ブロック (1種目 + そのセット一覧)
function ExerciseBlock({
  exercise,
  previousRecord,
  onAddSet,
  onUpdateSet,
  onRemoveSet,
  onToggleComplete,
  onRemoveExercise,
}: {
  exercise: SessionExercise
  previousRecord?: ExerciseRecords
  onAddSet: () => void
  onUpdateSet: (setId: string, patch: Partial<WorkoutSet>) => void
  onRemoveSet: (setId: string) => void
  onToggleComplete: (setId: string) => void
  onRemoveExercise: () => void
}) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-sm font-semibold text-foreground">
              {exercise.exerciseName}
            </h3>
            <span className="text-[10px] rounded-full bg-workout/10 px-2 py-0.5 text-workout">
              {exercise.muscleGroup}
            </span>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground hover:text-destructive"
            onClick={onRemoveExercise}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>

        {/* 前回の記録 */}
        {previousRecord?.lastSession && (
          <div className="mb-2 rounded-md bg-secondary/40 px-2 py-1.5 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1 mb-0.5">
              <Copy className="h-3 w-3" />
              前回 ({previousRecord.lastSession.date})
            </div>
            <div className="flex flex-wrap gap-1">
              {previousRecord.lastSession.sets.map((s, i) => (
                <span key={i} className="text-foreground">
                  {s.weight}kg × {s.reps}
                  {i < previousRecord.lastSession!.sets.length - 1 && ' ·'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* セット一覧のヘッダー */}
        <div className="grid grid-cols-[28px_1fr_1fr_1fr_32px_32px] gap-1 text-[10px] text-muted-foreground px-1 mb-1">
          <span>Set</span>
          <span className="text-center">Weight</span>
          <span className="text-center">Reps</span>
          <span className="text-center">1RM</span>
          <span></span>
          <span></span>
        </div>

        {/* セット行 */}
        <div className="space-y-1">
          {exercise.sets.map((set, i) => {
            const estimated = estimate1RM(set.weight, set.reps)
            return (
              <div
                key={set.id}
                className={cn(
                  'grid grid-cols-[28px_1fr_1fr_1fr_32px_32px] gap-1 items-center rounded-md px-1 py-1',
                  set.completed && 'bg-money/10'
                )}
              >
                <span
                  className={cn(
                    'text-xs font-semibold text-center',
                    set.isWarmup ? 'text-workout/70' : 'text-foreground'
                  )}
                >
                  {set.isWarmup ? 'W' : i + 1 - exercise.sets.slice(0, i + 1).filter(s => s.isWarmup).length}
                </span>
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.5"
                  value={set.weight || ''}
                  onChange={(e) =>
                    onUpdateSet(set.id, { weight: parseFloat(e.target.value) || 0 })
                  }
                  className="h-8 bg-secondary/60 border-border text-foreground text-center text-sm px-1"
                />
                <Input
                  type="number"
                  inputMode="numeric"
                  value={set.reps || ''}
                  onChange={(e) =>
                    onUpdateSet(set.id, { reps: parseInt(e.target.value) || 0 })
                  }
                  className="h-8 bg-secondary/60 border-border text-foreground text-center text-sm px-1"
                />
                <span className="text-xs text-muted-foreground text-center">
                  {estimated > 0 ? estimated.toFixed(0) : '—'}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    'h-8 w-8',
                    set.completed ? 'text-money' : 'text-muted-foreground hover:text-money'
                  )}
                  onClick={() => onToggleComplete(set.id)}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemoveSet(set.id)}
                >
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            )
          })}
        </div>

        {/* セット追加 */}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-full mt-1 gap-1 text-xs h-7 text-muted-foreground hover:text-foreground"
          onClick={onAddSet}
        >
          <Plus className="h-3.5 w-3.5" />
          セットを追加
        </Button>
      </CardContent>
    </Card>
  )
}
