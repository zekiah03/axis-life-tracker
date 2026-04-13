// ルールベースのデータ分析エンジン。AIは使わない。
// 全タブのデータを横断して「変化」「傾向」「相関」を検出する。

import type {
  Transaction,
  WorkoutSession,
  FoodEntry,
  FoodGoal,
  SleepEntry,
  BodyEntry,
  ActivityEntry,
  MentalEntry,
  HabitEntry,
  MetricDefinition,
  MetricEntry,
} from './types'
import { sessionVolume } from './workout-stats'

// --- 型定義 ---

export type TrendDirection = 'up' | 'down' | 'stable'
export type InsightType = 'positive' | 'warning' | 'neutral' | 'achievement'

export interface TrendPoint {
  date: string
  value: number
}

export interface TrendLine {
  label: string
  color: string
  unit: string
  points: TrendPoint[] // 直近14日
  current: number // 今週平均
  previous: number // 先週平均
  direction: TrendDirection
  changePercent: number // 先週→今週の変化率
}

export interface Insight {
  type: InsightType
  title: string
  description: string
  relatedMetric?: string
}

export interface WeeklyScore {
  overall: number // 0-100
  categories: {
    label: string
    score: number // 0-100
    color: string
  }[]
}

// --- ユーティリティ ---

function getDaysAgo(n: number): Date {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - n)
  return d
}

function dateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function avg(arr: number[]): number {
  if (arr.length === 0) return 0
  return arr.reduce((s, v) => s + v, 0) / arr.length
}

function trend(current: number, previous: number): TrendDirection {
  if (previous === 0) return current > 0 ? 'up' : 'stable'
  const pct = ((current - previous) / previous) * 100
  if (pct > 5) return 'up'
  if (pct < -5) return 'down'
  return 'stable'
}

function changePct(current: number, previous: number): number {
  if (previous === 0) return current > 0 ? 100 : 0
  return ((current - previous) / previous) * 100
}

// 直近14日の日次値マップを作る
function dailyMap(dates: string[], values: number[]): Map<string, number> {
  const map = new Map<string, number>()
  for (let i = 0; i < dates.length; i++) {
    const d = dates[i]
    map.set(d, (map.get(d) || 0) + values[i])
  }
  return map
}

// 14日分のTrendPointを生成
function makeTrendPoints(map: Map<string, number>): TrendPoint[] {
  const points: TrendPoint[] = []
  for (let i = 13; i >= 0; i--) {
    const d = dateStr(getDaysAgo(i))
    points.push({ date: d, value: map.get(d) || 0 })
  }
  return points
}

// 今週 (0-6日前) と先週 (7-13日前) の平均
function weekAvgs(points: TrendPoint[]): { current: number; previous: number } {
  const thisWeek = points.slice(7).map(p => p.value)
  const lastWeek = points.slice(0, 7).map(p => p.value)
  return { current: avg(thisWeek), previous: avg(lastWeek) }
}

// --- トレンドライン生成 ---

export interface AnalyticsInput {
  transactions: Transaction[]
  workoutSessions: WorkoutSession[]
  foods: FoodEntry[]
  foodGoal: FoodGoal
  sleeps: SleepEntry[]
  bodies: BodyEntry[]
  activities: ActivityEntry[]
  mentalEntries: MentalEntry[]
  habitEntries: HabitEntry[]
  metrics: MetricDefinition[]
  metricEntries: MetricEntry[]
}

export function computeTrends(input: AnalyticsInput): TrendLine[] {
  const lines: TrendLine[] = []
  const fourteenAgo = getDaysAgo(14)

  // 1. カロリー
  const recentFoods = input.foods.filter(f => new Date(f.date) >= fourteenAgo)
  if (recentFoods.length > 0) {
    const map = dailyMap(recentFoods.map(f => f.date), recentFoods.map(f => f.calories))
    const points = makeTrendPoints(map)
    const { current, previous } = weekAvgs(points)
    lines.push({
      label: 'カロリー',
      color: '#a78bfa',
      unit: 'kcal',
      points,
      current: Math.round(current),
      previous: Math.round(previous),
      direction: trend(current, previous),
      changePercent: changePct(current, previous),
    })
  }

  // 2. ワークアウトボリューム
  const recentSessions = input.workoutSessions.filter(
    s => s.endedAt && new Date(s.date) >= fourteenAgo
  )
  if (recentSessions.length > 0) {
    const map = dailyMap(
      recentSessions.map(s => s.date),
      recentSessions.map(s => sessionVolume(s))
    )
    const points = makeTrendPoints(map)
    const { current, previous } = weekAvgs(points)
    lines.push({
      label: 'ワークアウト',
      color: '#f97316',
      unit: 'kg',
      points,
      current: Math.round(current),
      previous: Math.round(previous),
      direction: trend(current, previous),
      changePercent: changePct(current, previous),
    })
  }

  // 3. 睡眠時間
  const recentSleeps = input.sleeps.filter(s => new Date(s.date) >= fourteenAgo)
  if (recentSleeps.length > 0) {
    const map = new Map<string, number>()
    for (const s of recentSleeps) {
      if (!map.has(s.date) || s.createdAt > (map.get(s.date + '_t') || 0)) {
        map.set(s.date, s.duration / 60)
        map.set(s.date + '_t', s.createdAt)
      }
    }
    // _t キーを除去
    const cleanMap = new Map<string, number>()
    for (const [k, v] of map) { if (!k.endsWith('_t')) cleanMap.set(k, v) }
    const points = makeTrendPoints(cleanMap)
    const { current, previous } = weekAvgs(points)
    lines.push({
      label: '睡眠',
      color: '#60a5fa',
      unit: 'h',
      points,
      current: Math.round(current * 10) / 10,
      previous: Math.round(previous * 10) / 10,
      direction: trend(current, previous),
      changePercent: changePct(current, previous),
    })
  }

  // 4. 体重
  const recentBodies = input.bodies.filter(b => new Date(b.date) >= fourteenAgo)
  if (recentBodies.length > 0) {
    const map = new Map<string, number>()
    for (const b of recentBodies) map.set(b.date, b.weight)
    const points = makeTrendPoints(map)
    // 体重は日付がない日は直前の値をキャリーフォワード
    let lastVal = 0
    for (const p of points) {
      if (p.value > 0) lastVal = p.value
      else p.value = lastVal
    }
    const { current, previous } = weekAvgs(points)
    lines.push({
      label: '体重',
      color: '#ec4899',
      unit: 'kg',
      points,
      current: Math.round(current * 10) / 10,
      previous: Math.round(previous * 10) / 10,
      direction: trend(current, previous),
      changePercent: changePct(current, previous),
    })
  }

  // 5. メンタル総合
  const recentMental = input.mentalEntries.filter(e => new Date(e.date) >= fourteenAgo)
  if (recentMental.length > 0) {
    const map = new Map<string, number>()
    for (const m of recentMental) {
      const overall = (m.mood + m.energy + (10 - m.stress) + m.focus) / 4
      map.set(m.date, overall)
    }
    const points = makeTrendPoints(map)
    const { current, previous } = weekAvgs(points)
    lines.push({
      label: 'メンタル',
      color: '#a78bfa',
      unit: '/10',
      points,
      current: Math.round(current * 10) / 10,
      previous: Math.round(previous * 10) / 10,
      direction: trend(current, previous),
      changePercent: changePct(current, previous),
    })
  }

  return lines
}

// --- インサイト (自動検出) ---

export function detectInsights(input: AnalyticsInput): Insight[] {
  const insights: Insight[] = []
  const today = dateStr(new Date())
  const sevenAgo = getDaysAgo(7)
  const fourteenAgo = getDaysAgo(14)

  // 1. 記録継続日数 (最大60日遡り)
  let streak = 0
  const d = new Date()
  let skipped = false
  for (let i = 0; i < 60; i++) {
    const ds = dateStr(d)
    const hasAny =
      input.transactions.some(t => t.date === ds) ||
      input.foods.some(f => f.date === ds) ||
      input.workoutSessions.some(s => s.date === ds) ||
      input.sleeps.some(s => s.date === ds) ||
      input.bodies.some(b => b.date === ds) ||
      input.mentalEntries.some(e => e.date === ds) ||
      input.habitEntries.some(e => e.date === ds) ||
      input.metricEntries.some(e => e.date === ds) ||
      input.activities.some(a => a.date === ds)
    if (hasAny) {
      streak++
    } else if (streak === 0 && !skipped) {
      skipped = true // 今日データなしなら1日だけスキップ
    } else {
      break
    }
    d.setDate(d.getDate() - 1)
  }
  if (streak >= 7) {
    insights.push({
      type: 'achievement',
      title: `${streak}日連続記録中`,
      description: '素晴らしい継続力です。この調子で続けましょう。',
    })
  }

  // 2. 睡眠の変化
  const thisWeekSleeps = input.sleeps.filter(s => new Date(s.date) >= sevenAgo)
  const lastWeekSleeps = input.sleeps.filter(s => {
    const d = new Date(s.date)
    return d >= fourteenAgo && d < sevenAgo
  })
  if (thisWeekSleeps.length >= 3 && lastWeekSleeps.length >= 3) {
    const thisAvg = avg(thisWeekSleeps.map(s => s.duration))
    const lastAvg = avg(lastWeekSleeps.map(s => s.duration))
    const diff = thisAvg - lastAvg
    if (diff > 20) {
      insights.push({
        type: 'positive',
        title: '睡眠時間が改善',
        description: `先週より平均${Math.round(diff)}分多く寝ています。`,
        relatedMetric: 'sleep',
      })
    } else if (diff < -20) {
      insights.push({
        type: 'warning',
        title: '睡眠時間が減少',
        description: `先週より平均${Math.round(Math.abs(diff))}分少ないです。`,
        relatedMetric: 'sleep',
      })
    }
  }

  // 3. 体重の変化
  const sortedBodies = [...input.bodies].sort((a, b) => a.date.localeCompare(b.date))
  if (sortedBodies.length >= 2) {
    const latest = sortedBodies[sortedBodies.length - 1]
    const twoWeeksAgo = sortedBodies.find(b => new Date(b.date) <= fourteenAgo)
    if (twoWeeksAgo) {
      const diff = latest.weight - twoWeeksAgo.weight
      if (Math.abs(diff) >= 0.5) {
        insights.push({
          type: diff < 0 ? 'positive' : 'neutral',
          title: `体重が${diff > 0 ? '+' : ''}${diff.toFixed(1)}kg`,
          description: `2週間で${Math.abs(diff).toFixed(1)}kgの変化がありました。`,
          relatedMetric: 'body',
        })
      }
    }
  }

  // 4. ワークアウト頻度
  const thisWeekSessions = input.workoutSessions.filter(
    s => s.endedAt && new Date(s.date) >= sevenAgo
  )
  const lastWeekSessions = input.workoutSessions.filter(s => {
    const d = new Date(s.date)
    return s.endedAt && d >= fourteenAgo && d < sevenAgo
  })
  if (thisWeekSessions.length > lastWeekSessions.length && thisWeekSessions.length >= 3) {
    insights.push({
      type: 'positive',
      title: 'ワークアウト頻度UP',
      description: `今週は${thisWeekSessions.length}回。先週の${lastWeekSessions.length}回から増えています。`,
      relatedMetric: 'workout',
    })
  }

  // 5. カロリー目標の達成率
  if (input.foodGoal.calories > 0) {
    const recentDays = new Map<string, number>()
    for (const f of input.foods.filter(f => new Date(f.date) >= sevenAgo)) {
      recentDays.set(f.date, (recentDays.get(f.date) || 0) + f.calories)
    }
    if (recentDays.size >= 3) {
      const withinTarget = Array.from(recentDays.values()).filter(
        cal => cal >= input.foodGoal.calories * 0.8 && cal <= input.foodGoal.calories * 1.2
      ).length
      const pct = (withinTarget / recentDays.size) * 100
      if (pct >= 70) {
        insights.push({
          type: 'positive',
          title: 'カロリー管理が安定',
          description: `直近${recentDays.size}日中${withinTarget}日が目標の±20%以内です。`,
          relatedMetric: 'food',
        })
      }
    }
  }

  // 6. メンタルの変化
  const thisWeekMental = input.mentalEntries.filter(e => new Date(e.date) >= sevenAgo)
  const lastWeekMental = input.mentalEntries.filter(e => {
    const d = new Date(e.date)
    return d >= fourteenAgo && d < sevenAgo
  })
  if (thisWeekMental.length >= 3 && lastWeekMental.length >= 3) {
    const thisAvg = avg(thisWeekMental.map(m => (m.mood + m.energy + (10 - m.stress) + m.focus) / 4))
    const lastAvg = avg(lastWeekMental.map(m => (m.mood + m.energy + (10 - m.stress) + m.focus) / 4))
    if (thisAvg - lastAvg > 0.5) {
      insights.push({
        type: 'positive',
        title: 'メンタルスコアが上昇',
        description: `先週${lastAvg.toFixed(1)}→今週${thisAvg.toFixed(1)}。調子が良い傾向です。`,
        relatedMetric: 'mental',
      })
    } else if (lastAvg - thisAvg > 0.5) {
      insights.push({
        type: 'warning',
        title: 'メンタルスコアが低下',
        description: `先週${lastAvg.toFixed(1)}→今週${thisAvg.toFixed(1)}。休息を意識しましょう。`,
        relatedMetric: 'mental',
      })
    }
  }

  // 7. 支出の変化
  const thisMonth = today.slice(0, 7)
  const lastMonthDate = new Date()
  lastMonthDate.setMonth(lastMonthDate.getMonth() - 1)
  const lastMonth = dateStr(lastMonthDate).slice(0, 7)
  const thisMonthExpense = input.transactions
    .filter(t => t.type === '支出' && t.date.startsWith(thisMonth))
    .reduce((s, t) => s + t.amount, 0)
  const lastMonthExpense = input.transactions
    .filter(t => t.type === '支出' && t.date.startsWith(lastMonth))
    .reduce((s, t) => s + t.amount, 0)
  if (lastMonthExpense > 0 && thisMonthExpense > 0) {
    const dayOfMonth = new Date().getDate()
    const projected = (thisMonthExpense / dayOfMonth) * 30
    if (projected > lastMonthExpense * 1.2) {
      insights.push({
        type: 'warning',
        title: '支出ペースが高い',
        description: `このペースだと今月の支出は約${Math.round(projected / 1000)}万円。先月は${Math.round(lastMonthExpense / 1000)}万円でした。`,
        relatedMetric: 'money',
      })
    }
  }

  // === クロスデータ相関 ===

  // 8. 運動→睡眠の相関
  if (input.sleeps.length >= 5 && (input.workoutSessions.length > 0 || input.activities.length > 0)) {
    const sleepByDate = new Map(input.sleeps.map(s => [s.date, s.duration]))
    const exerciseDates = new Set([
      ...input.workoutSessions.filter(s => s.endedAt).map(s => s.date),
      ...input.activities.filter(a => a.type === 'cardio').map(a => a.date),
    ])
    const afterExercise: number[] = []
    const noExercise: number[] = []
    for (const [date, duration] of sleepByDate) {
      const prevDate = dateStr(new Date(new Date(date).getTime() - 86400000))
      if (exerciseDates.has(prevDate)) afterExercise.push(duration)
      else noExercise.push(duration)
    }
    if (afterExercise.length >= 2 && noExercise.length >= 2) {
      const diff = avg(afterExercise) - avg(noExercise)
      if (diff > 15) {
        insights.push({
          type: 'positive',
          title: '運動した日は睡眠が良い',
          description: `運動した翌日は平均${Math.round(diff)}分長く寝ています。`,
          relatedMetric: 'sleep',
        })
      }
    }
  }

  // 9. 睡眠→メンタル相関
  if (input.sleeps.length >= 5 && input.mentalEntries.length >= 5) {
    const sleepByDate = new Map(input.sleeps.map(s => [s.date, s.duration / 60]))
    const goodSleepMental: number[] = []
    const badSleepMental: number[] = []
    for (const m of input.mentalEntries) {
      const sleepHours = sleepByDate.get(m.date)
      if (sleepHours === undefined) continue
      const score = (m.mood + m.energy + (10 - m.stress) + m.focus) / 4
      if (sleepHours >= 7) goodSleepMental.push(score)
      else badSleepMental.push(score)
    }
    if (goodSleepMental.length >= 2 && badSleepMental.length >= 2) {
      const diff = avg(goodSleepMental) - avg(badSleepMental)
      if (diff > 0.5) {
        insights.push({
          type: 'positive',
          title: '十分な睡眠がメンタルに好影響',
          description: `7時間以上寝た日はメンタルスコアが平均${diff.toFixed(1)}高いです。`,
          relatedMetric: 'mental',
        })
      }
    }
  }

  // 10. カフェイン→睡眠
  const caffeineMetric = input.metrics.find(m => m.name === 'カフェイン')
  if (caffeineMetric && input.sleeps.length >= 5) {
    const caffeineByDate = new Map<string, number>()
    for (const e of input.metricEntries.filter(e => e.metricId === caffeineMetric.id)) {
      caffeineByDate.set(e.date, (caffeineByDate.get(e.date) || 0) + e.value)
    }
    const highCaffSleep: number[] = []
    const lowCaffSleep: number[] = []
    for (const s of input.sleeps) {
      const caff = caffeineByDate.get(s.date) || 0
      if (caff > 200) highCaffSleep.push(s.duration)
      else lowCaffSleep.push(s.duration)
    }
    if (highCaffSleep.length >= 2 && lowCaffSleep.length >= 2) {
      const diff = avg(lowCaffSleep) - avg(highCaffSleep)
      if (diff > 15) {
        insights.push({
          type: 'warning',
          title: 'カフェインが睡眠に影響',
          description: `カフェイン200mg超の日は睡眠が平均${Math.round(diff)}分短くなっています。`,
          relatedMetric: 'sleep',
        })
      }
    }
  }

  // === 曜日別パフォーマンス ===
  if (input.mentalEntries.length >= 14) {
    const byDow: number[][] = [[], [], [], [], [], [], []]
    const dowNames = ['日', '月', '火', '水', '木', '金', '土']
    for (const m of input.mentalEntries) {
      const dow = new Date(m.date).getDay()
      byDow[dow].push((m.mood + m.energy + (10 - m.stress) + m.focus) / 4)
    }
    const dowAvgs = byDow.map((arr, i) => ({ dow: i, avg: arr.length > 0 ? avg(arr) : 0, count: arr.length })).filter(d => d.count >= 2)
    if (dowAvgs.length >= 5) {
      const best = dowAvgs.reduce((a, b) => a.avg > b.avg ? a : b)
      const worst = dowAvgs.reduce((a, b) => a.avg < b.avg ? a : b)
      if (best.avg - worst.avg > 0.5) {
        insights.push({
          type: 'neutral',
          title: `${dowNames[best.dow]}曜日が最も調子が良い`,
          description: `${dowNames[best.dow]}曜(${best.avg.toFixed(1)}) vs ${dowNames[worst.dow]}曜(${worst.avg.toFixed(1)})。曜日で調子に差があります。`,
          relatedMetric: 'mental',
        })
      }
    }
  }

  // === 目標達成率 ===
  if (input.foodGoal.calories > 0 && input.foods.length >= 7) {
    const last30 = getDaysAgo(30)
    const dayCalories = new Map<string, number>()
    for (const f of input.foods.filter(f => new Date(f.date) >= last30)) {
      dayCalories.set(f.date, (dayCalories.get(f.date) || 0) + f.calories)
    }
    if (dayCalories.size >= 7) {
      const achieved = Array.from(dayCalories.values()).filter(
        c => c >= input.foodGoal.calories * 0.8 && c <= input.foodGoal.calories * 1.2
      ).length
      const rate = Math.round((achieved / dayCalories.size) * 100)
      insights.push({
        type: rate >= 70 ? 'positive' : rate >= 40 ? 'neutral' : 'warning',
        title: `カロリー目標達成率 ${rate}%`,
        description: `直近${dayCalories.size}日中${achieved}日が目標の±20%以内です。`,
        relatedMetric: 'food',
      })
    }
  }

  // === 体重予測 ===
  const sortedBodiesAll = [...input.bodies].sort((a, b) => a.date.localeCompare(b.date))
  if (sortedBodiesAll.length >= 4) {
    const recent = sortedBodiesAll.slice(-14)
    if (recent.length >= 4) {
      const first = recent[0]
      const last = recent[recent.length - 1]
      const days = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000
      if (days >= 7) {
        const ratePerWeek = ((last.weight - first.weight) / days) * 7
        if (Math.abs(ratePerWeek) >= 0.1) {
          const projected3w = last.weight + ratePerWeek * 3
          insights.push({
            type: ratePerWeek > 0.5 ? 'warning' : ratePerWeek < -1 ? 'warning' : 'neutral',
            title: `体重予測: 3週間後 ${projected3w.toFixed(1)}kg`,
            description: `現在のペース(週${ratePerWeek > 0 ? '+' : ''}${ratePerWeek.toFixed(2)}kg)が続いた場合の推定値です。`,
            relatedMetric: 'body',
          })
        }
      }
    }
  }

  // === PFCバランス偏り ===
  if (input.foods.length >= 14 && input.foodGoal.protein > 0) {
    const last14 = input.foods.filter(f => new Date(f.date) >= fourteenAgo)
    const dayProtein = new Map<string, number>()
    for (const f of last14) dayProtein.set(f.date, (dayProtein.get(f.date) || 0) + f.protein)
    if (dayProtein.size >= 5) {
      const avgP = avg(Array.from(dayProtein.values()))
      const ratio = avgP / input.foodGoal.protein
      if (ratio < 0.7) {
        insights.push({
          type: 'warning',
          title: 'タンパク質が不足気味',
          description: `直近の平均${Math.round(avgP)}g/日。目標${input.foodGoal.protein}gの${Math.round(ratio * 100)}%です。`,
          relatedMetric: 'food',
        })
      }
    }
  }

  // === 習慣の衰退検出 ===
  const habitTypes = ['study', 'reading', 'meditation'] as const
  for (const ht of habitTypes) {
    const thisWeekH = input.habitEntries.filter(e => e.habitType === ht && new Date(e.date) >= sevenAgo)
    const lastWeekH = input.habitEntries.filter(e => {
      const d = new Date(e.date)
      return e.habitType === ht && d >= fourteenAgo && d < sevenAgo
    })
    if (lastWeekH.length >= 3 && thisWeekH.length < lastWeekH.length * 0.5) {
      const labels: Record<string, string> = { study: '勉強', reading: '読書', meditation: '瞑想' }
      insights.push({
        type: 'warning',
        title: `${labels[ht]}の頻度が低下`,
        description: `先週${lastWeekH.length}回→今週${thisWeekH.length}回。ペースが落ちています。`,
      })
    }
  }

  // === 今週のハイライト ===
  // 最高睡眠スコア
  const weekSleepScores = input.sleeps
    .filter(s => new Date(s.date) >= sevenAgo && s.autoScore !== undefined)
    .sort((a, b) => (b.autoScore || 0) - (a.autoScore || 0))
  if (weekSleepScores.length > 0 && (weekSleepScores[0].autoScore || 0) >= 80) {
    insights.push({
      type: 'achievement',
      title: `今週のベスト睡眠: ${weekSleepScores[0].autoScore}点`,
      description: `${weekSleepScores[0].date}の睡眠スコアが優秀でした。`,
      relatedMetric: 'sleep',
    })
  }

  // 最高メンタル日
  const weekMentalBest = input.mentalEntries
    .filter(e => new Date(e.date) >= sevenAgo)
    .map(m => ({ date: m.date, score: (m.mood + m.energy + (10 - m.stress) + m.focus) / 4 }))
    .sort((a, b) => b.score - a.score)
  if (weekMentalBest.length > 0 && weekMentalBest[0].score >= 7) {
    insights.push({
      type: 'achievement',
      title: `今週のベストデー: ${weekMentalBest[0].date}`,
      description: `メンタルスコア${weekMentalBest[0].score.toFixed(1)}/10。最も調子が良い日でした。`,
      relatedMetric: 'mental',
    })
  }

  return insights
}

// --- 総合スコア ---

export function computeWeeklyScore(input: AnalyticsInput): WeeklyScore | null {
  const sevenAgo = getDaysAgo(7)
  const categories: WeeklyScore['categories'] = []
  let hasAny = false

  // 運動: 週3回以上で100点、0回で0点
  const weekSessions = input.workoutSessions.filter(
    s => s.endedAt && new Date(s.date) >= sevenAgo
  ).length
  const weekCardio = input.activities.filter(
    a => a.type === 'cardio' && new Date(a.date) >= sevenAgo
  ).length
  const totalExercise = weekSessions + weekCardio
  if (totalExercise > 0 || input.workoutSessions.length > 0) {
    categories.push({
      label: '運動',
      score: Math.min(100, Math.round((totalExercise / 4) * 100)),
      color: '#f97316',
    })
    hasAny = true
  }

  // 栄養: カロリー目標の達成率 (±20%以内の日数割合)
  if (input.foodGoal.calories > 0) {
    const dayMap = new Map<string, number>()
    for (const f of input.foods.filter(f => new Date(f.date) >= sevenAgo)) {
      dayMap.set(f.date, (dayMap.get(f.date) || 0) + f.calories)
    }
    if (dayMap.size > 0) {
      const good = Array.from(dayMap.values()).filter(
        c => c >= input.foodGoal.calories * 0.8 && c <= input.foodGoal.calories * 1.2
      ).length
      categories.push({
        label: '栄養',
        score: Math.round((good / dayMap.size) * 100),
        color: '#a78bfa',
      })
      hasAny = true
    }
  }

  // 睡眠: 7-9時間で100点
  const weekSleeps = input.sleeps.filter(s => new Date(s.date) >= sevenAgo)
  if (weekSleeps.length > 0) {
    const avgHours = avg(weekSleeps.map(s => s.duration / 60))
    let sleepScore = 100
    if (avgHours < 6) sleepScore = Math.round((avgHours / 6) * 60)
    else if (avgHours < 7) sleepScore = 60 + Math.round(((avgHours - 6) / 1) * 40)
    else if (avgHours <= 9) sleepScore = 100
    else sleepScore = Math.max(0, 100 - Math.round((avgHours - 9) * 30))
    categories.push({ label: '睡眠', score: sleepScore, color: '#60a5fa' })
    hasAny = true
  }

  // メンタル: 総合 /10 を /100 にスケール
  const weekMental = input.mentalEntries.filter(e => new Date(e.date) >= sevenAgo)
  if (weekMental.length > 0) {
    const mentalAvg = avg(
      weekMental.map(m => (m.mood + m.energy + (10 - m.stress) + m.focus) / 4)
    )
    categories.push({
      label: 'メンタル',
      score: Math.round(mentalAvg * 10),
      color: '#22d3a0',
    })
    hasAny = true
  }

  // 継続: 記録した日数 / 7
  const recordDays = new Set<string>()
  for (let i = 0; i < 7; i++) {
    const ds = dateStr(getDaysAgo(i))
    const has =
      input.transactions.some(t => t.date === ds) ||
      input.foods.some(f => f.date === ds) ||
      input.workoutSessions.some(s => s.date === ds) ||
      input.sleeps.some(s => s.date === ds) ||
      input.mentalEntries.some(e => e.date === ds) ||
      input.habitEntries.some(e => e.date === ds) ||
      input.metricEntries.some(e => e.date === ds)
    if (has) recordDays.add(ds)
  }
  if (recordDays.size > 0) {
    categories.push({
      label: '継続',
      score: Math.round((recordDays.size / 7) * 100),
      color: '#f97316',
    })
    hasAny = true
  }

  if (!hasAny) return null

  const overall = Math.round(avg(categories.map(c => c.score)))
  return { overall, categories }
}
