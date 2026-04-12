// 筋トレのスタッツ計算ユーティリティ。
// Strong / Hevy 等で使われる標準的な数式を採用。

import type { WorkoutSession, SessionExercise, WorkoutSet } from './types'

// 推定1RM: Epley 式 (w * (1 + reps/30))。1RM計算で最も広く使われる。
// reps=1 のときは weight そのもの。warmup セットは除外する。
export function estimate1RM(weight: number, reps: number): number {
  if (weight <= 0 || reps <= 0) return 0
  if (reps === 1) return weight
  return weight * (1 + reps / 30)
}

// 1セットのボリューム (kg * reps)
export function setVolume(set: WorkoutSet): number {
  return set.weight * set.reps
}

// 1種目の合計ボリューム (warmup 除外)
export function exerciseVolume(exercise: SessionExercise): number {
  return exercise.sets
    .filter(s => !s.isWarmup && s.completed)
    .reduce((sum, s) => sum + setVolume(s), 0)
}

// 1セッションの合計ボリューム
export function sessionVolume(session: WorkoutSession): number {
  return session.exercises.reduce((sum, e) => sum + exerciseVolume(e), 0)
}

// 1セッションの合計セット数 (warmup 除く完了分)
export function sessionSetCount(session: WorkoutSession): number {
  return session.exercises.reduce(
    (sum, e) => sum + e.sets.filter(s => !s.isWarmup && s.completed).length,
    0
  )
}

// 1セッションで最大1RMだった種目を返す
export function sessionBest1RM(session: WorkoutSession): { exerciseName: string; oneRM: number } | null {
  let best: { exerciseName: string; oneRM: number } | null = null
  for (const ex of session.exercises) {
    for (const s of ex.sets) {
      if (s.isWarmup || !s.completed) continue
      const oneRM = estimate1RM(s.weight, s.reps)
      if (!best || oneRM > best.oneRM) {
        best = { exerciseName: ex.exerciseName, oneRM }
      }
    }
  }
  return best
}

// 種目ごとの過去最高値を全セッションから計算
export interface ExerciseRecords {
  exerciseName: string
  bestWeight: number // 単一セットの最大重量 (どんな reps でも)
  bestOneRM: number // Epley 式での最大推定1RM
  bestVolume: number // 単一種目の最大合計ボリューム
  lastSession?: {
    date: string
    sets: WorkoutSet[]
  }
}

export function computeExerciseRecords(
  sessions: WorkoutSession[]
): Map<string, ExerciseRecords> {
  const map = new Map<string, ExerciseRecords>()
  // 古い順にソート
  const sorted = [...sessions].sort((a, b) => a.startedAt - b.startedAt)
  for (const session of sorted) {
    for (const ex of session.exercises) {
      const key = ex.exerciseName
      let record = map.get(key)
      if (!record) {
        record = {
          exerciseName: key,
          bestWeight: 0,
          bestOneRM: 0,
          bestVolume: 0,
        }
        map.set(key, record)
      }
      const completedSets = ex.sets.filter(s => !s.isWarmup && s.completed)
      for (const s of completedSets) {
        if (s.weight > record.bestWeight) record.bestWeight = s.weight
        const orm = estimate1RM(s.weight, s.reps)
        if (orm > record.bestOneRM) record.bestOneRM = orm
      }
      const volume = exerciseVolume(ex)
      if (volume > record.bestVolume) record.bestVolume = volume
      // このセッションのセットを lastSession に
      if (completedSets.length > 0) {
        record.lastSession = { date: session.date, sets: completedSets }
      }
    }
  }
  return map
}

// 今セッションが種目別にPRを達成したかチェック (過去全セッションとの比較)
export interface SessionPRs {
  weight: string[] // PRを達成した種目名リスト (重量)
  oneRM: string[]  // 1RM PR
  volume: string[] // ボリュームPR
}

export function detectSessionPRs(
  session: WorkoutSession,
  allSessions: WorkoutSession[]
): SessionPRs {
  // 過去セッション (自分を除く)
  const past = allSessions.filter(s => s.id !== session.id)
  const pastRecords = computeExerciseRecords(past)

  const prs: SessionPRs = { weight: [], oneRM: [], volume: [] }
  for (const ex of session.exercises) {
    const prev = pastRecords.get(ex.exerciseName)
    const completedSets = ex.sets.filter(s => !s.isWarmup && s.completed)
    if (completedSets.length === 0) continue

    const currentBestWeight = Math.max(...completedSets.map(s => s.weight))
    const currentBestOneRM = Math.max(
      ...completedSets.map(s => estimate1RM(s.weight, s.reps))
    )
    const currentVolume = exerciseVolume(ex)

    if (!prev) {
      prs.weight.push(ex.exerciseName)
      prs.oneRM.push(ex.exerciseName)
      prs.volume.push(ex.exerciseName)
      continue
    }
    if (currentBestWeight > prev.bestWeight) prs.weight.push(ex.exerciseName)
    if (currentBestOneRM > prev.bestOneRM) prs.oneRM.push(ex.exerciseName)
    if (currentVolume > prev.bestVolume) prs.volume.push(ex.exerciseName)
  }
  return prs
}

// 週次ボリューム集計 (直近7日)
export function weeklyVolume(sessions: WorkoutSession[]): number {
  const sevenDaysAgo = new Date()
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
  return sessions
    .filter(s => new Date(s.date) >= sevenDaysAgo && s.endedAt)
    .reduce((sum, s) => sum + sessionVolume(s), 0)
}
