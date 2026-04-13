'use client'

import { useState, useMemo, useEffect } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { IntroSlides } from '@/components/axis/intro-slides'
import { OnboardingScreen } from '@/components/axis/onboarding-screen'
import { AppMain } from '@/components/axis/app-main'
import { I18nContext, translations, type Locale } from '@/lib/i18n'
import type { TabConfig, MetricDefinition } from '@/lib/types'
import { BUILTIN_TAB_IDS, type BuiltinTabId } from '@/lib/types'

export default function Page() {
  const [onboarded, setOnboarded] = useLocalStorage<boolean>('axis-onboarded', false)
  const [introSeen, setIntroSeen] = useLocalStorage<boolean>('axis-intro-seen', false)
  const [locale, setLocale] = useLocalStorage<Locale>('axis-locale', 'ja')
  const t = translations[locale]

  // マウント完了まで何も表示しない (フラッシュ防止)
  const [mounted, setMounted] = useState(false)
  useEffect(() => { setMounted(true) }, [])

  const i18nValue = useMemo(
    () => ({ locale, t, setLocale }),
    [locale, t, setLocale]
  )

  const handleOnboardingComplete = (
    builtinConfig: TabConfig[],
    newMetricsData: Omit<MetricDefinition, 'id' | 'createdAt'>[]
  ) => {
    if (typeof window === 'undefined') return
    const now = Date.now()
    const createdMetrics: MetricDefinition[] = newMetricsData.map(m => ({
      ...m,
      id: crypto.randomUUID(),
      createdAt: now,
    }))
    const metricTabs: TabConfig[] = createdMetrics.map(m => ({
      id: `metric:${m.id}` as const,
      visible: true,
    }))
    const existingMetrics = JSON.parse(window.localStorage.getItem('axis-metrics') || '[]')
    window.localStorage.setItem('axis-metrics', JSON.stringify([...existingMetrics, ...createdMetrics]))
    window.localStorage.setItem('axis-tab-config-v2', JSON.stringify([...builtinConfig, ...metricTabs]))
    window.localStorage.setItem('axis-onboarded', 'true')
    setOnboarded(true)
  }

  // マウント前は空画面 (フラッシュ防止)
  if (!mounted) {
    return <div className="h-[100dvh] bg-background" />
  }

  // ステージ1: 紹介スライド (初回のみ)
  if (!introSeen && !onboarded) {
    return <IntroSlides onComplete={() => setIntroSeen(true)} />
  }

  // ステージ2: オンボーディング (項目選択)
  if (!onboarded) {
    return (
      <I18nContext.Provider value={i18nValue}>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </I18nContext.Provider>
    )
  }

  // ステージ3: メインアプリ
  return <AppMain />
}
