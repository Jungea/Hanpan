import { Brush, Clock, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import {
  SIZES,
  generatePuzzle,
  isLineSatisfied,
  isSolved,
  setCell,
  type CellMark,
  type Puzzle,
  type Size,
} from './logic'

const now = () => Date.now()

const formatTime = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

export default function NonogramGame({ onGameOver }: GameProps) {
  const [size, setSize] = useState<Size | null>(null)
  const [round, setRound] = useState(0)

  if (!size) {
    return (
      <div className="mx-auto flex w-full max-w-110 flex-col gap-3">
        <p className="text-center font-medium">크기를 선택하세요</p>
        {SIZES.map((s) => (
          <button
            key={s.name}
            type="button"
            onClick={() => setSize(s)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-left hover:bg-slate-100"
          >
            <span className="text-lg font-bold">{s.name}</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <Board
      key={`${size.name}-${round}`}
      size={size}
      onGameOver={onGameOver}
      onRetry={() => setRound((r) => r + 1)}
      onChangeSize={() => setSize(null)}
    />
  )
}

type BoardProps = {
  size: Size
  onGameOver: GameProps['onGameOver']
  onRetry: () => void
  onChangeSize: () => void
}

function Board({ size, onGameOver, onRetry, onChangeSize }: BoardProps) {
  const { n } = size
  const [puzzle] = useState<Puzzle>(() => generatePuzzle(size))
  const [grid, setGrid] = useState<CellMark[]>(() => new Array(n * n).fill('empty'))
  const [markMode, setMarkMode] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef<number | null>(null)
  const painting = useRef<{ mark: CellMark } | null>(null)
  const wonRef = useRef(false)

  useEffect(() => {
    if (wonRef.current) return
    const id = window.setInterval(() => {
      if (startedAt.current !== null) setElapsed(Math.floor((now() - startedAt.current) / 1000))
    }, 500)
    return () => window.clearInterval(id)
  }, [])

  useEffect(() => {
    if (wonRef.current || !isSolved(grid, n, puzzle.rowHints, puzzle.colHints)) return
    wonRef.current = true
    const sec = Math.max(1, Math.floor((now() - (startedAt.current ?? now())) / 1000))
    setElapsed(sec)
    onGameOver({ score: sec, variant: size.name })
  }, [grid, n, puzzle.rowHints, puzzle.colHints, onGameOver, size.name])

  const applyPaint = (index: number, mark: CellMark) => {
    setGrid((g) => setCell(g, index, mark))
  }

  const indexFromTarget = (target: EventTarget | null): number | null => {
    const el = (target as HTMLElement | null)?.closest('[data-index]')
    const attr = el?.getAttribute('data-index')
    return attr === null || attr === undefined ? null : Number(attr)
  }

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (wonRef.current) return
    const index = indexFromTarget(e.target)
    if (index === null) return
    if (startedAt.current === null) startedAt.current = now()
    const current = grid[index]
    const mark: CellMark = markMode
      ? current === 'marked' ? 'empty' : 'marked'
      : current === 'filled' ? 'empty' : 'filled'
    painting.current = { mark }
    applyPaint(index, mark)
    e.currentTarget.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!painting.current) return
    const el = document.elementFromPoint(e.clientX, e.clientY)
    const index = indexFromTarget(el)
    if (index === null) return
    applyPaint(index, painting.current.mark)
  }

  const stopPainting = (e: React.PointerEvent<HTMLDivElement>) => {
    painting.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // 이미 해제된 경우 무시
    }
  }

  const rowSatisfied = (r: number) =>
    isLineSatisfied(
      Array.from({ length: n }, (_, c) => grid[r * n + c]),
      puzzle.rowHints[r],
    )
  const colSatisfied = (c: number) =>
    isLineSatisfied(
      Array.from({ length: n }, (_, r) => grid[r * n + c]),
      puzzle.colHints[c],
    )

  const cellPx = n >= 15 ? 22 : n >= 10 ? 28 : 40
  const hintPx = n >= 15 ? 32 : 40

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-3">
      <div className="flex w-full max-w-110 items-center justify-between text-lg font-semibold tabular-nums">
        <span>{size.name}</span>
        <span className="inline-flex items-center gap-1">
          <Clock size={18} />
          {formatTime(elapsed)}
        </span>
      </div>

      <div className="max-w-full overflow-x-auto">
        <div
          className="grid touch-none select-none gap-px bg-slate-300 p-px"
          style={{ gridTemplateColumns: `${hintPx}px repeat(${n}, ${cellPx}px)` }}
          onContextMenu={(e) => e.preventDefault()}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={stopPainting}
          onPointerCancel={stopPainting}
        >
          <div style={{ width: hintPx, height: hintPx }} className="bg-slate-50" />
          {puzzle.colHints.map((hints, c) => (
            <div
              key={`ch-${c}`}
              style={{ width: cellPx, height: hintPx }}
              className={`flex flex-col items-center justify-end bg-slate-50 text-[0.65rem] leading-tight font-semibold ${
                colSatisfied(c) ? 'text-slate-300' : 'text-slate-600'
              }`}
            >
              {(hints.length === 0 ? [0] : hints).map((h, i) => <span key={i}>{h}</span>)}
            </div>
          ))}

          {Array.from({ length: n }, (_, r) => (
            <>
              <div
                key={`rh-${r}`}
                style={{ width: hintPx, height: cellPx }}
                className={`flex items-center justify-end gap-1 bg-slate-50 px-1 text-[0.65rem] font-semibold ${
                  rowSatisfied(r) ? 'text-slate-300' : 'text-slate-600'
                }`}
              >
                {(puzzle.rowHints[r].length === 0 ? [0] : puzzle.rowHints[r]).map((h, i) => (
                  <span key={i}>{h}</span>
                ))}
              </div>
              {Array.from({ length: n }, (_, c) => {
                const index = r * n + c
                const mark = grid[index]
                return (
                  <div
                    key={index}
                    data-index={index}
                    role="button"
                    aria-label={`${r + 1}행 ${c + 1}열`}
                    style={{
                      width: cellPx,
                      height: cellPx,
                      borderRight: c % 5 === 4 && c !== n - 1 ? '2px solid #64748b' : undefined,
                      borderBottom: r % 5 === 4 && r !== n - 1 ? '2px solid #64748b' : undefined,
                    }}
                    className={`flex touch-manipulation items-center justify-center ${
                      mark === 'filled' ? 'bg-slate-800' : 'bg-white hover:bg-slate-100'
                    }`}
                  >
                    {mark === 'marked' && <X size={cellPx * 0.6} className="text-slate-400" />}
                  </div>
                )
              })}
            </>
          ))}
        </div>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMarkMode((v) => !v)}
          aria-pressed={markMode}
          className={`inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-semibold ${
            markMode ? 'border-sky-500 bg-sky-100 text-sky-700' : 'border-slate-300 bg-white'
          }`}
        >
          {markMode ? <X size={16} /> : <Brush size={16} />}
          {markMode ? 'X 표시' : '칠하기'}
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          다시하기
        </button>
        <button
          type="button"
          onClick={onChangeSize}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          크기 변경
        </button>
      </div>
    </div>
  )
}
