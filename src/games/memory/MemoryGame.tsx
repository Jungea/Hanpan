import { Clock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import {
  LEVELS,
  closeMismatch,
  flip,
  matchedPairs,
  newGame,
  type Level,
  type MemoryState,
} from './logic'
import { SYMBOLS } from './symbols'

const MISMATCH_DELAY_MS = 800

const now = () => Date.now()

const formatTime = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

export default function MemoryGame({ onGameOver }: GameProps) {
  const [level, setLevel] = useState<Level | null>(null)
  const [round, setRound] = useState(0)

  if (!level) {
    return (
      <div className="mx-auto flex w-full max-w-110 flex-col gap-3">
        <p className="text-center font-medium">난이도를 선택하세요</p>
        {LEVELS.map((l) => (
          <button
            key={l.name}
            type="button"
            onClick={() => setLevel(l)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-left hover:bg-slate-100"
          >
            <span className="text-lg font-bold">{l.name}</span>
            <span className="ml-3 text-sm text-slate-500">{l.pairs}쌍</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <Board
      key={`${level.name}-${round}`}
      level={level}
      onGameOver={onGameOver}
      onRetry={() => setRound((r) => r + 1)}
      onChangeLevel={() => setLevel(null)}
    />
  )
}

type BoardProps = {
  level: Level
  onGameOver: GameProps['onGameOver']
  onRetry: () => void
  onChangeLevel: () => void
}

function Board({ level, onGameOver, onRetry, onChangeLevel }: BoardProps) {
  const [state, setState] = useState<MemoryState>(() => newGame(level.pairs))
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef<number | null>(null)

  // 짝이 안 맞으면 잠깐 보여 준 뒤 다시 덮는다 (그동안 추가 입력은 무시된다)
  useEffect(() => {
    if (state.open.length < 2) return
    const id = window.setTimeout(() => setState((s) => closeMismatch(s)), MISMATCH_DELAY_MS)
    return () => window.clearTimeout(id)
  }, [state.open.length])

  useEffect(() => {
    if (startedAt.current === null || state.won) return
    const id = window.setInterval(() => {
      if (startedAt.current !== null) setElapsed(Math.floor((now() - startedAt.current) / 1000))
    }, 500)
    return () => window.clearInterval(id)
  }, [state.moves, state.open.length, state.won])

  const onFlip = (index: number) => {
    const next = flip(state, index)
    if (next === state) return
    if (startedAt.current === null) startedAt.current = now()
    setState(next)
    if (next.won) {
      setElapsed(Math.max(1, Math.floor((now() - startedAt.current) / 1000)))
      onGameOver({ score: next.moves, variant: level.name })
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col gap-3">
      <div className="flex items-center justify-between text-lg font-semibold tabular-nums">
        <span>{state.moves}번</span>
        <span className="text-sm font-normal text-slate-500">
          {matchedPairs(state)} / {level.pairs}쌍
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={18} />
          {formatTime(elapsed)}
        </span>
      </div>

      <div
        className="grid gap-2"
        style={{ gridTemplateColumns: `repeat(${level.cols}, minmax(0, 1fr))` }}
      >
        {state.cards.map((card, i) => {
          const symbol = SYMBOLS[card.symbol]
          const faceUp = card.state !== 'hidden'
          return (
            <button
              key={i}
              type="button"
              onClick={() => onFlip(i)}
              aria-label={faceUp ? symbol.name : `카드 ${i + 1}`}
              aria-pressed={faceUp}
              className="aspect-3/4 touch-manipulation [perspective:600px]"
            >
              <span
                className={`relative block h-full w-full transition-transform duration-300 [transform-style:preserve-3d] ${
                  faceUp ? '[transform:rotateY(180deg)]' : ''
                }`}
              >
                {/* 뒷면 */}
                <span
                  className="absolute inset-0 rounded-xl border border-blue-900 bg-blue-700 [backface-visibility:hidden]"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 8px, transparent 8px 16px)',
                  }}
                />
                {/* 앞면 */}
                <span
                  className={`absolute inset-0 flex items-center justify-center rounded-xl border bg-white [backface-visibility:hidden] [transform:rotateY(180deg)] ${
                    card.state === 'matched'
                      ? 'border-emerald-400 bg-emerald-50'
                      : 'border-slate-300'
                  }`}
                >
                  <symbol.Icon
                    className={`h-1/2 w-1/2 ${symbol.color} ${symbol.filled ? 'fill-current' : ''}`}
                    strokeWidth={1.75}
                  />
                </span>
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex justify-center gap-2 pt-1">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          다시 섞기
        </button>
        <button
          type="button"
          onClick={onChangeLevel}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          난이도 변경
        </button>
      </div>
    </div>
  )
}
