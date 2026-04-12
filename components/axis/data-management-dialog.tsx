'use client'

import { useRef, useState } from 'react'
import {
  Download,
  Upload,
  Database,
  FileJson,
  FileText,
  AlertTriangle,
  Check,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import {
  buildBackup,
  downloadBackup,
  exportCSV,
  parseBackupFile,
  summarize,
  type AxisBackup,
  type DataSummary,
} from '@/lib/data-export'
import { cn } from '@/lib/utils'

interface DataManagementDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onAfterImport: () => void // import 完了後にアプリ状態を再読み込みするためのコールバック
}

type Stage = 'menu' | 'import-preview' | 'import-success' | 'import-error'

const CSV_EXPORTS: { key: Parameters<typeof exportCSV>[0]; label: string }[] = [
  { key: 'axis-transactions', label: '取引 (家計簿)' },
  { key: 'axis-workout-sessions', label: 'ワークアウトセッション' },
  { key: 'axis-foods', label: '食事記録' },
  { key: 'axis-sleeps', label: '睡眠' },
  { key: 'axis-bodies', label: '体組成' },
  { key: 'axis-metric-entries', label: '数値ログ (エントリ)' },
]

export function DataManagementDialog({
  open,
  onOpenChange,
  onAfterImport,
}: DataManagementDialogProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [stage, setStage] = useState<Stage>('menu')
  const [pendingBackup, setPendingBackup] = useState<AxisBackup | null>(null)
  const [pendingSummary, setPendingSummary] = useState<DataSummary | null>(null)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [csvOpen, setCsvOpen] = useState(false)

  const reset = () => {
    setStage('menu')
    setPendingBackup(null)
    setPendingSummary(null)
    setErrorMsg(null)
    setSuccessMsg(null)
    setCsvOpen(false)
  }

  const handleExport = () => {
    const backup = buildBackup()
    downloadBackup(backup)
  }

  const handlePickFile = () => {
    fileInputRef.current?.click()
  }

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const backup = await parseBackupFile(file)
      const summary = summarize(backup)
      setPendingBackup(backup)
      setPendingSummary(summary)
      setStage('import-preview')
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'ファイルの読み込みに失敗しました')
      setStage('import-error')
    } finally {
      // 同じファイルを再選択できるようにクリア
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const applyImport = async (mode: 'merge' | 'replace') => {
    if (!pendingBackup) return
    const { applyBackup } = await import('@/lib/data-export')
    applyBackup(pendingBackup, mode)
    setSuccessMsg(
      mode === 'replace'
        ? 'データを置き換えました。再読み込みします。'
        : 'データをマージしました。再読み込みします。'
    )
    setStage('import-success')
    // 少し待ってからリロード
    setTimeout(() => {
      onAfterImport()
      onOpenChange(false)
      reset()
    }, 1200)
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) reset()
        onOpenChange(next)
      }}
    >
      <DialogContent className="max-w-[440px] max-h-[85vh] overflow-y-auto">
        {stage === 'menu' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Database className="h-5 w-5" />
                データの管理
              </DialogTitle>
              <DialogDescription>
                全データをバックアップまたは別端末から復元できます。
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground px-1">
                エクスポート
              </h3>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={handleExport}
              >
                <FileJson className="h-4 w-4 text-food" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">JSON で全データをダウンロード</p>
                  <p className="text-[10px] text-muted-foreground">
                    バックアップ / 別端末への移行用
                  </p>
                </div>
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={() => setCsvOpen(!csvOpen)}
              >
                <FileText className="h-4 w-4 text-money" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">CSV 形式で個別エクスポート</p>
                  <p className="text-[10px] text-muted-foreground">
                    Excel / Numbers / Google Sheets で開ける
                  </p>
                </div>
              </Button>
              {csvOpen && (
                <div className="pl-7 space-y-1 py-1 animate-in fade-in-0 slide-in-from-top-1">
                  {CSV_EXPORTS.map(({ key, label }) => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => exportCSV(key)}
                      className="flex w-full items-center justify-between text-xs text-muted-foreground hover:text-foreground py-1.5 px-2 rounded-md hover:bg-secondary/50 transition-colors"
                    >
                      <span>{label}</span>
                      <Download className="h-3 w-3" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="space-y-2">
              <h3 className="text-xs font-medium text-muted-foreground px-1">
                インポート
              </h3>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start gap-3 h-auto py-3"
                onClick={handlePickFile}
              >
                <Upload className="h-4 w-4 text-foreground" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium">JSON ファイルから復元</p>
                  <p className="text-[10px] text-muted-foreground">
                    バックアップファイルを選択してプレビュー
                  </p>
                </div>
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                className="hidden"
                onChange={handleFileSelected}
              />
            </div>
          </>
        )}

        {stage === 'import-preview' && pendingBackup && pendingSummary && (
          <>
            <DialogHeader>
              <DialogTitle>インポート内容を確認</DialogTitle>
              <DialogDescription>
                取り込むデータを確認してください。
              </DialogDescription>
            </DialogHeader>

            <div className="rounded-lg border border-border bg-secondary/40 p-3 space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">エクスポート日時</span>
                <span className="text-foreground">
                  {new Date(pendingBackup.exportedAt).toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground">フォーマット</span>
                <span className="text-foreground font-mono">
                  v{pendingBackup.version}
                </span>
              </div>
            </div>

            <div className="space-y-1 text-sm">
              <SummaryRow label="取引" count={pendingSummary.transactions} />
              <SummaryRow label="カテゴリ" count={pendingSummary.categories} />
              <SummaryRow label="予算" count={pendingSummary.budgets} />
              <SummaryRow label="ワークアウト" count={pendingSummary.workoutSessions} />
              <SummaryRow label="食事記録" count={pendingSummary.foods} />
              <SummaryRow label="カスタム食品" count={pendingSummary.customFoods} />
              <SummaryRow label="レシピ" count={pendingSummary.recipes} />
              <SummaryRow label="睡眠" count={pendingSummary.sleeps} />
              <SummaryRow label="体組成" count={pendingSummary.bodies} />
              <SummaryRow label="数値項目" count={pendingSummary.metrics} />
              <SummaryRow label="数値エントリ" count={pendingSummary.metricEntries} />
            </div>

            <div className="rounded-lg border border-workout/30 bg-workout/10 p-3 flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-workout shrink-0 mt-0.5" />
              <p className="text-xs text-muted-foreground">
                「置き換え」は既存データを完全に上書きします。念のため先に現在のデータをエクスポートしておくことをお勧めします。
              </p>
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={reset}
              >
                キャンセル
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => applyImport('merge')}
              >
                マージ
              </Button>
              <Button
                type="button"
                className="flex-1 bg-destructive hover:bg-destructive/90 text-background"
                onClick={() => {
                  if (
                    confirm(
                      '既存の全データを完全に上書きします。現在のデータは失われます。よろしいですか?'
                    )
                  ) {
                    applyImport('replace')
                  }
                }}
              >
                置き換え
              </Button>
            </div>
          </>
        )}

        {stage === 'import-success' && (
          <div className="py-8 text-center space-y-3">
            <div className="flex items-center justify-center">
              <div className="h-12 w-12 rounded-full bg-money/20 flex items-center justify-center">
                <Check className="h-6 w-6 text-money" />
              </div>
            </div>
            <p className="text-sm font-medium text-foreground">
              {successMsg}
            </p>
          </div>
        )}

        {stage === 'import-error' && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertTriangle className="h-5 w-5" />
                インポートエラー
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground">{errorMsg}</p>
            <Button type="button" variant="outline" onClick={reset}>
              戻る
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}

function SummaryRow({ label, count }: { label: string; count: number }) {
  return (
    <div
      className={cn(
        'flex items-center justify-between py-1 px-1 rounded',
        count > 0 ? 'text-foreground' : 'text-muted-foreground/60'
      )}
    >
      <span>{label}</span>
      <span className="font-mono font-semibold">{count}</span>
    </div>
  )
}
