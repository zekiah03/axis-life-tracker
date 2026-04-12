// 通知ユーティリティ。
// Web: Notification API (ブラウザ通知)
// Native: @capacitor/local-notifications (将来追加)
//
// 現状は Web Notification API をベースに実装。
// Capacitor プラグインは後から差し替え可能な抽象レイヤー。

import { Capacitor } from '@capacitor/core'

export interface ReminderConfig {
  dailyReminder: boolean
  dailyReminderTime: string // HH:MM
  goalAlert: boolean
}

export const DEFAULT_REMINDER_CONFIG: ReminderConfig = {
  dailyReminder: false,
  dailyReminderTime: '21:00',
  goalAlert: true,
}

// 通知権限を要求
export async function requestPermission(): Promise<boolean> {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  if (Notification.permission === 'granted') return true
  if (Notification.permission === 'denied') return false
  const result = await Notification.requestPermission()
  return result === 'granted'
}

export function isPermissionGranted(): boolean {
  if (typeof window === 'undefined') return false
  if (!('Notification' in window)) return false
  return Notification.permission === 'granted'
}

export function isNotificationSupported(): boolean {
  if (typeof window === 'undefined') return false
  return 'Notification' in window
}

// 即時通知を発火
export function showNotification(title: string, body: string, tag?: string) {
  if (!isPermissionGranted()) return
  try {
    new Notification(title, {
      body,
      tag: tag || 'axis-notification',
      icon: '/icon.svg',
      badge: '/icon.svg',
    })
  } catch (err) {
    console.error('[notifications] showNotification failed', err)
  }
}

// 日次リマインダー用のスケジューラ。
// Web では setInterval で毎分チェック。
// ページが閉じてると動かないが、PWA/ネイティブでは Service Worker で対応可能。
let reminderInterval: ReturnType<typeof setInterval> | null = null
let lastFiredDate: string | null = null

export function startDailyReminderCheck(
  config: ReminderConfig,
  checkHasRecordToday: () => boolean,
  t: { title: string; body: string }
) {
  stopDailyReminderCheck()
  if (!config.dailyReminder) return
  if (!isPermissionGranted()) return

  reminderInterval = setInterval(() => {
    const now = new Date()
    const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    const today = now.toISOString().split('T')[0]

    // 設定時刻を過ぎていて、今日まだ発火していなくて、記録が無い場合のみ
    if (hhmm >= config.dailyReminderTime && lastFiredDate !== today) {
      if (!checkHasRecordToday()) {
        showNotification(t.title, t.body, 'axis-daily-reminder')
        lastFiredDate = today
      }
    }
  }, 60_000) // 1分ごとにチェック
}

export function stopDailyReminderCheck() {
  if (reminderInterval !== null) {
    clearInterval(reminderInterval)
    reminderInterval = null
  }
}

// 目標達成通知 (呼び出し元でしきい値判定してから呼ぶ)
export function notifyGoalAchieved(title: string, body: string) {
  if (!isPermissionGranted()) return
  showNotification(title, body, 'axis-goal')
}
