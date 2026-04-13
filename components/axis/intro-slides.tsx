'use client'

import { useState } from 'react'
import {
  ArrowRight,
  BarChart3,
  Link2,
  Shield,
  Lightbulb,
  TrendingDown,
  AlertTriangle,
  Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface IntroSlidesProps {
  onComplete: () => void
}

interface Slide {
  icon: React.ReactNode
  title: string
  subtitle?: string
  body: string[]
  accent?: string // テーマカラー
}

const slides: Slide[] = [
  {
    icon: <AlertTriangle className="h-8 w-8" />,
    accent: '#facc15',
    title: 'なんとなく毎日が\n過ぎていませんか?',
    body: [
      '振り返ると、何をしたか思い出せない日がある。',
      '筋トレ、食事、支出、睡眠...',
      'それぞれは管理してるのに、全部がバラバラ。',
    ],
  },
  {
    icon: <TrendingDown className="h-8 w-8" />,
    accent: '#ef4444',
    title: '実は、それには\nちゃんと理由があります。',
    body: [
      '生活のデータが「つながっていない」状態です。',
      '睡眠が悪いから集中力が落ちる。',
      '集中力が落ちるから仕事が長引く。',
      '仕事が長引くから運動できない。',
      'すべては連鎖しています。',
    ],
  },
  {
    icon: <Link2 className="h-8 w-8" />,
    accent: '#60a5fa',
    title: 'バラバラの管理を\nひとつに。',
    subtitle: 'TeleLog は生活のすべてを1つのアプリで記録します。',
    body: [
      'お金、筋トレ、食事、睡眠、体重、メンタル、習慣。',
      'バラバラだったデータが、つながる。',
      'つながるから、見えなかった原因が見える。',
    ],
  },
  {
    icon: <BarChart3 className="h-8 w-8" />,
    accent: '#a78bfa',
    title: 'あなたの生活を\n可視化します。',
    subtitle: '記録するだけで、変化が見えてくる。',
    body: [
      '「運動した日は睡眠の質が15%高い」',
      '「カフェインを摂りすぎた日は睡眠が30分短い」',
      '「このペースだと3週間後に体重+2kg」',
      'データが、あなた自身の答えを教えてくれます。',
    ],
  },
  {
    icon: <Lightbulb className="h-8 w-8" />,
    accent: '#facc15',
    title: '問題を知ることが\n最初の一歩。',
    body: [
      '人は「問題に気づく」だけで行動が変わります。',
      '何が良くて、何が悪いのか。',
      'どこが調子良くて、どこが調子悪いのか。',
      'このままだと良くないのか。',
      'TeleLog が、あなたに教えます。',
    ],
  },
  {
    icon: <Zap className="h-8 w-8" />,
    accent: '#22d3a0',
    title: '気づいたら、\n生活が整ってた。',
    subtitle: 'アプリを開いて、記録するだけ。',
    body: [
      '無駄なアプリ課金が減った。',
      '睡眠が安定して、集中できるようになった。',
      '体重が自然と目標に近づいた。',
      'すべてが連動するから、整う。',
    ],
  },
]

export function IntroSlides({ onComplete }: IntroSlidesProps) {
  const [currentSlide, setCurrentSlide] = useState(0)
  const slide = slides[currentSlide]
  const isLast = currentSlide === slides.length - 1

  const next = () => {
    if (isLast) {
      onComplete()
    } else {
      setCurrentSlide(prev => prev + 1)
    }
  }

  const skip = () => {
    onComplete()
  }

  return (
    <div className="flex h-[100dvh] max-w-[480px] mx-auto flex-col bg-background overflow-hidden">
      {/* スキップボタン */}
      <div className="flex justify-end p-4 shrink-0">
        <button
          type="button"
          onClick={skip}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          スキップ
        </button>
      </div>

      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col justify-center px-8 space-y-6">
        {/* アイコン */}
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl"
          style={{ backgroundColor: (slide.accent || '#f5f5f7') + '1a', color: slide.accent }}
        >
          {slide.icon}
        </div>

        {/* タイトル */}
        <h1 className="text-2xl font-bold text-foreground whitespace-pre-line leading-tight">
          {slide.title}
        </h1>

        {/* サブタイトル */}
        {slide.subtitle && (
          <p className="text-sm font-medium" style={{ color: slide.accent }}>
            {slide.subtitle}
          </p>
        )}

        {/* 本文 */}
        <div className="space-y-3">
          {slide.body.map((line, i) => (
            <p key={i} className="text-sm text-muted-foreground leading-relaxed">
              {line}
            </p>
          ))}
        </div>
      </div>

      {/* 下部: ドットインジケーター + ボタン */}
      <div className="shrink-0 p-6 pb-10 space-y-4">
        {/* ドットインジケーター */}
        <div className="flex justify-center gap-2">
          {slides.map((_, i) => (
            <div
              key={i}
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                i === currentSlide ? 'w-6' : 'w-1.5',
              )}
              style={{
                backgroundColor: i === currentSlide
                  ? (slide.accent || '#f5f5f7')
                  : 'var(--color-secondary)',
              }}
            />
          ))}
        </div>

        {/* 次へ / 始める ボタン */}
        <Button
          type="button"
          onClick={next}
          className="w-full h-12 text-base font-medium gap-2"
          style={{
            backgroundColor: isLast ? '#22d3a0' : slide.accent || '#f5f5f7',
            color: '#0a0a0f',
          }}
        >
          {isLast ? 'TeleLog を始める' : '次へ'}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
