export interface ExercisePreset {
  name: string
  muscleGroup: string
}

export const exercisePresets: ExercisePreset[] = [
  { name: 'ベンチプレス', muscleGroup: '胸' },
  { name: 'インクラインベンチプレス', muscleGroup: '胸' },
  { name: 'ダンベルフライ', muscleGroup: '胸' },
  { name: 'スクワット', muscleGroup: '脚' },
  { name: 'レッグプレス', muscleGroup: '脚' },
  { name: 'レッグエクステンション', muscleGroup: '脚' },
  { name: 'レッグカール', muscleGroup: '脚' },
  { name: 'デッドリフト', muscleGroup: '背中' },
  { name: 'ラットプルダウン', muscleGroup: '背中' },
  { name: 'ベントオーバーロウ', muscleGroup: '背中' },
  { name: 'シーテッドロウ', muscleGroup: '背中' },
  { name: 'ショルダープレス', muscleGroup: '肩' },
  { name: 'サイドレイズ', muscleGroup: '肩' },
  { name: 'フロントレイズ', muscleGroup: '肩' },
  { name: 'バイセップカール', muscleGroup: '腕' },
  { name: 'ハンマーカール', muscleGroup: '腕' },
  { name: 'トライセップエクステンション', muscleGroup: '腕' },
  { name: 'ディップス', muscleGroup: '腕' },
  { name: 'プランク', muscleGroup: '腹' },
  { name: 'クランチ', muscleGroup: '腹' },
  { name: 'レッグレイズ', muscleGroup: '腹' },
  { name: 'カーフレイズ', muscleGroup: '脚' },
]

export const muscleGroups = ['胸', '背中', '肩', '腕', '脚', '腹']

export function searchExercises(query: string): ExercisePreset[] {
  if (!query.trim()) return exercisePresets.slice(0, 5)
  const normalizedQuery = query.toLowerCase()
  return exercisePresets.filter(exercise => 
    exercise.name.toLowerCase().includes(normalizedQuery)
  )
}
