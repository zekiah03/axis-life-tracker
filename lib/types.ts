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

export interface SleepEntry {
  id: string
  date: string // 起床日 (YYYY-MM-DD)
  bedtime: string // 就寝時刻 HH:MM
  wakeTime: string // 起床時刻 HH:MM
  duration: number // 睡眠時間 (分)
  quality: 1 | 2 | 3 | 4 | 5 // 睡眠の質
  memo: string
  createdAt: number
}

export interface BodyEntry {
  id: string
  date: string
  weight: number // kg
  bodyFat?: number // %
  muscleMass?: number // kg
  memo: string
  createdAt: number
}

// 汎用メトリクス(数値ログ)
// 集計方法: 日次で複数エントリがある場合の集計ルール
export type MetricAggregation = 'sum' | 'average' | 'latest'

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

export type TabType = 'home' | 'money' | 'workout' | 'food' | 'sleep' | 'body' | 'metrics'

export const incomeCategories = ['給料', '副業', '投資', 'ボーナス', 'その他']
export const expenseCategories = ['食費', '交通費', '住居費', '光熱費', '通信費', '娯楽', '医療費', '衣服', '教育', 'その他']
