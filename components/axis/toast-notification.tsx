'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ToastNotificationProps {
  message: string
  isVisible: boolean
  onClose: () => void
  color?: string
}

export function ToastNotification({ message, isVisible, onClose, color = 'bg-foreground' }: ToastNotificationProps) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (isVisible) {
      setShow(true)
      const timer = setTimeout(() => {
        setShow(false)
        setTimeout(onClose, 300)
      }, 2500)
      return () => clearTimeout(timer)
    }
  }, [isVisible, onClose])

  if (!isVisible && !show) return null

  return (
    <div
      className={cn(
        'fixed bottom-20 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-background shadow-lg transition-all duration-300',
        color,
        show ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <CheckCircle2 className="h-4 w-4" />
      {message}
    </div>
  )
}
