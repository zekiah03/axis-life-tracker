'use client'

import { useState, useRef, useEffect } from 'react'
import { Trash2 } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { WorkoutEntry } from '@/lib/types'
import { exercisePresets, muscleGroups, searchExercises } from '@/lib/exercise-presets'
import { cn } from '@/lib/utils'

interface WorkoutTabProps {
  workouts: WorkoutEntry[]
  onAddWorkout: (workout: Omit<WorkoutEntry, 'id' | 'createdAt'>) => void
  onDeleteWorkout: (id: string) => void
}

export function WorkoutTab({ workouts, onAddWorkout, onDeleteWorkout }: WorkoutTabProps) {
  const [exercise, setExercise] = useState('')
  const [muscleGroup, setMuscleGroup] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [sets, setSets] = useState('')
  const [reps, setReps] = useState('')
  const [weight, setWeight] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [suggestions, setSuggestions] = useState(exercisePresets.slice(0, 5))
  const inputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const results = searchExercises(exercise)
    setSuggestions(results.slice(0, 5))
  }, [exercise])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelectExercise = (preset: typeof exercisePresets[0]) => {
    setExercise(preset.name)
    setMuscleGroup(preset.muscleGroup)
    setShowSuggestions(false)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!exercise || !muscleGroup || !sets || !reps || !weight) return

    onAddWorkout({
      exercise,
      muscleGroup,
      date,
      sets: parseInt(sets),
      reps: parseInt(reps),
      weight: parseFloat(weight),
    })

    setExercise('')
    setMuscleGroup('')
    setSets('')
    setReps('')
    setWeight('')
  }

  const sortedWorkouts = [...workouts].sort((a, b) => b.createdAt - a.createdAt)

  return (
    <div className="space-y-4">
      {/* Form */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Exercise Name with Autocomplete */}
            <div className="relative space-y-2">
              <Label className="text-muted-foreground">種目</Label>
              <Input
                ref={inputRef}
                type="text"
                placeholder="種目名を入力..."
                value={exercise}
                onChange={(e) => setExercise(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                className="bg-secondary border-border text-foreground"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div
                  ref={suggestionsRef}
                  className="absolute left-0 right-0 top-full z-10 mt-1 overflow-hidden rounded-lg border border-border bg-popover shadow-lg animate-in fade-in-0 zoom-in-95"
                >
                  {suggestions.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent transition-colors"
                      onClick={() => handleSelectExercise(preset)}
                    >
                      <span className="text-foreground">{preset.name}</span>
                      <span className="rounded-full bg-workout/10 px-2 py-0.5 text-xs text-workout">
                        {preset.muscleGroup}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Muscle Group */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">部位</Label>
              <Select value={muscleGroup} onValueChange={setMuscleGroup}>
                <SelectTrigger className="bg-secondary border-border text-foreground">
                  <SelectValue placeholder="選択してください" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups.map((group) => (
                    <SelectItem key={group} value={group}>
                      {group}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">日付</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            {/* Sets / Reps / Weight */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-muted-foreground">セット</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="3"
                  value={sets}
                  onChange={(e) => setSets(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">レップ</Label>
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder="10"
                  value={reps}
                  onChange={(e) => setReps(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground">重量 (kg)</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="60"
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-workout hover:bg-workout/90 text-background font-medium"
              disabled={!exercise || !muscleGroup || !sets || !reps || !weight}
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Workout History */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">ワークアウト履歴</h3>
          {sortedWorkouts.length === 0 ? (
            <p className="py-4 text-center text-sm text-muted-foreground">記録がありません</p>
          ) : (
            <div className="space-y-2">
              {sortedWorkouts.map((w) => (
                <div
                  key={w.id}
                  className="flex items-center justify-between rounded-lg bg-secondary/50 p-3"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm text-muted-foreground">{w.date}</span>
                      <span className="font-medium text-foreground">{w.exercise}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2">
                      <span className="rounded-full bg-workout/10 px-2 py-0.5 text-xs text-workout">
                        {w.muscleGroup}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {w.sets}セット x {w.reps}レップ @ {w.weight}kg
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteWorkout(w.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
