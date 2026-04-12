// Homeダッシュボードのウィジェットシステム。
// 各ウィジェットは ID で識別し、表示/非表示と並び順をユーザーが設定できる。

export type WidgetId =
  | 'money-summary'       // 今月の収支
  | 'food-calories'       // 今日のカロリー
  | 'food-pfc'            // 今日のPFCバランス
  | 'workout-summary'     // 今週のワークアウト (セッションベース)
  | 'sleep-summary'       // 昨夜の睡眠
  | 'body-latest'         // 最新の体組成
  | 'metrics-today'       // 今日の数値メトリクス
  | 'streak'              // 連続記録ストリーク
  | 'recent-transactions' // 最近の取引
  | 'recent-workouts'     // 最近のワークアウト

export interface WidgetConfig {
  id: WidgetId
  visible: boolean
}

export interface WidgetMeta {
  id: WidgetId
  label: string
  labelEn: string
  icon: string // lucide icon name
  color: string
}

export const WIDGET_META: WidgetMeta[] = [
  { id: 'money-summary', label: '今月の収支', labelEn: 'Monthly Balance', icon: 'Wallet', color: '#22d3a0' },
  { id: 'food-calories', label: '今日のカロリー', labelEn: "Today's Calories", icon: 'Utensils', color: '#a78bfa' },
  { id: 'food-pfc', label: 'PFCバランス', labelEn: 'PFC Balance', icon: 'PieChart', color: '#a78bfa' },
  { id: 'workout-summary', label: '今週のワークアウト', labelEn: 'Weekly Workouts', icon: 'Dumbbell', color: '#f97316' },
  { id: 'sleep-summary', label: '昨夜の睡眠', labelEn: 'Last Night Sleep', icon: 'Moon', color: '#60a5fa' },
  { id: 'body-latest', label: '最新の体組成', labelEn: 'Latest Body Comp', icon: 'Scale', color: '#ec4899' },
  { id: 'metrics-today', label: '今日の数値', labelEn: "Today's Metrics", icon: 'LineChart', color: '#f5f5f7' },
  { id: 'streak', label: '連続記録', labelEn: 'Recording Streak', icon: 'Flame', color: '#f97316' },
  { id: 'recent-transactions', label: '最近の取引', labelEn: 'Recent Transactions', icon: 'ArrowUpDown', color: '#22d3a0' },
  { id: 'recent-workouts', label: '最近のワークアウト', labelEn: 'Recent Workouts', icon: 'Trophy', color: '#f97316' },
]

export const DEFAULT_WIDGET_CONFIG: WidgetConfig[] = [
  { id: 'money-summary', visible: true },
  { id: 'food-calories', visible: true },
  { id: 'workout-summary', visible: true },
  { id: 'sleep-summary', visible: true },
  { id: 'body-latest', visible: true },
  { id: 'food-pfc', visible: true },
  { id: 'metrics-today', visible: true },
  { id: 'streak', visible: true },
  { id: 'recent-transactions', visible: true },
  { id: 'recent-workouts', visible: false },
]
