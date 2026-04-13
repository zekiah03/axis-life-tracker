'use client'

import { useState, useMemo } from 'react'
import { useLocalStorage } from '@/hooks/use-local-storage'
import { OnboardingScreen } from '@/components/axis/onboarding-screen'
import { AppMain } from '@/components/axis/app-main'
import { I18nContext, translations, type Locale } from '@/lib/i18n'
import type { TabConfig, MetricDefinition } from '@/lib/types'
import { BUILTIN_TAB_IDS, type BuiltinTabId } from '@/lib/types'

// Thin gate component: shows onboarding if not onboarded, otherwise mounts AppMain.
// This ensures AppMain's 20+ hooks are never executed during onboarding.
export default function Page() {
  const [onboarded, setOnboarded] = useLocalStorage<boolean>('axis-onboarded', false)
  const [locale, setLocale] = useLocalStorage<Locale>('axis-locale', 'ja')
  const t = translations[locale]

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
    // Write directly to localStorage — AppMain will read on mount
    const existingMetrics = JSON.parse(window.localStorage.getItem('axis-metrics') || '[]')
    window.localStorage.setItem('axis-metrics', JSON.stringify([...existingMetrics, ...createdMetrics]))
    window.localStorage.setItem('axis-tab-config-v2', JSON.stringify([...builtinConfig, ...metricTabs]))
    window.localStorage.setItem('axis-onboarded', 'true')
    // Trigger re-render so AppMain mounts
    setOnboarded(true)
  }

  if (!onboarded) {
    return (
      <I18nContext.Provider value={i18nValue}>
        <OnboardingScreen onComplete={handleOnboardingComplete} />
      </I18nContext.Provider>
    )
  }

  return <AppMain />
}
