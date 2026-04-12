export interface FoodItem {
  id: string
  name: string
  calories: number // per 100g
  protein: number // per 100g
  fat: number // per 100g
  carbs: number // per 100g
  category?: 'meat' | 'fish' | 'grain' | 'vegetable' | 'fruit' | 'dairy' | 'bean' | 'snack' | 'beverage' | 'dish' | 'other'
}

export const foodDatabase: FoodItem[] = [
  // 肉類
  { id: '1', name: '鶏胸肉', calories: 108, protein: 22.3, fat: 1.5, carbs: 0, category: 'meat' },
  { id: '2', name: '鶏もも肉', calories: 200, protein: 16.2, fat: 14.0, carbs: 0, category: 'meat' },
  { id: '3', name: '牛肉（赤身）', calories: 182, protein: 21.2, fat: 10.7, carbs: 0.3, category: 'meat' },
  { id: '4', name: '豚肉（ロース）', calories: 263, protein: 19.3, fat: 19.2, carbs: 0.2, category: 'meat' },
  { id: '26', name: '豚バラ', calories: 386, protein: 14.2, fat: 34.6, carbs: 0.1, category: 'meat' },
  { id: '27', name: '鶏ささみ', calories: 98, protein: 23.0, fat: 0.8, carbs: 0, category: 'meat' },
  { id: '28', name: 'ベーコン', calories: 400, protein: 12.9, fat: 39.1, carbs: 0.3, category: 'meat' },
  { id: '29', name: 'ハム', calories: 118, protein: 16.5, fat: 4.5, carbs: 1.3, category: 'meat' },
  // 魚介類
  { id: '5', name: 'サーモン', calories: 208, protein: 20.1, fat: 12.4, carbs: 0.1, category: 'fish' },
  { id: '6', name: 'マグロ（赤身）', calories: 125, protein: 26.4, fat: 1.4, carbs: 0.1, category: 'fish' },
  { id: '30', name: 'サバ', calories: 247, protein: 20.7, fat: 16.8, carbs: 0.3, category: 'fish' },
  { id: '31', name: 'ブリ', calories: 257, protein: 21.4, fat: 17.6, carbs: 0.3, category: 'fish' },
  { id: '32', name: 'エビ', calories: 82, protein: 18.4, fat: 0.3, carbs: 0.1, category: 'fish' },
  { id: '33', name: 'ツナ缶（水煮）', calories: 71, protein: 16.0, fat: 0.7, carbs: 0.2, category: 'fish' },
  // 穀物
  { id: '8', name: '白米', calories: 168, protein: 2.5, fat: 0.3, carbs: 37.1, category: 'grain' },
  { id: '9', name: '玄米', calories: 165, protein: 2.8, fat: 1.0, carbs: 35.6, category: 'grain' },
  { id: '10', name: 'オートミール', calories: 380, protein: 13.7, fat: 5.7, carbs: 69.1, category: 'grain' },
  { id: '11', name: '食パン', calories: 264, protein: 9.3, fat: 4.4, carbs: 46.7, category: 'grain' },
  { id: '25', name: 'パスタ（乾麺）', calories: 378, protein: 12.2, fat: 1.8, carbs: 73.9, category: 'grain' },
  { id: '34', name: 'うどん（ゆで）', calories: 95, protein: 2.6, fat: 0.4, carbs: 20.3, category: 'grain' },
  { id: '35', name: 'そば（ゆで）', calories: 114, protein: 4.8, fat: 0.7, carbs: 22.1, category: 'grain' },
  { id: '36', name: 'ラーメン（生麺）', calories: 291, protein: 8.6, fat: 1.2, carbs: 55.7, category: 'grain' },
  // 野菜
  { id: '15', name: 'ブロッコリー', calories: 33, protein: 4.3, fat: 0.5, carbs: 5.2, category: 'vegetable' },
  { id: '16', name: 'ほうれん草', calories: 20, protein: 2.2, fat: 0.4, carbs: 3.1, category: 'vegetable' },
  { id: '37', name: 'トマト', calories: 19, protein: 0.7, fat: 0.1, carbs: 4.7, category: 'vegetable' },
  { id: '38', name: 'キャベツ', calories: 23, protein: 1.3, fat: 0.2, carbs: 5.2, category: 'vegetable' },
  { id: '39', name: 'にんじん', calories: 35, protein: 0.7, fat: 0.2, carbs: 8.7, category: 'vegetable' },
  { id: '40', name: 'たまねぎ', calories: 33, protein: 1.0, fat: 0.1, carbs: 8.4, category: 'vegetable' },
  { id: '23', name: 'さつまいも', calories: 132, protein: 1.2, fat: 0.2, carbs: 31.5, category: 'vegetable' },
  { id: '24', name: 'じゃがいも', calories: 76, protein: 1.6, fat: 0.1, carbs: 17.6, category: 'vegetable' },
  // 果物
  { id: '12', name: 'バナナ', calories: 86, protein: 1.1, fat: 0.2, carbs: 22.5, category: 'fruit' },
  { id: '13', name: 'りんご', calories: 54, protein: 0.2, fat: 0.1, carbs: 14.6, category: 'fruit' },
  { id: '14', name: 'アボカド', calories: 187, protein: 2.5, fat: 18.7, carbs: 6.2, category: 'fruit' },
  { id: '41', name: 'いちご', calories: 34, protein: 0.9, fat: 0.1, carbs: 8.5, category: 'fruit' },
  { id: '42', name: 'みかん', calories: 46, protein: 0.7, fat: 0.1, carbs: 12.0, category: 'fruit' },
  { id: '43', name: 'ブルーベリー', calories: 49, protein: 0.5, fat: 0.1, carbs: 12.9, category: 'fruit' },
  // 乳製品・卵
  { id: '7', name: '卵', calories: 151, protein: 12.3, fat: 10.3, carbs: 0.3, category: 'dairy' },
  { id: '19', name: '牛乳', calories: 67, protein: 3.3, fat: 3.8, carbs: 4.8, category: 'dairy' },
  { id: '20', name: 'ヨーグルト', calories: 62, protein: 3.6, fat: 3.0, carbs: 4.9, category: 'dairy' },
  { id: '21', name: 'チーズ', calories: 313, protein: 22.7, fat: 25.0, carbs: 1.4, category: 'dairy' },
  { id: '44', name: 'ギリシャヨーグルト', calories: 59, protein: 10.0, fat: 0.4, carbs: 3.6, category: 'dairy' },
  // 豆類
  { id: '17', name: '豆腐', calories: 72, protein: 6.6, fat: 4.2, carbs: 1.6, category: 'bean' },
  { id: '18', name: '納豆', calories: 200, protein: 16.5, fat: 10.0, carbs: 12.1, category: 'bean' },
  { id: '45', name: '枝豆', calories: 135, protein: 11.7, fat: 6.2, carbs: 8.8, category: 'bean' },
  // スナック・その他
  { id: '22', name: 'プロテインパウダー', calories: 380, protein: 80.0, fat: 2.0, carbs: 5.0, category: 'other' },
  { id: '46', name: 'ナッツ（ミックス）', calories: 607, protein: 18.8, fat: 54.0, carbs: 20.1, category: 'snack' },
  { id: '47', name: 'チョコレート', calories: 558, protein: 6.9, fat: 34.1, carbs: 55.8, category: 'snack' },
  // 定食・外食（1食分をそのまま記録できる）
  { id: '48', name: '牛丼（並）', calories: 656, protein: 21.0, fat: 20.0, carbs: 94.3, category: 'dish' },
  { id: '49', name: 'カレーライス', calories: 730, protein: 18.0, fat: 17.0, carbs: 128.0, category: 'dish' },
  { id: '50', name: 'とんかつ定食', calories: 880, protein: 33.0, fat: 44.0, carbs: 85.0, category: 'dish' },
  { id: '51', name: 'ラーメン（醤油）', calories: 470, protein: 16.0, fat: 13.0, carbs: 72.0, category: 'dish' },
  { id: '52', name: '寿司（10貫）', calories: 510, protein: 22.0, fat: 6.0, carbs: 92.0, category: 'dish' },
  { id: '53', name: 'ハンバーガー', calories: 254, protein: 13.3, fat: 9.0, carbs: 30.3, category: 'dish' },
  { id: '54', name: 'おにぎり（鮭）', calories: 180, protein: 4.5, fat: 1.2, carbs: 37.0, category: 'dish' },
  { id: '55', name: 'サンドイッチ（ハム）', calories: 260, protein: 9.0, fat: 11.0, carbs: 31.0, category: 'dish' },
  // 飲料
  { id: '56', name: 'オレンジジュース', calories: 42, protein: 0.7, fat: 0.1, carbs: 10.0, category: 'beverage' },
  { id: '57', name: 'コーラ', calories: 46, protein: 0.1, fat: 0, carbs: 11.4, category: 'beverage' },
  { id: '58', name: 'ビール', calories: 40, protein: 0.3, fat: 0, carbs: 3.1, category: 'beverage' },
  { id: '59', name: 'コーヒー（ブラック）', calories: 4, protein: 0.2, fat: 0, carbs: 0.7, category: 'beverage' },
]

export function searchFoods(query: string): FoodItem[] {
  if (!query.trim()) return []
  const normalizedQuery = query.toLowerCase()
  return foodDatabase.filter(food =>
    food.name.toLowerCase().includes(normalizedQuery)
  )
}
