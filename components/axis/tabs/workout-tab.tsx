'use client'

import { useState, useMemo } from 'react'
import {
  Dumbbell,
  Plus,
  Trash2,
  Flame,
  Trophy,
  Calendar,
  ChevronDown,
  ChevronRight,
  ListChecks,
  Edit3,
  Play,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import type { WorkoutSession, WorkoutEntry, WorkoutRoutine } from '@/lib/types'
import {
  sessionVolume,
  sessionSetCount,
  sessionBest1RM,
  weeklyVolume,
  computeExerciseRecords,
  estimate1RM,
} from '@/lib/workout-stats'
import { ActiveSession } from '@/components/axis/workout/active-session'
import { RoutineDialog } from '@/components/axis/workout/routine-dialog'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface WorkoutTabProps {
  sessions: WorkoutSession[]
  legacyEntries: WorkoutEntry[]
  routines: WorkoutRoutine[]
  onStartSession: () => WorkoutSession
  onStartFromRoutine: (routine: WorkoutRoutine) => void
  onUpdateSession: (session: WorkoutSession) => void
  onFinishSession: (session: WorkoutSession) => void
  onCancelSession: (id: string) => void
  onDeleteSession: (id: string) => void
  onDeleteLegacy: (id: string) => void
  onSaveRoutine: (routine: Omit<WorkoutRoutine, 'id' | 'createdAt'>, editingId?: string) => void
  onDeleteRoutine: (id: string) => void
}

function formatDayLabel(dateStr: string, dow: readonly string[], dayLabel: (m: number, d: number, dow: string) => string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return dayLabel(m, d, dow[date.getDay()])
}

function formatDuration(startMs: number, endMs: number): string {
  const total = Math.floor((endMs - startMs) / 1000)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  if (h > 0) return `${h}h ${m}m`
  return `${m}m`
}

export function WorkoutTab({
  sessions,
  legacyEntries,
  routines,
  onStartSession,
  onStartFromRoutine,
  onUpdateSession,
  onFinishSession,
  onCancelSession,
  onDeleteSession,
  onDeleteLegacy,
  onSaveRoutine,
  onDeleteRoutine,
}: WorkoutTabProps) {
  const { t } = useI18n()
  const [expandedSession, setExpandedSession] = useState<string | null>(null)
  const [routineDialogOpen, setRoutineDialogOpen] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<WorkoutRoutine | null>(null)

  const activeSession = useMemo(
    () => sessions.find(s => !s.endedAt) || null,
    [sessions]
  )

  const finishedSessions = useMemo(
    () =>
      sessions
        .filter(s => s.endedAt)
        .sort((a, b) => b.startedAt - a.startedAt),
    [sessions]
  )

  const records = useMemo(() => computeExerciseRecords(sessions), [sessions])
  const totalWeeklyVolume = useMemo(() => weeklyVolume(sessions), [sessions])

  // アクティブセッション中は全画面セッション編集
  if (activeSession) {
    return (
      <ActiveSession
        session={activeSession}
        allSessions={sessions}
        onUpdate={onUpdateSession}
        onFinish={onFinishSession}
        onCancel={() => onCancelSession(activeSession.id)}
      />
    )
  }

  const hasAnyData = finishedSessions.length > 0 || legacyEntries.length > 0

  return (
    <div className="space-y-4">
      {/* 新規開始ボタン */}
      <Button
        type="button"
        size="lg"
        className="w-full h-14 bg-workout hover:bg-workout/90 text-background gap-2 text-base font-semibold"
        onClick={() => onStartSession()}
      >
        <Plus className="h-5 w-5" />
        ワークアウトを開始
      </Button>

      {/* ルーティン */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <ListChecks className="h-4 w-4 text-workout" />
              <h3 className="text-sm font-medium text-muted-foreground">{t.workout.routine}</h3>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 gap-1 text-xs text-muted-foreground"
              onClick={() => {
                setEditingRoutine(null)
                setRoutineDialogOpen(true)
              }}
            >
              <Plus className="h-3.5 w-3.5" />
              作成
            </Button>
          </div>
          {routines.length === 0 ? (
            <p className="text-center text-xs text-muted-foreground py-3">
              {t.workout.routineEmpty}
            </p>
          ) : (
            <div className="space-y-2">
              {routines.map((routine) => (
                <div
                  key={routine.id}
                  className="flex items-center gap-2 rounded-lg border border-border bg-secondary/40 p-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{routine.name}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {routine.exercises.map(e => e.exerciseName).join(' / ')}
                    </p>
                  </div>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setEditingRoutine(routine)
                      setRoutineDialogOpen(true)
                    }}
                  >
                    <Edit3 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      if (confirm(t.common.deleteConfirmName(routine.name))) onDeleteRoutine(routine.id)
                    }}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    className="h-8 gap-1 bg-workout hover:bg-workout/90 text-background text-xs"
                    onClick={() => onStartFromRoutine(routine)}
                  >
                    <Play className="h-3.5 w-3.5" />
                    開始
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <RoutineDialog
        open={routineDialogOpen}
        onOpenChange={setRoutineDialogOpen}
        editing={editingRoutine}
        onSave={(data, editingId) => {
          onSaveRoutine(data, editingId)
          setEditingRoutine(null)
        }}
      />

      {/* 週次サマリー */}
      {finishedSessions.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                <Flame className="h-3 w-3" /> {t.workout.weeklyVolume}
              </div>
              <p className="text-sm font-bold text-workout mt-1 truncate">
                {totalWeeklyVolume.toLocaleString()}
                <span className="text-[10px] text-muted-foreground ml-0.5">kg</span>
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                <Calendar className="h-3 w-3" /> {t.workout.totalSessions}
              </div>
              <p className="text-sm font-bold text-foreground mt-1">
                {finishedSessions.length}
                <span className="text-[10px] text-muted-foreground ml-0.5">{t.common.times}</span>
              </p>
            </CardContent>
          </Card>
          <Card className="bg-card border-border">
            <CardContent className="p-3">
              <div className="flex items-center gap-1 text-muted-foreground text-[10px]">
                <Trophy className="h-3 w-3" /> {t.workout.trackedExercises}
              </div>
              <p className="text-sm font-bold text-foreground mt-1">
                {records.size}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 種目別ベスト (最大1RM上位5) */}
      {records.size > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.workout.exerciseBest}</h3>
            <div className="space-y-2">
              {Array.from(records.values())
                .sort((a, b) => b.bestOneRM - a.bestOneRM)
                .slice(0, 5)
                .map((rec) => (
                  <div
                    key={rec.exerciseName}
                    className="flex items-center justify-between text-sm"
                  >
                    <span className="text-foreground truncate">{rec.exerciseName}</span>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground shrink-0">
                      <span>
                        {t.workout.max}{' '}
                        <span className="font-semibold text-workout">
                          {rec.bestWeight}kg
                        </span>
                      </span>
                      <span>
                        1RM{' '}
                        <span className="font-semibold text-foreground">
                          {rec.bestOneRM.toFixed(0)}kg
                        </span>
                      </span>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* セッション履歴 */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.workout.history}</h3>
          {!hasAnyData ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t.workout.noRecords}
            </p>
          ) : (
            <div className="space-y-2">
              {finishedSessions.map((session) => {
                const expanded = expandedSession === session.id
                const volume = sessionVolume(session)
                const setCount = sessionSetCount(session)
                const best = sessionBest1RM(session)
                const duration = session.endedAt
                  ? formatDuration(session.startedAt, session.endedAt)
                  : ''
                return (
                  <div
                    key={session.id}
                    className="rounded-lg bg-secondary/40 border border-border overflow-hidden"
                  >
                    <div className="flex items-center gap-2 p-3 hover:bg-secondary/60 transition-colors">
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left min-w-0"
                        onClick={() =>
                          setExpandedSession(expanded ? null : session.id)
                        }
                      >
                        {expanded ? (
                          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-foreground truncate">
                              {session.name || formatDayLabel(session.date, t.dow, t.workout.dayLabel)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5">
                            <span>{session.date}</span>
                            {duration && <span>· {duration}</span>}
                            <span>· {setCount} {t.workout.sets}</span>
                            <span>· {volume.toLocaleString()}kg</span>
                          </div>
                        </div>
                      </button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-muted-foreground hover:text-destructive"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (confirm(t.workout.deleteSessionConfirm)) {
                            onDeleteSession(session.id)
                          }
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {expanded && (
                      <div className="px-3 pb-3 space-y-2 border-t border-border pt-2">
                        {best && (
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <Trophy className="h-3 w-3 text-workout" />
                            <span className="text-muted-foreground">
                              {t.workout.max} 1RM:{' '}
                              <span className="text-foreground font-semibold">
                                {best.exerciseName} {best.oneRM.toFixed(0)}kg
                              </span>
                            </span>
                          </div>
                        )}
                        {session.exercises.map((ex) => (
                          <div key={ex.id} className="space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-medium text-foreground">
                                {ex.exerciseName}
                              </span>
                              <span className="text-[9px] rounded-full bg-workout/10 px-1.5 py-0 text-workout">
                                {ex.muscleGroup}
                              </span>
                            </div>
                            <div className="flex flex-wrap gap-x-2 gap-y-0 pl-2">
                              {ex.sets
                                .filter(s => s.completed)
                                .map((s, i) => (
                                  <span
                                    key={s.id}
                                    className={cn(
                                      'text-[10px]',
                                      s.isWarmup
                                        ? 'text-muted-foreground italic'
                                        : 'text-foreground'
                                    )}
                                  >
                                    {s.isWarmup ? 'W' : i + 1}: {s.weight}kg × {s.reps}
                                  </span>
                                ))}
                            </div>
                          </div>
                        ))}
                        {session.notes && (
                          <p className="text-[10px] text-muted-foreground pt-1">
                            {session.notes}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}

              {/* 旧モデルのエントリ */}
              {legacyEntries.length > 0 && (
                <>
                  <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground pt-3 mb-1">
                    旧記録
                  </h4>
                  {[...legacyEntries]
                    .sort((a, b) => b.createdAt - a.createdAt)
                    .map((w) => (
                      <div
                        key={w.id}
                        className="flex items-center justify-between rounded-lg bg-secondary/40 p-2 border border-border"
                      >
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-muted-foreground">
                              {w.date}
                            </span>
                            <span className="text-xs font-medium text-foreground truncate">
                              {w.exercise}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center gap-2">
                            <span className="text-[9px] rounded-full bg-workout/10 px-1.5 py-0 text-workout">
                              {w.muscleGroup}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                              {w.sets} {t.workout.sets} x {w.reps} reps @ {w.weight}kg
                            </span>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => onDeleteLegacy(w.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))}
                </>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
