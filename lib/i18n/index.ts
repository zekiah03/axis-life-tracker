'use client'

import { createContext, useContext } from 'react'
import { ja, type TranslationKeys } from './ja'
import { en } from './en'

export type Locale = 'ja' | 'en'

export const translations: Record<Locale, TranslationKeys> = { ja, en }

export const I18nContext = createContext<{
  locale: Locale
  t: TranslationKeys
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
export type { TranslationKeys }
