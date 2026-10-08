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
import { CardFace, DraggableCard, Slot, TableauColumn } from '../cards/ui'
import type { GameProps } from '../types'
import {
  autoToFoundation,
  draw,
  getSourceCards,
  isWon,
  move,
  newGame,
  timeBonus,
  type Card,
  type GameState,
  type Source,
  type Target,
} from './logic'

export default function SolitaireGame({ onGameOver }: GameProps) {
  const [state, setState] = useState<GameState>(() => newGame())
  const [history, setHistory] = useState<GameState[]>([])
  const [elapsed, setElapsed] = useState(0)
  const [finalScore, setFinalScore] = useState<number | null>(null)
  const [dragging, setDragging] = useState<{ from: Source; cards: Card[]; width: number } | null>(
    null,
  )
  const [hover, setHover] = useState<Target | null>(null)
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

  const commit = (next: GameState | null) => {
    if (!next || won) return
    if (startedAt.current === null) startedAt.current = now()
    setHistory((h) => [...h.slice(-(MAX_HISTORY - 1)), state])
    setState(next)
    if (isWon(next)) {
      const sec = Math.max(1, Math.floor((now() - startedAt.current) / 1000))
      const total = next.score + timeBonus(sec)
      setElapsed(sec)
      setFinalScore(total)
      onGameOver({ score: total })
    }
  }

  const undo = () => {
    if (history.length === 0 || won) return
    setState(history[history.length - 1])
    setHistory(history.slice(0, -1))
  }

  const restart = () => {
    setState(newGame())
    setHistory([])
    setElapsed(0)
    startedAt.current = null
  }

  // 같은 카드를 짧은 시간 안에 두 번 누르면(더블클릭/더블탭) 위 칸으로 자동 이동
  const handleTap = (card: Card, from: Source) => {
    if (justDragged.current) return
    const t = now()
    const last = lastTap.current
    if (last && last.id === card.id && t - last.time < DOUBLE_TAP_MS) {
      lastTap.current = null
      commit(autoToFoundation(state, from))
      return
    }
    lastTap.current = { id: card.id, time: t }
  }

  const onDragStart = (e: DragStartEvent) => {
    const from = e.active.data.current?.from as Source
    const cards = getSourceCards(state, from)
    if (!cards) return
    // 끌고 있는 카드 폭을 그대로 써서 놓을 칸과 크기를 맞춘다
    const node = document.querySelector(`[data-card-id="${cards[0].id}"]`)
    setDragging({ from, cards, width: node?.getBoundingClientRect().width ?? 60 })
  }

  const onDragEnd = (e: DragEndEvent) => {
    const target = e.over?.data.current?.target as Target | undefined
    if (dragging && target) commit(move(state, dragging.from, target))
    setDragging(null)
    setHover(null)
    justDragged.current = true
    window.setTimeout(() => (justDragged.current = false), 100)
  }

  const hiddenIds = new Set(dragging?.cards.map((c) => c.id))
  const wasteTop = state.waste[state.waste.length - 1]

  // 끌고 있는 카드가 가장 가까운 덱에 놓였을 때의 모습 (제자리 줄은 표시 안 함)
  const showPreview =
    dragging !== null &&
    hover !== null &&
    !(
      hover.zone === 'tableau' &&
      dragging.from.zone === 'tableau' &&
      dragging.from.col === hover.col
    )
  const previewValid = showPreview && move(state, dragging.from, hover) !== null

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
            onClick={restart}
            aria-label="새 게임"
            className="rounded-lg border border-slate-300 bg-white p-2"
          >
            <RotateCcw size={20} />
          </button>
        </span>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={nearestDeck}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragOver={(e) => setHover((e.over?.data.current?.target as Target | undefined) ?? null)}
        onDragCancel={() => {
          setDragging(null)
          setHover(null)
        }}
      >
        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          <Slot
            id="stock"
            onClick={() => commit(draw(state))}
            label={state.stock.length ? undefined : '↻'}
          >
            {state.stock.length > 0 && (
              <CardFace card={state.stock[state.stock.length - 1]} style={{ top: 0 }} />
            )}
          </Slot>
          <Slot id="waste">
            {wasteTop && (
              <DraggableCard
                card={wasteTop}
                from={{ zone: 'waste' }}
                style={{ top: 0 }}
                hidden={hiddenIds.has(wasteTop.id)}
                onTap={handleTap}
              />
            )}
          </Slot>
          <div />
          {state.foundations.map((pile, p) => {
            const top = pile[pile.length - 1]
            return (
              <Slot
                key={p}
                id={`foundation-${p}`}
                target={{ zone: 'foundation', pile: p }}
                label={top ? undefined : 'A'}
                previewCard={
                  previewValid && hover?.zone === 'foundation' && hover.pile === p
                    ? dragging?.cards[0]
                    : undefined
                }
                invalid={
                  showPreview && !previewValid && hover?.zone === 'foundation' && hover.pile === p
                }
              >
                {top && (
                  <DraggableCard
                    card={top}
                    from={{ zone: 'foundation', pile: p }}
                    style={{ top: 0 }}
                    hidden={hiddenIds.has(top.id)}
                    onTap={handleTap}
                  />
                )}
              </Slot>
            )
          })}
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-3">
          {state.tableau.map((pile, col) => (
            <TableauColumn
              key={col}
              id={`tableau-${col}`}
              target={{ zone: 'tableau', col }}
              pile={pile}
              hiddenIds={hiddenIds}
              makeFrom={(index): Source => ({ zone: 'tableau', col, index })}
              onTap={handleTap}
              previewCards={
                showPreview && hover?.zone === 'tableau' && hover.col === col
                  ? dragging?.cards
                  : undefined
              }
              previewValid={previewValid}
            />
          ))}
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
  )
}
