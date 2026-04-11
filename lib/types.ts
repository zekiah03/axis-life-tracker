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

export type TabType = 'home' | 'money' | 'workout' | 'food' | 'sleep' | 'body'

export const incomeCategories = ['給料', '副業', '投資', 'ボーナス', 'その他']
export const expenseCategories = ['食費', '交通費', '住居費', '光熱費', '通信費', '娯楽', '医療費', '衣服', '教育', 'その他']
