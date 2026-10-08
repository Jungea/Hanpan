import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { Clock, RotateCcw, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import {
  CONTAINER,
  DOUBLE_TAP_MS,
  MAX_HISTORY,
  OFFSET_UP,
  formatTime,
  nearestDeck,
  now,
  stackHeight,
} from '../cards/layout'
import { CardFace, Slot, TableauColumn } from '../cards/ui'
import { isRed, type Card, type Suit } from '../solitaire/logic'
import type { GameProps } from '../types'
import {
  COLUMNS,
  TOTAL_RUNS,
  autoMove,
  canDeal,
  dealRow,
  getRun,
  isWon,
  move,
  newSpiderGame,
  runStart,
  type SpiderSource,
  type SpiderState,
  type SuitCount,
} from './logic'

const SUIT_SYMBOL: Record<Suit, string> = { S: '♠', H: '♥', D: '♦', C: '♣' }

const LEVELS: { count: SuitCount; name: string; hint: string }[] = [
  { count: 1, name: '1무늬', hint: '쉬움 · ♠만 사용' },
  { count: 2, name: '2무늬', hint: '보통 · ♠ ♥' },
  { count: 4, name: '4무늬', hint: '어려움 · ♠ ♥ ♦ ♣' },
]

export default function SpiderGame({ onGameOver }: GameProps) {
  const [suitCount, setSuitCount] = useState<SuitCount | null>(null)
  const [round, setRound] = useState(0)

  if (!suitCount) {
    return (
      <div className="mx-auto flex w-full max-w-110 flex-col gap-3">
        <p className="text-center font-medium">난이도를 선택하세요</p>
        {LEVELS.map((level) => (
          <button
            key={level.count}
            type="button"
            onClick={() => setSuitCount(level.count)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-left hover:bg-slate-100"
          >
            <span className="text-lg font-bold">{level.name}</span>
            <span className="ml-3 text-sm text-slate-500">{level.hint}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <SpiderBoard
      key={`${suitCount}-${round}`}
      suitCount={suitCount}
      onGameOver={onGameOver}
      onRestart={() => setRound((r) => r + 1)}
      onChangeDifficulty={() => setSuitCount(null)}
    />
  )
}

type BoardProps = {
  suitCount: SuitCount
  onGameOver: GameProps['onGameOver']
  onRestart: () => void
  onChangeDifficulty: () => void
}

function SpiderBoard({ suitCount, onGameOver, onRestart, onChangeDifficulty }: BoardProps) {
  const [state, setState] = useState<SpiderState>(() => newSpiderGame(suitCount))
  const [history, setHistory] = useState<SpiderState[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [dragging, setDragging] = useState<{
    from: SpiderSource
    cards: Card[]
    width: number
  } | null>(null)
  const [hover, setHover] = useState<number | null>(null)
  const [notice, setNotice] = useState('')
  const startedAt = useRef<number | null>(null)
  const lastTap = useRef<{ id: number; time: number } | null>(null)
  const justDragged = useRef(false)

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const won = finalScore !== null

  useEffect(() => {
    if (startedAt.current === null || won) return
    const id = window.setInterval(() => {
      if (startedAt.current !== null) setElapsed(Math.floor((now() - startedAt.current) / 1000))
    }, 500)
    return () => window.clearInterval(id)
  }, [history.length, won])

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(''), 2000)
    return () => window.clearTimeout(id)
  }, [notice])

  const commit = (next: SpiderState | null) => {
    if (!next || won) return
    if (startedAt.current === null) startedAt.current = now()
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), state])
    setState(next)
    if (isWon(next)) {
      setElapsed(Math.max(1, Math.floor((now() - startedAt.current) / 1000)))
      setFinalScore(next.score)
      onGameOver({ score: next.score, variant: `${suitCount}무늬` })
    }
  }

  const undo = () => {
    if (history.length === 0 || won) return
    setState(history[history.length - 1])
    setHistory(history.slice(0, -1))
  }

  const deal = () => {
    if (state.stock.length === 0) return
    if (!canDeal(state)) {
      setNotice('빈 줄에 카드를 먼저 놓아야 나눠 줄 수 있어요')
      return
    }
    commit(dealRow(state))
  }

  // 같은 카드를 짧은 시간 안에 두 번 누르면(더블클릭/더블탭) 알맞은 줄로 자동 이동
  const handleTap = (card: Card, from: SpiderSource) => {
    if (justDragged.current) return
    const t = now()
    const last = lastTap.current
    if (last && last.id === card.id && t - last.time < DOUBLE_TAP_MS) {
      lastTap.current = null
      commit(autoMove(state, from))
      return
    }
    lastTap.current = { id: card.id, time: t }
  }

  const onDragStart = (e: DragStartEvent) => {
    const from = e.active.data.current?.from as SpiderSource
    const cards = getRun(state, from)
    if (!cards) return
    // 끌고 있는 카드 폭을 그대로 써서 놓을 줄과 크기를 맞춘다
    const node = document.querySelector(`[data-card-id="${cards[0].id}"]`)
    setDragging({ from, cards, width: node?.getBoundingClientRect().width ?? 34 })
  }

  const onDragEnd = (e: DragEndEvent) => {
    const target = e.over?.data.current?.target as { col: number } | undefined
    if (dragging && target) commit(move(state, dragging.from, target.col))
    setDragging(null)
    setHover(null)
    justDragged.current = true
    window.setTimeout(() => (justDragged.current = false), 100)
  }

  const hiddenIds = new Set(dragging?.cards.map((c) => c.id))
  const showPreview = dragging !== null && hover !== null && hover !== dragging.from.col
  const previewValid = showPreview && move(state, dragging.from, hover) !== null
  const dealsLeft = Math.ceil(state.stock.length / COLUMNS)

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-3">
      <div className="flex items-center justify-between text-lg font-semibold tabular-nums">
        <span>점수 {finalScore ?? state.score}</span>
        <span className="inline-flex items-center gap-1">
          <Clock size={18} />
          {formatTime(elapsed)}
        </span>
        <span className="inline-flex gap-2">
          <button
            type="button"
            onClick={undo}
            disabled={history.length === 0 || won}
            aria-label="되돌리기"
            className="rounded-lg border border-slate-300 bg-white p-2 disabled:opacity-40"
          >
            <Undo2 size={20} />
          </button>
          <button
            type="button"
            onClick={onRestart}
            aria-label="새 게임"
            className="rounded-lg border border-slate-300 bg-white p-2"
          >
            <RotateCcw size={20} />
          </button>
        </span>
      </div>

      <div className="overflow-x-auto">
        <DndContext
          sensors={sensors}
          collisionDetection={nearestDeck}
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={(e) =>
            setHover((e.over?.data.current?.target as { col: number } | undefined)?.col ?? null)
          }
          onDragCancel={() => {
            setDragging(null)
            setHover(null)
          }}
        >
          <div className="grid min-w-87.5 grid-cols-10 gap-0.5 sm:gap-2">
            <div className="col-span-9 flex items-center gap-1" aria-label="완성한 카드 묶음">
              {Array.from({ length: TOTAL_RUNS }, (_, i) => {
                const suit = state.completed[i]
                return (
                  <span
                    key={i}
                    className={`flex h-7 w-6 items-center justify-center rounded border text-sm font-bold ${
                      suit
                        ? `border-slate-400 bg-white ${isRed({ suit } as Card) ? 'text-red-600' : 'text-slate-900'}`
                        : 'border-dashed border-slate-300'
                    }`}
                  >
                    {suit ? SUIT_SYMBOL[suit] : ''}
                  </span>
                )
              })}
            </div>
            <Slot id="stock" onClick={deal} label={state.stock.length ? undefined : '✓'}>
              {state.stock.length > 0 && (
                <>
                  <CardFace card={state.stock[state.stock.length - 1]} style={{ top: 0 }} />
                  <span className="absolute inset-0 flex items-center justify-center text-sm font-bold text-white">
                    {dealsLeft}
                  </span>
                </>
              )}
            </Slot>
          </div>

          <div className="grid min-w-87.5 grid-cols-10 gap-0.5 sm:gap-2">
            {state.tableau.map((pile, col) => {
              const start = runStart(pile)
              return (
                <TableauColumn
                  key={col}
                  id={`column-${col}`}
                  target={{ col }}
                  pile={pile}
                  hiddenIds={hiddenIds}
                  makeFrom={(index): SpiderSource => ({ col, index })}
                  isDraggable={(index) => index >= start}
                  onTap={handleTap}
                  previewCards={showPreview && hover === col ? dragging?.cards : undefined}
                  previewValid={previewValid}
                />
              )
            })}
          </div>

          <DragOverlay dropAnimation={null}>
            {dragging && (
              <div style={{ width: dragging.width }} className={CONTAINER}>
                <div className="relative" style={{ height: `${stackHeight(dragging.cards)}cqw` }}>
                  {dragging.cards.map((card, i) => (
                    <CardFace key={card.id} card={card} style={{ top: `${i * OFFSET_UP}cqw` }} />
                  ))}
                </div>
              </div>
            )}
          </DragOverlay>
        </DndContext>
      </div>

      <p className="min-h-5 text-center text-sm text-red-600" role="status">
        {notice}
      </p>
      <button
        type="button"
        onClick={onChangeDifficulty}
        className="self-center rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
      >
        난이도 변경
      </button>
    </div>
  )
}
