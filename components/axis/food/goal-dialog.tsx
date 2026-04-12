'use client'

import { useState, useEffect } from 'react'
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
import type { FoodGoal } from '@/lib/types'

interface GoalDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  goal: FoodGoal
  onSave: (goal: FoodGoal) => void
}

// 1gあたりのカロリー
const KCAL_PER_G = { protein: 4, fat: 9, carbs: 4 }

export function GoalDialog({ open, onOpenChange, goal, onSave }: GoalDialogProps) {
  const [calories, setCalories] = useState(String(goal.calories))
  const [protein, setProtein] = useState(String(goal.protein))
  const [fat, setFat] = useState(String(goal.fat))
  const [carbs, setCarbs] = useState(String(goal.carbs))

  useEffect(() => {
    if (open) {
      setCalories(String(goal.calories))
      setProtein(String(goal.protein))
      setFat(String(goal.fat))
      setCarbs(String(goal.carbs))
    }
  }, [open, goal])

  const pN = parseFloat(protein) || 0
  const fN = parseFloat(fat) || 0
  const cN = parseFloat(carbs) || 0
  const pfcKcal = pN * KCAL_PER_G.protein + fN * KCAL_PER_G.fat + cN * KCAL_PER_G.carbs
  const totalKcal = pfcKcal > 0 ? pfcKcal : parseFloat(calories) || 0

  const pPct = totalKcal > 0 ? (pN * KCAL_PER_G.protein * 100) / totalKcal : 0
  const fPct = totalKcal > 0 ? (fN * KCAL_PER_G.fat * 100) / totalKcal : 0
  const cPct = totalKcal > 0 ? (cN * KCAL_PER_G.carbs * 100) / totalKcal : 0

  const handleSave = () => {
    onSave({
      calories: parseFloat(calories) || 0,
      protein: pN,
      fat: fN,
      carbs: cN,
    })
    onOpenChange(false)
  }

  // プリセット: バルク / 減量 / 維持
  const applyPreset = (preset: 'bulk' | 'cut' | 'maintain') => {
    switch (preset) {
      case 'bulk':
        setCalories('2800')
        setProtein('160')
        setFat('80')
        setCarbs('340')
        break
      case 'cut':
        setCalories('1800')
        setProtein('140')
        setFat('50')
        setCarbs('180')
        break
      case 'maintain':
        setCalories('2200')
        setProtein('120')
        setFat('65')
        setCarbs('260')
        break
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>栄養目標を設定</DialogTitle>
          <DialogDescription>
            1日あたりの目標カロリーとPFCバランスを入力してください。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => applyPreset('cut')}
            >
              減量
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => applyPreset('maintain')}
            >
              維持
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="flex-1 text-xs"
              onClick={() => applyPreset('bulk')}
            >
              増量
            </Button>
          </div>

          <div className="space-y-2">
            <Label className="text-muted-foreground">目標カロリー (kcal)</Label>
            <Input
              type="number"
              inputMode="numeric"
              value={calories}
              onChange={(e) => setCalories(e.target.value)}
              className="bg-secondary border-border text-foreground"
            />
          </div>

          <div className="grid grid-cols-3 gap-2">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">P タンパク質</Label>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={protein}
                  onChange={(e) => setProtein(e.target.value)}
                  className="bg-secondary border-border text-foreground pr-6 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  g
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">F 脂質</Label>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={fat}
                  onChange={(e) => setFat(e.target.value)}
                  className="bg-secondary border-border text-foreground pr-6 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  g
                </span>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">C 炭水化物</Label>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  value={carbs}
                  onChange={(e) => setCarbs(e.target.value)}
                  className="bg-secondary border-border text-foreground pr-6 text-sm"
                />
                <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground">
                  g
                </span>
              </div>
            </div>
          </div>

          {/* PFC プレビュー */}
          <div className="rounded-lg bg-secondary/40 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">PFCから計算</span>
              <span className="text-foreground font-semibold">
                {Math.round(pfcKcal)} kcal
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-background flex">
              <div style={{ width: `${pPct}%`, backgroundColor: '#60a5fa' }} />
              <div style={{ width: `${fPct}%`, backgroundColor: '#facc15' }} />
              <div style={{ width: `${cPct}%`, backgroundColor: '#a78bfa' }} />
            </div>
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>P {pPct.toFixed(0)}%</span>
              <span>F {fPct.toFixed(0)}%</span>
              <span>C {cPct.toFixed(0)}%</span>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => onOpenChange(false)}
            >
              キャンセル
            </Button>
            <Button type="button" className="flex-1" onClick={handleSave}>
              保存
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
