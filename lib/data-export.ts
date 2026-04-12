// 全データのエクスポート/インポート。
// localStorage にある axis-* キーを全部1つのJSONに固める。
//
// バージョン管理:
// - AXIS_EXPORT_VERSION を上げた時は読み込み側で migrate する
// - 未来の互換性のために format: 'axis-backup' を埋め込む

export const AXIS_EXPORT_VERSION = 1

export interface AxisBackup {
  format: 'axis-backup'
  version: number
  exportedAt: string // ISO 8601
  appVersion?: string
  data: Record<string, unknown>
}

// エクスポート対象の localStorage キー一覧
// 新規追加時はここに足す
export const EXPORT_KEYS = [
  // Money
  'axis-transactions',
  'axis-money-categories',
  'axis-budgets',
  // Workout
  'axis-workouts', // 旧モデル
  'axis-workout-sessions',
  // Food
  'axis-foods',
  'axis-food-goal',
  'axis-custom-foods',
  'axis-recipes',
  // Sleep / Body
  'axis-sleeps',
  'axis-bodies',
  // Metrics
  'axis-metrics',
  'axis-metric-entries',
  // App state
  'axis-workout-routines',
  'axis-activities',
  'axis-mental',
  'axis-favorite-foods',
  'axis-tab-config-v2',
  'axis-onboarded',
  'axis-widget-config',
  'axis-locale',
  'axis-reminders',
] as const

export type ExportKey = typeof EXPORT_KEYS[number]

export interface DataSummary {
  transactions: number
  workoutSessions: number
  foods: number
  sleeps: number
  bodies: number
  metrics: number
  metricEntries: number
  recipes: number
  customFoods: number
  categories: number
  budgets: number
}

// 現在の localStorage から AxisBackup を構築
export function buildBackup(): AxisBackup {
  const data: Record<string, unknown> = {}
  if (typeof window === 'undefined') {
    return {
      format: 'axis-backup',
      version: AXIS_EXPORT_VERSION,
      exportedAt: new Date().toISOString(),
      data,
    }
  }
  for (const key of EXPORT_KEYS) {
    const raw = window.localStorage.getItem(key)
    if (raw === null) continue
    try {
      data[key] = JSON.parse(raw)
    } catch {
      data[key] = raw // 文字列でもそのまま保持
    }
  }
  return {
    format: 'axis-backup',
    version: AXIS_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    data,
  }
}

// AxisBackup からサマリー (プレビュー用)
export function summarize(backup: AxisBackup): DataSummary {
  const d = backup.data || {}
  const count = (key: ExportKey): number => {
    const v = d[key]
    return Array.isArray(v) ? v.length : 0
  }
  return {
    transactions: count('axis-transactions'),
    workoutSessions: count('axis-workout-sessions'),
    foods: count('axis-foods'),
    sleeps: count('axis-sleeps'),
    bodies: count('axis-bodies'),
    metrics: count('axis-metrics'),
    metricEntries: count('axis-metric-entries'),
    recipes: count('axis-recipes'),
    customFoods: count('axis-custom-foods'),
    categories: count('axis-money-categories'),
    budgets: count('axis-budgets'),
  }
}

// バックアップをダウンロード (JSONファイル)
export function downloadBackup(backup: AxisBackup, filename?: string) {
  const text = JSON.stringify(backup, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const defaultName = `axis-backup-${new Date().toISOString().slice(0, 10)}.json`
  a.href = url
  a.download = filename || defaultName
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// JSONファイルからバックアップを読み込む
export async function parseBackupFile(file: File): Promise<AxisBackup> {
  const text = await file.text()
  const json = JSON.parse(text)
  if (json.format !== 'axis-backup') {
    throw new Error('無効なバックアップファイルです (format チェック失敗)')
  }
  if (typeof json.version !== 'number') {
    throw new Error('無効なバックアップファイルです (version が見つかりません)')
  }
  return json as AxisBackup
}

// バックアップを localStorage に書き戻す
// mode: 'replace' = 現データを全部上書き / 'merge' = 配列系は結合、オブジェクトは上書き
export function applyBackup(backup: AxisBackup, mode: 'replace' | 'merge') {
  if (typeof window === 'undefined') return
  for (const key of EXPORT_KEYS) {
    const incoming = backup.data?.[key]
    if (incoming === undefined) continue

    if (mode === 'replace') {
      window.localStorage.setItem(key, JSON.stringify(incoming))
      continue
    }

    // merge mode
    const existingRaw = window.localStorage.getItem(key)
    if (!existingRaw) {
      window.localStorage.setItem(key, JSON.stringify(incoming))
      continue
    }
    try {
      const existing = JSON.parse(existingRaw)
      if (Array.isArray(existing) && Array.isArray(incoming)) {
        // 配列は id で重複排除してマージ
        const seenIds = new Set<string>(
          existing.filter((e): e is { id: string } => typeof e?.id === 'string').map(e => e.id)
        )
        const added = incoming.filter(
          (e: unknown) => {
            if (typeof (e as { id?: string })?.id === 'string') {
              return !seenIds.has((e as { id: string }).id)
            }
            return true // id が無いものは全部足す
          }
        )
        window.localStorage.setItem(key, JSON.stringify([...existing, ...added]))
      } else {
        // オブジェクトや原子型はインポート側で上書き
        window.localStorage.setItem(key, JSON.stringify(incoming))
      }
    } catch {
      window.localStorage.setItem(key, JSON.stringify(incoming))
    }
  }
}

// --- CSV エクスポート(主要テーブル別) ---

function escapeCSVCell(v: unknown): string {
  if (v === null || v === undefined) return ''
  const str = String(v)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function arrayToCSV(rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return ''
  const headers = Array.from(new Set(rows.flatMap(r => Object.keys(r))))
  const lines = [headers.join(',')]
  for (const row of rows) {
    lines.push(headers.map(h => escapeCSVCell(row[h])).join(','))
  }
  return lines.join('\n')
}

export function exportCSV(key: ExportKey, filename?: string) {
  if (typeof window === 'undefined') return
  const raw = window.localStorage.getItem(key)
  if (!raw) {
    alert('このカテゴリにはデータがありません')
    return
  }
  try {
    const data = JSON.parse(raw)
    if (!Array.isArray(data)) {
      alert('このカテゴリはCSVエクスポートに対応していません')
      return
    }
    const csv = arrayToCSV(data)
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    const defaultName = `${key}-${new Date().toISOString().slice(0, 10)}.csv`
    a.href = url
    a.download = filename || defaultName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  } catch (err) {
    console.error('[exportCSV] failed', err)
  }
}
