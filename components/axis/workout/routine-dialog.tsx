'use client'

import { useState, useMemo, useEffect } from 'react'
import { Plus, Trash2, Search, ArrowLeft } from 'lucide-react'
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
import type { WorkoutRoutine, RoutineExercise } from '@/lib/types'
import { exercisePresets, muscleGroups, searchExercises } from '@/lib/exercise-presets'

interface RoutineDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  editing?: WorkoutRoutine | null
  onSave: (routine: Omit<WorkoutRoutine, 'id' | 'createdAt'>, editingId?: string) => void
}

type View = 'form' | 'picker'

export function RoutineDialog({
  open,
  onOpenChange,
  editing,
  onSave,
}: RoutineDialogProps) {
  const [view, setView] = useState<View>('form')
  const [name, setName] = useState('')
  const [exercises, setExercises] = useState<RoutineExercise[]>([])
  const [query, setQuery] = useState('')

  useEffect(() => {
    if (open) {
      if (editing) {
        setName(editing.name)
        setExercises(editing.exercises)
      } else {
        setName('')
        setExercises([])
      }
      setView('form')
      setQuery('')
    }
  }, [open, editing])

  const searchResults = useMemo(() => {
    const q = query.trim()
    if (!q) return exercisePresets.slice(0, 20)
    return searchExercises(q)
  }, [query])

  const addExercise = (exName: string, mg: string) => {
    setExercises(prev => [
      ...prev,
      { exerciseName: exName, muscleGroup: mg, defaultSets: 3, defaultReps: 10, defaultWeight: 0 },
    ])
    setView('form')
    setQuery('')
  }

  const removeExercise = (index: number) => {
    setExercises(prev => prev.filter((_, i) => i !== index))
  }

  const updateExercise = (index: number, patch: Partial<RoutineExercise>) => {
    setExercises(prev => prev.map((ex, i) => (i === index ? { ...ex, ...patch } : ex)))
  }

  const handleSave = () => {
    if (!name.trim() || exercises.length === 0) return
    onSave({ name: name.trim(), exercises }, editing?.id)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
        {view === 'form' ? (
          <>
            <DialogHeader>
              <DialogTitle>{editing ? 'ルーティンを編集' : 'ルーティンを作成'}</DialogTitle>
              <DialogDescription>
                種目のセットを保存して、ワンタップでワークアウトを開始できます。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <Label className="text-muted-foreground">ルーティン名</Label>
              <Input
                type="text"
                placeholder="例: Push Day A"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-muted-foreground">種目 ({exercises.length})</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => setView('picker')}
                >
                  <Plus className="h-3.5 w-3.5" />
                  追加
                </Button>
              </div>

              {exercises.length === 0 ? (
                <p className="text-center text-xs text-muted-foreground py-4">
                  種目を追加してください
                </p>
              ) : (
                <div className="space-y-2">
                  {exercises.map((ex, i) => (
                    <div
                      key={i}
                      className="rounded-lg border border-border bg-secondary/40 p-3 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-foreground">{ex.exerciseName}</p>
                          <span className="text-[10px] rounded-full bg-workout/10 px-2 py-0.5 text-workout">
                            {ex.muscleGroup}
                          </span>
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 text-muted-foreground hover:text-destructive"
                          onClick={() => removeExercise(i)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">セット数</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={ex.defaultSets}
                            onChange={(e) => updateExercise(i, { defaultSets: parseInt(e.target.value) || 0 })}
                            className="bg-secondary border-border text-foreground text-sm h-8 text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">レップ数</Label>
                          <Input
                            type="number"
                            inputMode="numeric"
                            value={ex.defaultReps}
                            onChange={(e) => updateExercise(i, { defaultReps: parseInt(e.target.value) || 0 })}
                            className="bg-secondary border-border text-foreground text-sm h-8 text-center"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-muted-foreground text-[10px]">重量 (kg)</Label>
                          <Input
                            type="number"
                            inputMode="decimal"
                            placeholder="0"
                            value={ex.defaultWeight || ''}
                            onChange={(e) => updateExercise(i, { defaultWeight: parseFloat(e.target.value) || 0 })}
                            className="bg-secondary border-border text-foreground text-sm h-8 text-center"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Button type="button" variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>
                キャンセル
              </Button>
              <Button
                type="button"
                className="flex-1 bg-workout hover:bg-workout/90 text-background"
                disabled={!name.trim() || exercises.length === 0}
                onClick={handleSave}
              >
                保存
              </Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => setView('form')}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                種目を追加
              </DialogTitle>
            </DialogHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="種目名を検索..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="bg-secondary border-border text-foreground pl-9"
                autoFocus
              />
            </div>
            <div className="space-y-1 max-h-[50vh] overflow-y-auto">
              {muscleGroups.map((group) => {
                const items = searchResults.filter(p => p.muscleGroup === group)
                if (items.length === 0) return null
                return (
                  <div key={group}>
                    <h4 className="text-[10px] uppercase tracking-wider text-muted-foreground mt-2 mb-1 px-1">{group}</h4>
                    {items.map((preset) => (
                      <button
                        key={preset.name}
                        type="button"
                        className="flex w-full items-center justify-between px-2 py-2 rounded-md hover:bg-secondary transition-colors text-left"
                        onClick={() => addExercise(preset.name, preset.muscleGroup)}
                      >
                        <span className="text-sm text-foreground">{preset.name}</span>
                      </button>
                    ))}
                  </div>
                )
              })}
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
