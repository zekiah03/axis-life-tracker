'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // SSR では常に initialValue を使い、クライアントマウント後に localStorage から読む
  const [storedValue, setStoredValue] = useState<T>(initialValue)
  const initialized = useRef(false)

  // クライアントマウント後に localStorage から初期値を読み込む (1回だけ)
  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    try {
      const item = window.localStorage.getItem(key)
      if (item !== null) {
        setStoredValue(JSON.parse(item) as T)
      }
    } catch {
      // noop
    }
  }, [key])

  const valueRef = useRef(storedValue)
  valueRef.current = storedValue

  const setValue = useCallback(
    (value: T | ((prev: T) => T)) => {
      try {
        const newValue = value instanceof Function ? value(valueRef.current) : value
        setStoredValue(newValue)
        valueRef.current = newValue
        if (typeof window !== 'undefined') {
          window.localStorage.setItem(key, JSON.stringify(newValue))
        }
      } catch (error) {
        console.error('Error writing to localStorage:', error)
      }
    },
    [key]
  )

  return [storedValue, setValue]
}
