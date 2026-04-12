// ネイティブ (iOS HealthKit / Android Health Connect) からヘルスデータを読み取るための薄いラッパー。
// Webブラウザでは常に available=false を返し、UIは Sync ボタンを無効化する。

import { Capacitor } from '@capacitor/core'
import { Health } from '@capgo/capacitor-health'
import type { HealthSource, SleepStages } from './types'

export interface NativeHealthAvailability {
  available: boolean
  platform: 'ios' | 'android' | 'web'
  reason?: string
}

export interface DailySum {
  date: string // YYYY-MM-DD (ローカルタイムゾーン基準)
  value: number
}

export async function getAvailability(): Promise<NativeHealthAvailability> {
  // WebView の外 (ブラウザ) では Capacitor.isNativePlatform() が false
  if (!Capacitor.isNativePlatform()) {
    return { available: false, platform: 'web', reason: 'Webブラウザでは利用できません' }
  }
  try {
    const result = await Health.isAvailable()
    return {
      available: result.available,
      platform: (result.platform as 'ios' | 'android') ?? 'android',
      reason: result.reason,
    }
  } catch (err) {
    return {
      available: false,
      platform: 'android',
      reason: err instanceof Error ? err.message : String(err),
    }
  }
}

export async function requestAccess(sources: HealthSource[]): Promise<boolean> {
  if (!Capacitor.isNativePlatform()) return false
  try {
    const status = await Health.requestAuthorization({ read: sources })
    // 1 つでも authorize されていれば true
    return status.readAuthorized.length > 0
  } catch (err) {
    console.error('[native-health] requestAuthorization failed', err)
    return false
  }
}

// ローカル日付の 0時 を ISO 文字列で返す
function startOfDayIso(daysAgo: number): string {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  d.setDate(d.getDate() - daysAgo)
  return d.toISOString()
}

// 日次集計してラベル付きで返す。ソース側は時系列サンプルなので集計はここで行う。
// aggregation:
//   - 'sum'     → その日の合計 (歩数・距離・階数など)
//   - 'latest'  → その日の最新サンプル値 (体重・HRV・体温など)
//   - 'average' → その日の平均 (気分など)
export async function fetchDailyValues(
  source: HealthSource,
  daysBack: number = 7,
  aggregation: 'sum' | 'latest' | 'average' = 'sum'
): Promise<DailySum[]> {
  if (!Capacitor.isNativePlatform()) return []
  const startDate = startOfDayIso(daysBack - 1)
  const endDate = new Date().toISOString()
  try {
    const { samples } = await Health.readSamples({
      dataType: source,
      startDate,
      endDate,
      limit: 10000,
      ascending: true,
    })

    interface Bucket {
      sum: number
      count: number
      latestValue: number
      latestTs: number
    }
    const byDate = new Map<string, Bucket>()
    for (const sample of samples) {
      const localDate = new Date(sample.startDate)
      const key = [
        localDate.getFullYear(),
        String(localDate.getMonth() + 1).padStart(2, '0'),
        String(localDate.getDate()).padStart(2, '0'),
      ].join('-')
      const ts = new Date(sample.endDate).getTime()
      const bucket = byDate.get(key) || { sum: 0, count: 0, latestValue: 0, latestTs: 0 }
      bucket.sum += sample.value
      bucket.count += 1
      if (ts >= bucket.latestTs) {
        bucket.latestTs = ts
        bucket.latestValue = sample.value
      }
      byDate.set(key, bucket)
    }

    return Array.from(byDate.entries())
      .map(([date, bucket]) => {
        let value: number
        switch (aggregation) {
          case 'latest':
            value = bucket.latestValue
            break
          case 'average':
            value = bucket.sum / Math.max(1, bucket.count)
            break
          case 'sum':
          default:
            value = bucket.sum
        }
        return { date, value }
      })
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (err) {
    console.error('[native-health] readSamples failed', err)
    throw err
  }
}

// 後方互換エイリアス (sum固定)
export async function fetchDailySums(
  source: HealthSource,
  daysBack: number = 7
): Promise<DailySum[]> {
  return fetchDailyValues(source, daysBack, 'sum')
}

// --- 睡眠セッション取得 ---
// Health Connect / HealthKit から睡眠のサンプルを取得し、「一晩」単位で集計する。
// 各サンプルは { sleepState, startDate, endDate } の形で返ってくる。
// state = 'asleep' | 'awake' | 'rem' | 'deep' | 'light' | 'inBed'

export interface SleepSession {
  date: string // 起床日 (YYYY-MM-DD)
  bedtime: string // 就寝 HH:MM
  wakeTime: string // 起床 HH:MM
  durationMinutes: number // 総睡眠時間 (awake除く)
  stages: SleepStages
}

function pad(n: number): string {
  return n.toString().padStart(2, '0')
}

function toHHMM(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toYMD(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

// 前後のサンプルが近い (ギャップ < 90分) ものを1つのセッションとしてまとめる
const SESSION_GAP_MS = 90 * 60 * 1000

export async function fetchSleepSessions(daysBack: number = 7): Promise<SleepSession[]> {
  if (!Capacitor.isNativePlatform()) return []

  const start = new Date()
  start.setHours(0, 0, 0, 0)
  start.setDate(start.getDate() - daysBack)
  const startDate = start.toISOString()
  const endDate = new Date().toISOString()

  try {
    const { samples } = await Health.readSamples({
      dataType: 'sleep',
      startDate,
      endDate,
      limit: 5000,
      ascending: true,
    })

    if (samples.length === 0) return []

    // 時間順にクラスタリング
    const clusters: typeof samples[] = []
    let currentCluster: typeof samples = []
    let prevEnd = 0

    for (const sample of samples) {
      const sStart = new Date(sample.startDate).getTime()
      if (currentCluster.length === 0 || sStart - prevEnd < SESSION_GAP_MS) {
        currentCluster.push(sample)
      } else {
        clusters.push(currentCluster)
        currentCluster = [sample]
      }
      prevEnd = Math.max(prevEnd, new Date(sample.endDate).getTime())
    }
    if (currentCluster.length > 0) clusters.push(currentCluster)

    // 各クラスタをセッションに変換
    const sessions: SleepSession[] = []
    for (const cluster of clusters) {
      const clusterStart = new Date(cluster[0].startDate)
      const clusterEnd = new Date(
        Math.max(...cluster.map(s => new Date(s.endDate).getTime()))
      )

      const stages: SleepStages = {
        deepMinutes: 0,
        lightMinutes: 0,
        remMinutes: 0,
        awakeMinutes: 0,
      }

      for (const sample of cluster) {
        const sStart = new Date(sample.startDate).getTime()
        const sEnd = new Date(sample.endDate).getTime()
        const minutes = (sEnd - sStart) / (60 * 1000)
        switch (sample.sleepState) {
          case 'deep':
            stages.deepMinutes += minutes
            break
          case 'rem':
            stages.remMinutes += minutes
            break
          case 'light':
            stages.lightMinutes += minutes
            break
          case 'awake':
            stages.awakeMinutes += minutes
            break
          case 'asleep':
            // 粒度の粗いデータ: stageに分けられないので light に含める
            stages.lightMinutes += minutes
            break
          // 'inBed' は総就寝時間の目安だけなので無視
        }
      }

      const durationMinutes = Math.round(
        stages.deepMinutes + stages.lightMinutes + stages.remMinutes
      )
      if (durationMinutes < 30) continue // 30分未満は昼寝扱いで除外

      sessions.push({
        date: toYMD(clusterEnd), // 起床日
        bedtime: toHHMM(clusterStart),
        wakeTime: toHHMM(clusterEnd),
        durationMinutes,
        stages: {
          deepMinutes: Math.round(stages.deepMinutes),
          lightMinutes: Math.round(stages.lightMinutes),
          remMinutes: Math.round(stages.remMinutes),
          awakeMinutes: Math.round(stages.awakeMinutes),
        },
      })
    }

    return sessions
  } catch (err) {
    console.error('[native-health] fetchSleepSessions failed', err)
    throw err
  }
}

// 最新値を取る (latest 集計向け、心拍数など)
export async function fetchLatestValue(source: HealthSource): Promise<number | null> {
  if (!Capacitor.isNativePlatform()) return null
  const startDate = startOfDayIso(30)
  const endDate = new Date().toISOString()
  try {
    const { samples } = await Health.readSamples({
      dataType: source,
      startDate,
      endDate,
      limit: 50,
      ascending: false,
    })
    if (samples.length === 0) return null
    return samples[0].value
  } catch (err) {
    console.error('[native-health] readSamples (latest) failed', err)
    return null
  }
}
