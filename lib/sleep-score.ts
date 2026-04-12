// Fitbit/Oura 風の睡眠スコア算出。
// 一晩の睡眠セッションを受け取り、0-100 のスコアを返す。
//
// 内訳(典型的な実装):
//  - Duration (40点): 総睡眠時間 7-9時間 で満点
//  - Deep sleep (30点): 総睡眠時間の 13-23% が最適
//  - REM sleep (20点): 総睡眠時間の 20-25% が最適
//  - Restlessness (10点): 覚醒時間/中断回数が少ないほど高得点
//
// 参考: Fitbit Sleep Score は類似の重み付けで、研究論文
// (Liang & Chapa Martell, 2019) でも 40/25/25/10 程度の配分が示されている。

import type { SleepStages } from './types'

export interface SleepScoreBreakdown {
  total: number // 0-100
  duration: number // 0-40
  deep: number // 0-30
  rem: number // 0-20
  restlessness: number // 0-10
}

// durationMinutes は覚醒を除く総睡眠時間。
// stages は任意。無い場合は duration ベースの簡易スコア(最大80点相当)にフォールバック
export function computeSleepScore(
  durationMinutes: number,
  stages?: SleepStages
): SleepScoreBreakdown {
  // --- Duration (40点) ---
  // 7-9時間 (420-540分) で満点。短すぎ/長すぎで減点
  const durationScore = (() => {
    const hours = durationMinutes / 60
    if (hours >= 7 && hours <= 9) return 40
    if (hours >= 6 && hours < 7) return 40 * (hours - 5) // 6h=10, 7h=40
    if (hours > 9 && hours <= 10) return 40 - (hours - 9) * 20 // 10h=20
    if (hours >= 5 && hours < 6) return 40 * (hours - 5) * 0.5 // 5h=0, 6h=10 近辺
    if (hours > 10 && hours <= 12) return 20 - (hours - 10) * 10 // 12h=0
    return 0
  })()

  if (!stages) {
    // ステージ情報が無い場合は duration に 0.8 を掛けて暫定スコア
    return {
      total: Math.round(durationScore * 2), // 40点 → 80点 にスケール
      duration: durationScore,
      deep: 0,
      rem: 0,
      restlessness: 0,
    }
  }

  // --- Deep sleep (30点) ---
  // 総睡眠の 13-23% で満点
  const deepRatio = stages.deepMinutes / Math.max(1, durationMinutes)
  const deepScore = (() => {
    if (deepRatio >= 0.13 && deepRatio <= 0.23) return 30
    if (deepRatio < 0.13) return 30 * (deepRatio / 0.13)
    if (deepRatio > 0.23) return Math.max(0, 30 - (deepRatio - 0.23) * 100)
    return 0
  })()

  // --- REM sleep (20点) ---
  // 総睡眠の 20-25% で満点
  const remRatio = stages.remMinutes / Math.max(1, durationMinutes)
  const remScore = (() => {
    if (remRatio >= 0.2 && remRatio <= 0.25) return 20
    if (remRatio < 0.2) return 20 * (remRatio / 0.2)
    if (remRatio > 0.25) return Math.max(0, 20 - (remRatio - 0.25) * 80)
    return 0
  })()

  // --- Restlessness (10点) ---
  // 覚醒時間が総就寝時間の 5% 未満で満点、20% 以上で 0 点
  const totalInBed = durationMinutes + stages.awakeMinutes
  const awakeRatio = stages.awakeMinutes / Math.max(1, totalInBed)
  const restlessnessScore = (() => {
    if (awakeRatio <= 0.05) return 10
    if (awakeRatio >= 0.2) return 0
    return 10 * (1 - (awakeRatio - 0.05) / 0.15)
  })()

  const total = durationScore + deepScore + remScore + restlessnessScore
  return {
    total: Math.round(Math.max(0, Math.min(100, total))),
    duration: Math.round(durationScore),
    deep: Math.round(deepScore),
    rem: Math.round(remScore),
    restlessness: Math.round(restlessnessScore),
  }
}

export function scoreLabel(score: number): { label: string; color: string } {
  if (score >= 90) return { label: '最高', color: '#22d3a0' }
  if (score >= 80) return { label: 'とても良い', color: '#22d3a0' }
  if (score >= 70) return { label: '良い', color: '#60a5fa' }
  if (score >= 60) return { label: 'まあまあ', color: '#facc15' }
  if (score >= 50) return { label: '普通', color: '#f97316' }
  return { label: '悪い', color: '#ef4444' }
}
