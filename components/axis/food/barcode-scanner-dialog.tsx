'use client'

import { useEffect, useRef, useState } from 'react'
import { X, Loader2, Camera } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { createBarcodeDetector, isBarcodeSupported } from '@/lib/barcode'
import { useI18n } from '@/lib/i18n'

interface BarcodeScannerDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onScanned: (barcode: string) => void
}

export function BarcodeScannerDialog({
  open,
  onOpenChange,
  onScanned,
}: BarcodeScannerDialogProps) {
  const { t } = useI18n()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const stopLoopRef = useRef(false)
  const [status, setStatus] = useState<'idle' | 'starting' | 'scanning' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!open) {
      cleanup()
      return
    }
    if (!isBarcodeSupported()) {
      setStatus('error')
      setError(t.food.barcodeNotSupported)
      return
    }
    start()
    return cleanup
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  async function start() {
    setStatus('starting')
    setError(null)
    stopLoopRef.current = false
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
      }
      setStatus('scanning')
      scanLoop()
    } catch (err) {
      setStatus('error')
      setError(
        err instanceof Error
          ? t.food.cameraErrorWith(err.message)
          : t.food.cameraError
      )
    }
  }

  async function scanLoop() {
    const detector = await createBarcodeDetector()
    if (!detector || !videoRef.current) return
    while (!stopLoopRef.current && videoRef.current && videoRef.current.readyState >= 2) {
      try {
        const results = await detector.detect(videoRef.current)
        if (results.length > 0) {
          const code = results[0].rawValue
          if (code) {
            stopLoopRef.current = true
            onScanned(code)
            onOpenChange(false)
            return
          }
        }
      } catch {
        // skip frame
      }
      await new Promise(r => setTimeout(r, 200))
    }
  }

  function cleanup() {
    stopLoopRef.current = true
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStatus('idle')
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[420px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            バーコードをスキャン
          </DialogTitle>
        </DialogHeader>

        <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-black">
          <video
            ref={videoRef}
            className="w-full h-full object-cover"
            playsInline
            muted
          />
          {/* ガイド枠 */}
          {status === 'scanning' && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-3/4 h-1/3 border-2 border-food/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />
            </div>
          )}
          {/* ステータスオーバーレイ */}
          {status !== 'scanning' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4">
              {status === 'starting' && (
                <>
                  <Loader2 className="h-6 w-6 text-food animate-spin mb-2" />
                  <p className="text-sm text-muted-foreground">{t.food.cameraStarting}</p>
                </>
              )}
              {status === 'error' && (
                <>
                  <X className="h-6 w-6 text-destructive mb-2" />
                  <p className="text-sm text-destructive">{error}</p>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground text-center">
          JAN/EAN/UPC バーコードに対応
        </p>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => onOpenChange(false)}
        >
          キャンセル
        </Button>
      </DialogContent>
    </Dialog>
  )
}
