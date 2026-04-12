export interface Transaction {
  id: string
  type: '収入' | '支出'
  category: string
  amount: number
  date: string
  memo: string
  createdAt: number
}

export interface WorkoutEntry {
  id: string
  exercise: string
  muscleGroup: string
  date: string
  sets: number
  reps: number
  weight: number
  createdAt: number
}

export interface FoodEntry {
  id: string
  foodName: string
  amount: number // grams
  calories: number
  protein: number
  fat: number
  carbs: number
  mealTiming: '朝食' | '昼食' | '夕食' | '間食'
  date: string
  createdAt: number
}

export interface SleepStages {
  deepMinutes: number // 深い眠り
  lightMinutes: number // 浅い眠り
  remMinutes: number // レム睡眠
  awakeMinutes: number // 覚醒(夜中に起きた時間)
}

export interface SleepEntry {
  id: string
  date: string // 起床日 (YYYY-MM-DD)
  bedtime: string // 就寝時刻 HH:MM
  wakeTime: string // 起床時刻 HH:MM
  duration: number // 総睡眠時間 (分) - 覚醒時間を除く
  // 手動入力時は 1-5 の自己評価、Health同期時は 0-100 の自動スコア
  quality: number
  // 自動スコア (Health由来) の時のみ入れる
  autoScore?: number
  memo: string
  source: 'manual' | 'health' // どこから来たエントリか
  stages?: SleepStages // Health同期時のみ
  createdAt: number
}

export interface BodyEntry {
  id: string
  date: string
  weight: number // kg
  bodyFat?: number // %
  muscleMass?: number // kg
  memo: string
  source?: 'manual' | 'health' // health = ヘルスケアから同期
  createdAt: number
}

// 汎用メトリクス(数値ログ)
// 集計方法: 日次で複数エントリがある場合の集計ルール
export type MetricAggregation = 'sum' | 'average' | 'latest'

// ネイティブヘルスとの紐付け種別。@capgo/capacitor-health の HealthDataType と対応
export type HealthSource =
  | 'steps'
  | 'distance'
  | 'flightsClimbed'
  | 'heartRate'
  | 'restingHeartRate'
  | 'heartRateVariability'
  | 'respiratoryRate'
  | 'weight'
  | 'bodyFat'
  | 'sleep'
  | 'oxygenSaturation'
  | 'bodyTemperature'
  | 'exerciseTime'
  | 'totalCalories'
  | 'mindfulness'

export interface MetricDefinition {
  id: string
  name: string // 例: "歩数", "水分", "気分"
  unit: string // 例: "歩", "ml", "点"
  icon: string // lucide-react のアイコン名
  color: string // '--metric-1' ~ '--metric-6' など or hex
  aggregation: MetricAggregation
  target?: number // 日次目標 (任意)
  minValue?: number // 入力の下限 (スケール系 e.g. 1)
  maxValue?: number // 入力の上限 (スケール系 e.g. 10)
  step?: number // 入力ステップ (e.g. 0.1, 1, 100)
  // ネイティブヘルスから同期できる項目はこれを設定する。
  // 未設定なら手動入力専用。
  healthSource?: HealthSource
  // プラグインが返す生の値(メートル・秒など)をプリセット単位(km・分)に変換するための係数
  healthValueMultiplier?: number
  createdAt: number
}

export interface MetricEntry {
  id: string
  metricId: string
  value: number
  date: string // YYYY-MM-DD
  memo?: string
  createdAt: number
}

// 「組み込み」カテゴリ: 固有のデータモデルと専用タブUIを持つ
export type BuiltinTabId = 'money' | 'workout' | 'food' | 'sleep' | 'body'

// タブの識別子。Home / 組み込み / 動的メトリクスの3種
// メトリクスは "metric:{metricId}" の形式で表現する
export type TabType = 'home' | BuiltinTabId | `metric:${string}`

export const BUILTIN_TAB_IDS: BuiltinTabId[] = ['money', 'workout', 'food', 'sleep', 'body']

export interface TabConfig {
  // 組み込みなら id = BuiltinTabId、メトリクスなら id = "metric:{metricId}"
  id: Exclude<TabType, 'home'>
  visible: boolean
}

export function isMetricTabId(id: string): boolean {
  return id.startsWith('metric:')
}

export function getMetricIdFromTabId(id: string): string | null {
  return id.startsWith('metric:') ? id.slice('metric:'.length) : null
}

export const incomeCategories = ['給料', '副業', '投資', 'ボーナス', 'その他']
export const expenseCategories = ['食費', '交通費', '住居費', '光熱費', '通信費', '娯楽', '医療費', '衣服', '教育', 'その他']
