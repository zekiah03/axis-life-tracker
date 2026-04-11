export interface FoodItem {
  id: string
  name: string
  calories: number // per 100g
  protein: number // per 100g
  fat: number // per 100g
  carbs: number // per 100g
}

export const foodDatabase: FoodItem[] = [
  { id: '1', name: '鶏胸肉', calories: 108, protein: 22.3, fat: 1.5, carbs: 0 },
  { id: '2', name: '鶏もも肉', calories: 200, protein: 16.2, fat: 14.0, carbs: 0 },
  { id: '3', name: '牛肉（赤身）', calories: 182, protein: 21.2, fat: 10.7, carbs: 0.3 },
  { id: '4', name: '豚肉（ロース）', calories: 263, protein: 19.3, fat: 19.2, carbs: 0.2 },
  { id: '5', name: 'サーモン', calories: 208, protein: 20.1, fat: 12.4, carbs: 0.1 },
  { id: '6', name: 'マグロ（赤身）', calories: 125, protein: 26.4, fat: 1.4, carbs: 0.1 },
  { id: '7', name: '卵', calories: 151, protein: 12.3, fat: 10.3, carbs: 0.3 },
  { id: '8', name: '白米', calories: 168, protein: 2.5, fat: 0.3, carbs: 37.1 },
  { id: '9', name: '玄米', calories: 165, protein: 2.8, fat: 1.0, carbs: 35.6 },
  { id: '10', name: 'オートミール', calories: 380, protein: 13.7, fat: 5.7, carbs: 69.1 },
  { id: '11', name: '食パン', calories: 264, protein: 9.3, fat: 4.4, carbs: 46.7 },
  { id: '12', name: 'バナナ', calories: 86, protein: 1.1, fat: 0.2, carbs: 22.5 },
  { id: '13', name: 'りんご', calories: 54, protein: 0.2, fat: 0.1, carbs: 14.6 },
  { id: '14', name: 'アボカド', calories: 187, protein: 2.5, fat: 18.7, carbs: 6.2 },
  { id: '15', name: 'ブロッコリー', calories: 33, protein: 4.3, fat: 0.5, carbs: 5.2 },
  { id: '16', name: 'ほうれん草', calories: 20, protein: 2.2, fat: 0.4, carbs: 3.1 },
  { id: '17', name: '豆腐', calories: 72, protein: 6.6, fat: 4.2, carbs: 1.6 },
  { id: '18', name: '納豆', calories: 200, protein: 16.5, fat: 10.0, carbs: 12.1 },
  { id: '19', name: '牛乳', calories: 67, protein: 3.3, fat: 3.8, carbs: 4.8 },
  { id: '20', name: 'ヨーグルト', calories: 62, protein: 3.6, fat: 3.0, carbs: 4.9 },
  { id: '21', name: 'チーズ', calories: 313, protein: 22.7, fat: 25.0, carbs: 1.4 },
  { id: '22', name: 'プロテインパウダー', calories: 380, protein: 80.0, fat: 2.0, carbs: 5.0 },
  { id: '23', name: 'さつまいも', calories: 132, protein: 1.2, fat: 0.2, carbs: 31.5 },
  { id: '24', name: 'じゃがいも', calories: 76, protein: 1.6, fat: 0.1, carbs: 17.6 },
  { id: '25', name: 'パスタ（乾麺）', calories: 378, protein: 12.2, fat: 1.8, carbs: 73.9 },
]

export function searchFoods(query: string): FoodItem[] {
  if (!query.trim()) return []
  const normalizedQuery = query.toLowerCase()
  return foodDatabase.filter(food => 
    food.name.toLowerCase().includes(normalizedQuery)
  )
}
