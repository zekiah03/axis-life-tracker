import type { MetricDefinition, MetricAggregation, HealthSource } from './types'

// プリセットは「追加する時のテンプレート」。追加後は MetricDefinition として保存される。
export interface MetricPreset {
  name: string
  unit: string
  icon: string
  color: string
  aggregation: MetricAggregation
  target?: number
  minValue?: number
  maxValue?: number
  step?: number
  category: '健康' | '運動' | 'メンタル' | '習慣' | '嗜好品'
  description: string
  // ネイティブアプリで HealthKit / Health Connect から同期可能な項目
  healthSource?: HealthSource
  // プラグインが返す raw 値 → プリセット単位への変換係数
  // 例: distance は m で返るが km で表示したい → 0.001
  healthValueMultiplier?: number
}

export const metricPresets: MetricPreset[] = [
  // 健康・バイタル
  {
    name: '歩数',
    unit: '歩',
    icon: 'Footprints',
    color: '#22d3a0',
    aggregation: 'sum',
    target: 8000,
    step: 100,
    category: '健康',
    description: '日次の歩数',
    healthSource: 'steps',
  },
  {
    name: '水分摂取',
    unit: 'ml',
    icon: 'Droplet',
    color: '#60a5fa',
    aggregation: 'sum',
    target: 2000,
    step: 100,
    category: '健康',
    description: '1日の水分摂取量',
  },
  {
    name: '心拍数',
    unit: 'bpm',
    icon: 'Heart',
    color: '#ec4899',
    aggregation: 'latest',
    step: 1,
    category: '健康',
    description: '安静時心拍数',
    healthSource: 'restingHeartRate',
  },
  {
    name: '体温',
    unit: '℃',
    icon: 'Thermometer',
    color: '#f97316',
    aggregation: 'latest',
    step: 0.1,
    category: '健康',
    description: '体温',
    healthSource: 'bodyTemperature',
  },
  {
    name: 'SpO2',
    unit: '%',
    icon: 'Activity',
    color: '#a78bfa',
    aggregation: 'latest',
    step: 1,
    minValue: 0,
    maxValue: 100,
    category: '健康',
    description: '血中酸素飽和度',
    healthSource: 'oxygenSaturation',
  },
  {
    name: '歩行距離',
    unit: 'km',
    icon: 'Route',
    color: '#22d3a0',
    aggregation: 'sum',
    target: 5,
    step: 0.1,
    category: '健康',
    description: '日次の歩行距離',
    healthSource: 'distance',
    healthValueMultiplier: 0.001, // m → km
  },
  {
    name: '階段',
    unit: '階',
    icon: 'TrendingUp',
    color: '#22d3a0',
    aggregation: 'sum',
    target: 10,
    step: 1,
    category: '健康',
    description: '上った階数',
    healthSource: 'flightsClimbed',
  },
  {
    name: 'HRV',
    unit: 'ms',
    icon: 'Activity',
    color: '#ec4899',
    aggregation: 'latest',
    step: 1,
    category: '健康',
    description: '心拍変動 (自律神経の指標)',
    healthSource: 'heartRateVariability',
  },
  {
    name: '呼吸数',
    unit: '回/分',
    icon: 'Wind',
    color: '#60a5fa',
    aggregation: 'latest',
    step: 1,
    category: '健康',
    description: '安静時呼吸数',
    healthSource: 'respiratoryRate',
  },

  // 運動
  {
    name: '有酸素運動',
    unit: '分',
    icon: 'Zap',
    color: '#f97316',
    aggregation: 'sum',
    step: 5,
    category: '運動',
    description: 'ランニング・サイクリングなどの時間',
    healthSource: 'exerciseTime',
  },
  {
    name: '消費カロリー',
    unit: 'kcal',
    icon: 'Flame',
    color: '#f97316',
    aggregation: 'sum',
    step: 10,
    category: '運動',
    description: '運動での消費カロリー',
    healthSource: 'totalCalories',
  },
  {
    name: 'ストレッチ',
    unit: '分',
    icon: 'StretchHorizontal',
    color: '#22d3a0',
    aggregation: 'sum',
    step: 1,
    category: '運動',
    description: '柔軟・ストレッチ時間',
  },

  // メンタル (1-10スケール)
  {
    name: '気分',
    unit: '点',
    icon: 'Smile',
    color: '#22d3a0',
    aggregation: 'average',
    minValue: 1,
    maxValue: 10,
    step: 1,
    category: 'メンタル',
    description: '今日の気分スコア',
  },
  {
    name: 'ストレス',
    unit: '点',
    icon: 'Wind',
    color: '#ec4899',
    aggregation: 'average',
    minValue: 1,
    maxValue: 10,
    step: 1,
    category: 'メンタル',
    description: 'ストレスレベル',
  },
  {
    name: 'エネルギー',
    unit: '点',
    icon: 'BatteryCharging',
    color: '#facc15',
    aggregation: 'average',
    minValue: 1,
    maxValue: 10,
    step: 1,
    category: 'メンタル',
    description: '活力・元気度',
  },
  {
    name: '集中力',
    unit: '点',
    icon: 'Target',
    color: '#60a5fa',
    aggregation: 'average',
    minValue: 1,
    maxValue: 10,
    step: 1,
    category: 'メンタル',
    description: '集中できた度合い',
  },

  // 習慣
  {
    name: '勉強',
    unit: '分',
    icon: 'BookOpen',
    color: '#a78bfa',
    aggregation: 'sum',
    target: 60,
    step: 5,
    category: '習慣',
    description: '学習時間',
  },
  {
    name: '読書',
    unit: 'ページ',
    icon: 'Book',
    color: '#a78bfa',
    aggregation: 'sum',
    step: 1,
    category: '習慣',
    description: '読んだページ数',
  },
  {
    name: '瞑想',
    unit: '分',
    icon: 'Sparkles',
    color: '#60a5fa',
    aggregation: 'sum',
    target: 10,
    step: 1,
    category: '習慣',
    description: '瞑想・マインドフルネス',
    healthSource: 'mindfulness',
  },
  {
    name: 'スクリーンタイム',
    unit: '時間',
    icon: 'Smartphone',
    color: '#71717a',
    aggregation: 'sum',
    step: 0.5,
    category: '習慣',
    description: '画面視聴時間',
  },

  // 嗜好品
  {
    name: 'カフェイン',
    unit: 'mg',
    icon: 'Coffee',
    color: '#a16207',
    aggregation: 'sum',
    step: 50,
    category: '嗜好品',
    description: 'カフェイン摂取量',
  },
  {
    name: 'アルコール',
    unit: 'g',
    icon: 'Wine',
    color: '#dc2626',
    aggregation: 'sum',
    step: 1,
    category: '嗜好品',
    description: '純アルコール量',
  },
]

export const metricCategories = ['健康', '運動', 'メンタル', '習慣', '嗜好品'] as const
