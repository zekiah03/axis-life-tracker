'use client'

import { useState, useCallback, useRef } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // 同期的に localStorage から読む。SSR時は initialValue にフォールバック。
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item !== null ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

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
