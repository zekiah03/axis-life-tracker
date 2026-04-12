// ビルトインの家計簿カテゴリ。ユーザーは追加・編集・削除できる。
// Zaim/マネーフォワードME の標準カテゴリを参考。

import type { MoneyCategory } from './types'

type DefaultCategory = Omit<MoneyCategory, 'id'>

// 支出カテゴリ (Zaim の標準12分類)
export const defaultExpenseCategories: DefaultCategory[] = [
  { name: '食費', type: '支出', icon: 'UtensilsCrossed', color: '#f97316', builtin: true, order: 0 },
  { name: '日用品', type: '支出', icon: 'ShoppingBag', color: '#22d3a0', builtin: true, order: 1 },
  { name: '交通費', type: '支出', icon: 'Train', color: '#60a5fa', builtin: true, order: 2 },
  { name: '住居', type: '支出', icon: 'Home', color: '#a78bfa', builtin: true, order: 3 },
  { name: '光熱費', type: '支出', icon: 'Lightbulb', color: '#facc15', builtin: true, order: 4 },
  { name: '通信費', type: '支出', icon: 'Smartphone', color: '#3b82f6', builtin: true, order: 5 },
  { name: '娯楽', type: '支出', icon: 'Gamepad2', color: '#ec4899', builtin: true, order: 6 },
  { name: '被服', type: '支出', icon: 'Shirt', color: '#c084fc', builtin: true, order: 7 },
  { name: '美容', type: '支出', icon: 'Sparkles', color: '#f472b6', builtin: true, order: 8 },
  { name: '医療', type: '支出', icon: 'Stethoscope', color: '#ef4444', builtin: true, order: 9 },
  { name: '教育', type: '支出', icon: 'GraduationCap', color: '#14b8a6', builtin: true, order: 10 },
  { name: '交際費', type: '支出', icon: 'Users', color: '#fb923c', builtin: true, order: 11 },
  { name: 'サブスク', type: '支出', icon: 'Repeat', color: '#8b5cf6', builtin: true, order: 12 },
  { name: '税金', type: '支出', icon: 'FileText', color: '#71717a', builtin: true, order: 13 },
  { name: 'その他', type: '支出', icon: 'Package', color: '#a1a1aa', builtin: true, order: 14 },
]

// 収入カテゴリ
export const defaultIncomeCategories: DefaultCategory[] = [
  { name: '給料', type: '収入', icon: 'Briefcase', color: '#22d3a0', builtin: true, order: 0 },
  { name: '副業', type: '収入', icon: 'Laptop', color: '#60a5fa', builtin: true, order: 1 },
  { name: 'ボーナス', type: '収入', icon: 'Gift', color: '#f472b6', builtin: true, order: 2 },
  { name: '投資', type: '収入', icon: 'TrendingUp', color: '#a78bfa', builtin: true, order: 3 },
  { name: '臨時収入', type: '収入', icon: 'Sparkles', color: '#facc15', builtin: true, order: 4 },
  { name: 'その他', type: '収入', icon: 'Package', color: '#a1a1aa', builtin: true, order: 5 },
]

export const allDefaultCategories: DefaultCategory[] = [
  ...defaultIncomeCategories,
  ...defaultExpenseCategories,
]

// フォールバック用(カテゴリ解決に失敗した時)
export const fallbackCategoryMeta = {
  icon: 'Package',
  color: '#a1a1aa',
}
