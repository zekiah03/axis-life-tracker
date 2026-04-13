// オンボーディングとタブ設定で使う、組み込みタブのカテゴリ分類。
// builtinタブとメトリクスプリセットを統一的に分類する。

import type { BuiltinTabId } from './types'

export interface TabCategory {
  id: string
  label: string
  labelEn: string
  builtinIds: BuiltinTabId[]
}

export const TAB_CATEGORIES: TabCategory[] = [
  {
    id: 'finance',
    label: 'お金',
    labelEn: 'Finance',
    builtinIds: ['money'],
  },
  {
    id: 'exercise',
    label: '運動',
    labelEn: 'Exercise',
    builtinIds: ['workout', 'cardio', 'stretch'],
  },
  {
    id: 'nutrition',
    label: '食事',
    labelEn: 'Nutrition',
    builtinIds: ['food'],
  },
  {
    id: 'health',
    label: '健康・身体',
    labelEn: 'Health & Body',
    builtinIds: ['sleep', 'body'],
  },
  {
    id: 'mind',
    label: 'メンタル・習慣',
    labelEn: 'Mind & Habits',
    builtinIds: ['mental', 'study', 'reading', 'meditation', 'screentime'],
  },
]

// メトリクスプリセットのカテゴリ (バイタル系と嗜好品系)
export const METRIC_CATEGORIES = [
  {
    id: 'vitals',
    label: 'バイタル・数値',
    labelEn: 'Vitals & Metrics',
  },
  {
    id: 'substances',
    label: '嗜好品',
    labelEn: 'Substances',
  },
]
