// ネイティブ (iOS HealthKit / Android Health Connect) からヘルスデータを読み取るための薄いラッパー。
// Webブラウザでは常に available=false を返し、UIは Sync ボタンを無効化する。

import { Capacitor } from '@capacitor/core'
import { Health } from '@capgo/capacitor-health'
import type { HealthSource } from './types'

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
// 例: steps のサンプル (1時間ごと) → YYYY-MM-DD ごとに合計
export async function fetchDailySums(
  source: HealthSource,
  daysBack: number = 7
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
    // ローカル日付でバケット化
    const byDate = new Map<string, number>()
    for (const sample of samples) {
      const localDate = new Date(sample.startDate)
      const key = [
        localDate.getFullYear(),
        String(localDate.getMonth() + 1).padStart(2, '0'),
        String(localDate.getDate()).padStart(2, '0'),
      ].join('-')
      byDate.set(key, (byDate.get(key) || 0) + sample.value)
    }
    return Array.from(byDate.entries())
      .map(([date, value]) => ({ date, value }))
      .sort((a, b) => a.date.localeCompare(b.date))
  } catch (err) {
    console.error('[native-health] readSamples failed', err)
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
