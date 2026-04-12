// 有酸素運動とストレッチのプリセット

export interface ActivityPreset {
  name: string
  icon: string
  defaultCaloriesPerMin?: number // 概算 kcal/min (体重65kg基準)
}

export const cardioPresets: ActivityPreset[] = [
  { name: 'ランニング', icon: 'PersonStanding', defaultCaloriesPerMin: 10 },
  { name: 'ウォーキング', icon: 'Footprints', defaultCaloriesPerMin: 4 },
  { name: 'サイクリング', icon: 'Bike', defaultCaloriesPerMin: 8 },
  { name: '水泳', icon: 'Waves', defaultCaloriesPerMin: 9 },
  { name: 'HIIT', icon: 'Flame', defaultCaloriesPerMin: 12 },
  { name: '縄跳び', icon: 'Zap', defaultCaloriesPerMin: 11 },
  { name: 'エアロバイク', icon: 'Gauge', defaultCaloriesPerMin: 7 },
  { name: 'ダンス', icon: 'Music', defaultCaloriesPerMin: 6 },
  { name: '階段昇降', icon: 'TrendingUp', defaultCaloriesPerMin: 8 },
  { name: 'エリプティカル', icon: 'Activity', defaultCaloriesPerMin: 7 },
]

export const stretchPresets: ActivityPreset[] = [
  { name: '静的ストレッチ', icon: 'StretchHorizontal' },
  { name: '動的ストレッチ', icon: 'Zap' },
  { name: 'ヨガ', icon: 'Sparkles' },
  { name: 'フォームローラー', icon: 'Circle' },
  { name: 'PNFストレッチ', icon: 'ArrowUpDown' },
  { name: 'モビリティ', icon: 'RotateCw' },
  { name: 'クールダウン', icon: 'Wind' },
]

export const bodyPartOptions = [
  '首', '肩', '胸', '背中', '腰', '腕', '手首',
  '股関節', '太もも', 'ふくらはぎ', '足首', '全身',
]
