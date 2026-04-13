export interface Transaction {
  id: string
  type: '収入' | '支出'
  category: string // 表示名(後方互換用)
  categoryId?: string // Category.id への参照。旧エントリは undefined で category を使う
  amount: number
  date: string // YYYY-MM-DD
  memo: string
  createdAt: number
}

// ユーザー定義可能なカテゴリ。ビルトインも DB に投入される。
export interface MoneyCategory {
  id: string
  name: string
  type: '収入' | '支出'
  icon: string // lucide-react アイコン名
  color: string // CSS color
  builtin?: boolean // true なら初期データ (削除はできるが復元可能)
  order: number // 表示順
}

// 月次カテゴリ予算
export interface Budget {
  id: string
  categoryId: string
  month: string // YYYY-MM
  amount: number
}

// 旧モデル (1エントリ=1種目の平均値)。新モデルへのマイグレーション完了後も
// 既存データを見るために残す。
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

// 新モデル (Strong/Hevy 準拠): セッション → 種目 → セット の階層
export interface WorkoutSet {
  id: string
  weight: number // kg
  reps: number
  rpe?: number // 1-10 の主観強度 (任意)
  completed: boolean // 完了チェック (アクティブセッション中に個別にチェック)
  isWarmup?: boolean // ウォームアップセット
  restSeconds?: number // このセット前の休憩時間 (計測用)
}

export interface SessionExercise {
  id: string
  exerciseName: string
  muscleGroup: string
  sets: WorkoutSet[]
  notes?: string
  order: number
}

export interface WorkoutSession {
  id: string
  date: string // YYYY-MM-DD
  name?: string // 例: "Push Day A"
  startedAt: number // UNIX ms
  endedAt?: number // UNIX ms (アクティブ中は undefined)
  exercises: SessionExercise[]
  notes?: string
  routineId?: string // どのルーティンから開始したか
}

// ワークアウトルーティン (テンプレート)
// 保存しておくと1タップでセッションを開始できる
export interface RoutineExercise {
  exerciseName: string
  muscleGroup: string
  defaultSets: number // デフォルトセット数
  defaultReps: number // デフォルトレップ数
  defaultWeight: number // デフォルト重量 (0 = 未設定)
}

export interface WorkoutRoutine {
  id: string
  name: string // 例: "Push Day A", "Leg Day"
  exercises: RoutineExercise[]
  createdAt: number
}

export interface FoodEntry {
  id: string
  foodName: string
  foodItemId?: string // FoodItem への参照 (カスタム食品含む)
  amount: number // grams
  calories: number
  protein: number
  fat: number
  carbs: number
  mealTiming: '朝食' | '昼食' | '夕食' | '間食'
  date: string
  recipeId?: string // レシピ展開由来ならレシピID
  createdAt: number
}

// レシピ: 複数食品を1つにまとめてワンタップで再追加できる
export interface RecipeItem {
  foodItemId: string // FoodItem.id or 'custom:xxx'
  foodName: string // スナップショット
  amount: number // grams (dishカテゴリの場合は人前*100)
}

export interface Recipe {
  id: string
  name: string
  items: RecipeItem[]
  servings: number // 何人前のレシピか (デフォルト1)
  // 集計値 (計算済み、表示用キャッシュ、servings分の合計)
  totalCalories: number
  totalProtein: number
  totalFat: number
  totalCarbs: number
  createdAt: number
}

// ユーザー定義の栄養目標
export interface FoodGoal {
  calories: number // kcal
  protein: number // g
  fat: number // g
  carbs: number // g
}

// ユーザーがカスタム追加する食品 (食品DBを拡張する)
export interface CustomFoodItem {
  id: string
  name: string
  calories: number // per 100g
  protein: number
  fat: number
  carbs: number
  barcode?: string // JAN / EAN コード (バーコードスキャン登録時)
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
  source?: 'manual' | 'health'
  createdAt: number
}

export interface BodyGoal {
  targetWeight?: number // kg
  height?: number // cm (BMI計算用)
}

export interface SleepGoal {
  targetHours: number // 目標睡眠時間 (時間)
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

// アクティビティ記録 (有酸素運動・ストレッチ共通)
export type ActivityType = 'cardio' | 'stretch'
export type ActivityIntensity = 'low' | 'medium' | 'high'

export interface ActivityEntry {
  id: string
  type: ActivityType
  activityName: string // "ランニング", "ヨガ" etc.
  duration: number // 分
  distance?: number // km (cardio)
  calories?: number // kcal
  heartRate?: number // 平均bpm (cardio)
  bodyParts?: string[] // 部位 (stretch)
  intensity?: ActivityIntensity
  notes?: string
  date: string
  createdAt: number
}

// メンタル/ウェルネス記録 (気分・エネルギー・ストレス・集中力を一括記録)
export interface MentalEntry {
  id: string
  date: string
  mood: number // 1-10
  energy: number // 1-10
  stress: number // 1-10
  focus: number // 1-10
  factors?: string[] // 影響要因タグ
  notes?: string // 一言日記
  createdAt: number
}

// 習慣記録 (勉強・読書・瞑想・スクリーンタイム等を一括管理)
export type HabitType = 'study' | 'reading' | 'meditation' | 'screentime' | 'custom'

export interface HabitEntry {
  id: string
  habitType: HabitType
  customName?: string // custom の場合の名前
  value: number // 分 or ページ数 etc.
  unit: string // '分', 'ページ', '時間'
  subject?: string // 科目, 本のタイトル, 瞑想の種類 etc.
  notes?: string
  date: string
  createdAt: number
}

export interface HabitGoal {
  habitType: HabitType
  customName?: string
  target: number // 日次目標値
  unit: string
}

// 「組み込み」カテゴリ: 固有のデータモデルと専用タブUIを持つ
export type BuiltinTabId = 'money' | 'workout' | 'food' | 'sleep' | 'body' | 'cardio' | 'stretch' | 'mental' | 'study' | 'reading' | 'meditation' | 'screentime'

// タブの識別子。Home / 組み込み / 動的メトリクスの3種
// メトリクスは "metric:{metricId}" の形式で表現する
export type TabType = 'home' | BuiltinTabId | `metric:${string}`

export const BUILTIN_TAB_IDS: BuiltinTabId[] = ['money', 'workout', 'food', 'sleep', 'body', 'cardio', 'stretch', 'mental', 'study', 'reading', 'meditation', 'screentime']

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
