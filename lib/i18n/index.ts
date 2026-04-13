'use client'

import { createContext, useContext } from 'react'
import { ja, type TranslationKeys, type TranslationShape } from './ja'
import { en } from './en'

export type Locale = 'ja' | 'en'

export const translations: Record<Locale, TranslationShape> = { ja, en }

export const I18nContext = createContext<{
  locale: Locale
  t: TranslationShape
  setLocale: (locale: Locale) => void
}>({
  locale: 'ja',
  t: ja,
  setLocale: () => {},
})

export function useI18n() {
  return useContext(I18nContext)
}

export { ja, en }
export type { TranslationKeys, TranslationShape }
