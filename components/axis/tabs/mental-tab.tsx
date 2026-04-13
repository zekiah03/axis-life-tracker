'use client'

import { useState, useMemo } from 'react'
import { Trash2, Brain, Zap, Wind, Target, Smile } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { MentalEntry } from '@/lib/types'
import { cn } from '@/lib/utils'
import { useI18n } from '@/lib/i18n'

interface MentalTabProps {
  entries: MentalEntry[]
  onAdd: (entry: Omit<MentalEntry, 'id' | 'createdAt'>) => void
  onDelete: (id: string) => void
}

// Factor preset icons/positive flags (labels come from t inside component)
const factorPresetKeys = [
  { key: 'factorSleptWell' as const, icon: 'moon', positive: true },
  { key: 'factorLackSleep' as const, icon: 'moon', positive: false },
  { key: 'factorExercised' as const, icon: 'activity', positive: true },
  { key: 'factorGoodWeather' as const, icon: 'sun', positive: true },
  { key: 'factorBadWeather' as const, icon: 'cloud', positive: false },
  { key: 'factorBusyWork' as const, icon: 'briefcase', positive: false },
  { key: 'factorDayOff' as const, icon: 'coffee', positive: true },
  { key: 'factorMetPeople' as const, icon: 'users', positive: true },
  { key: 'factorAlone' as const, icon: 'user', positive: false },
  { key: 'factorGoodMeal' as const, icon: 'utensils', positive: true },
  { key: 'factorSick' as const, icon: 'thermometer', positive: false },
  { key: 'factorAchievement' as const, icon: 'trophy', positive: true },
  { key: 'factorAnxiety' as const, icon: 'alert', positive: false },
  { key: 'factorCaffeine' as const, icon: 'coffee', positive: false },
  { key: 'factorReading' as const, icon: 'book', positive: true },
  { key: 'factorMeditation' as const, icon: 'sparkles', positive: true },
]

interface ScoreSliderProps {
  label: string
  value: number
  onChange: (value: number) => void
  icon: React.ReactNode
  color: string
  lowLabel: string
  highLabel: string
}

function ScoreSlider({ label, value, onChange, icon, color, lowLabel, highLabel }: ScoreSliderProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {icon}
          <span className="text-sm font-medium text-foreground">{label}</span>
        </div>
        <span className="text-lg font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-8">{lowLabel}</span>
        <div className="flex-1 flex gap-0.5">
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={cn(
                'flex-1 h-8 rounded-sm transition-all',
                n <= value ? 'opacity-100' : 'opacity-20'
              )}
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="text-[10px] text-muted-foreground w-8 text-right">{highLabel}</span>
      </div>
    </div>
  )
}

// ミニバーチャート (履歴カード用)
function MiniBar({ mood, energy, stress, focus }: { mood: number; energy: number; stress: number; focus: number }) {
  const bars = [
    { value: mood, color: '#22d3a0', label: t.mental.miniMood },
    { value: energy, color: '#facc15', label: t.mental.miniEnergy },
    { value: 10 - stress, color: '#60a5fa', label: t.mental.miniCalm }, // ストレスは反転
    { value: focus, color: '#a78bfa', label: t.mental.miniFocus },
  ]
  return (
    <div className="flex items-end gap-1 h-8">
      {bars.map((bar) => (
        <div key={bar.label} className="flex flex-col items-center gap-0.5 flex-1">
          <div
            className="w-full rounded-sm min-h-[2px]"
            style={{
              height: `${(bar.value / 10) * 100}%`,
              backgroundColor: bar.color,
            }}
          />
          <span className="text-[8px] text-muted-foreground">{bar.label}</span>
        </div>
      ))}
    </div>
  )
}

export function MentalTab({ entries, onAdd, onDelete }: MentalTabProps) {
  const { t } = useI18n()

  const factorPresets = useMemo(() => factorPresetKeys.map(f => ({
    label: (t.mental as any)[f.key] as string,
    icon: f.icon,
    positive: f.positive,
  })), [t])

  const [mood, setMood] = useState(5)
  const [energy, setEnergy] = useState(5)
  const [stress, setStress] = useState(5)
  const [focus, setFocus] = useState(5)
  const [selectedFactors, setSelectedFactors] = useState<Set<string>>(new Set())
  const [notes, setNotes] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])

  // 今日の記録があるか
  const today = new Date().toISOString().split('T')[0]
  const todayEntry = entries.find(e => e.date === today)

  // 直近7日の平均
  const weekAvg = useMemo(() => {
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    const recent = entries.filter(e => new Date(e.date) >= sevenDaysAgo)
    if (recent.length === 0) return null
    const n = recent.length
    return {
      mood: recent.reduce((s, e) => s + e.mood, 0) / n,
      energy: recent.reduce((s, e) => s + e.energy, 0) / n,
      stress: recent.reduce((s, e) => s + e.stress, 0) / n,
      focus: recent.reduce((s, e) => s + e.focus, 0) / n,
      count: n,
    }
  }, [entries])

  const toggleFactor = (label: string) => {
    setSelectedFactors(prev => {
      const next = new Set(prev)
      if (next.has(label)) next.delete(label)
      else next.add(label)
      return next
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd({
      date,
      mood,
      energy,
      stress,
      focus,
      factors: selectedFactors.size > 0 ? Array.from(selectedFactors) : undefined,
      notes: notes || undefined,
    })
    setNotes('')
    setSelectedFactors(new Set())
  }

  const sortedEntries = useMemo(
    () => [...entries].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
    [entries]
  )

  // 総合スコア (気分 + エネルギー + (10-ストレス) + 集中力) / 4
  const overallScore = (m: number, e: number, s: number, f: number) =>
    Math.round(((m + e + (10 - s) + f) / 4) * 10) / 10

  return (
    <div className="space-y-4">
      {/* 今日のスナップショット or 週次平均 */}
      {(todayEntry || weekAvg) && (
        <Card className="bg-food/10 border-food/20">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-3">
              <Brain className="h-4 w-4 text-food" />
              <h3 className="text-sm font-medium text-muted-foreground">
                {todayEntry ? t.mental.todayCondition : t.mental.avg7Days}
              </h3>
            </div>
            <div className="grid grid-cols-5 gap-2 text-center">
              {[
                { label: t.mental.overall, value: todayEntry ? overallScore(todayEntry.mood, todayEntry.energy, todayEntry.stress, todayEntry.focus) : weekAvg ? overallScore(weekAvg.mood, weekAvg.energy, weekAvg.stress, weekAvg.focus) : 0, color: '#f5f5f7' },
                { label: t.mental.mood, value: todayEntry?.mood ?? weekAvg?.mood ?? 0, color: '#22d3a0' },
                { label: t.mental.activity, value: todayEntry?.energy ?? weekAvg?.energy ?? 0, color: '#facc15' },
                { label: t.mental.stress, value: todayEntry?.stress ?? weekAvg?.stress ?? 0, color: '#ef4444' },
                { label: t.mental.focus, value: todayEntry?.focus ?? weekAvg?.focus ?? 0, color: '#a78bfa' },
              ].map((item) => (
                <div key={item.label}>
                  <p className="text-2xl font-bold" style={{ color: item.color }}>
                    {typeof item.value === 'number' ? (item.value % 1 === 0 ? item.value : item.value.toFixed(1)) : item.value}
                  </p>
                  <p className="text-[10px] text-muted-foreground">{item.label}</p>
                </div>
              ))}
            </div>
            {todayEntry?.factors && todayEntry.factors.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-3">
                {todayEntry.factors.map(f => (
                  <span key={f} className="text-[10px] rounded-full bg-food/20 text-food px-2 py-0.5">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 入力フォーム */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <form onSubmit={handleSubmit} className="space-y-5">
            <ScoreSlider
              label={t.mental.mood}
              value={mood}
              onChange={setMood}
              icon={<Smile className="h-4 w-4 text-[#22d3a0]" />}
              color="#22d3a0"
              lowLabel={t.mental.moodLow}
              highLabel={t.mental.moodHigh}
            />
            <ScoreSlider
              label={t.mental.energy}
              value={energy}
              onChange={setEnergy}
              icon={<Zap className="h-4 w-4 text-[#facc15]" />}
              color="#facc15"
              lowLabel={t.mental.energyLow}
              highLabel={t.mental.energyHigh}
            />
            <ScoreSlider
              label={t.mental.stress}
              value={stress}
              onChange={setStress}
              icon={<Wind className="h-4 w-4 text-[#ef4444]" />}
              color="#ef4444"
              lowLabel={t.mental.stressLow}
              highLabel={t.mental.stressHigh}
            />
            <ScoreSlider
              label={t.mental.focus}
              value={focus}
              onChange={setFocus}
              icon={<Target className="h-4 w-4 text-[#a78bfa]" />}
              color="#a78bfa"
              lowLabel={t.mental.focusLow}
              highLabel={t.mental.focusHigh}
            />

            {/* 要因タグ */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.mental.factorsQuestion}</Label>
              <div className="flex flex-wrap gap-1.5">
                {factorPresets.map((factor) => (
                  <button
                    key={factor.label}
                    type="button"
                    onClick={() => toggleFactor(factor.label)}
                    className={cn(
                      'rounded-full border px-2.5 py-1 text-xs transition-colors',
                      selectedFactors.has(factor.label)
                        ? factor.positive
                          ? 'bg-money/20 border-money text-money'
                          : 'bg-destructive/20 border-destructive text-destructive'
                        : 'bg-secondary border-border text-muted-foreground'
                    )}
                  >
                    {factor.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 一言日記 */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.mental.notesOptional}</Label>
              <Textarea
                placeholder={t.mental.notesPlaceholder}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="bg-secondary border-border text-foreground resize-none"
                rows={2}
              />
            </div>

            {/* 日付 */}
            <div className="space-y-2">
              <Label className="text-muted-foreground">{t.common.date}</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="bg-secondary border-border text-foreground"
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-food hover:bg-food/90 text-background font-medium"
            >
              記録する
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* 履歴 */}
      <Card className="bg-card border-border">
        <CardContent className="p-4">
          <h3 className="mb-3 text-sm font-medium text-muted-foreground">{t.mental.mentalHistory}</h3>
          {sortedEntries.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">{t.common.noRecords}</p>
          ) : (
            <div className="space-y-2">
              {sortedEntries.map((entry) => {
                const overall = overallScore(entry.mood, entry.energy, entry.stress, entry.focus)
                return (
                  <div
                    key={entry.id}
                    className="group rounded-lg bg-secondary/40 p-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-16 shrink-0">
                        <MiniBar
                          mood={entry.mood}
                          energy={entry.energy}
                          stress={entry.stress}
                          focus={entry.focus}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">{entry.date}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-foreground">
                              {overall}
                            </span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => onDelete(entry.id)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex gap-2 mt-1 text-[10px] text-muted-foreground">
                          <span style={{ color: '#22d3a0' }}>気{entry.mood}</span>
                          <span style={{ color: '#facc15' }}>{t.mental.historyEnergy}{entry.energy}</span>
                          <span style={{ color: '#ef4444' }}>{t.mental.historyStress}{entry.stress}</span>
                          <span style={{ color: '#a78bfa' }}>{t.mental.historyFocus}{entry.focus}</span>
                        </div>
                        {entry.factors && entry.factors.length > 0 && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {entry.factors.map(f => (
                              <span key={f} className="text-[9px] rounded-full bg-secondary px-1.5 py-0 text-muted-foreground">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                        {entry.notes && (
                          <p className="mt-1 text-xs text-muted-foreground">{entry.notes}</p>
                        )}
                      </div>
                    </div>
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
