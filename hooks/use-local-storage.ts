'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((prev: T) => T)) => void] {
  // 初回は localStorage を同期的に読んで初期値にする (SSR 時は initialValue)
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue
    try {
      const item = window.localStorage.getItem(key)
      return item ? (JSON.parse(item) as T) : initialValue
    } catch {
      return initialValue
    }
  })

  // 最新値を ref で保持 (関数型更新で stale closure を回避)
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
