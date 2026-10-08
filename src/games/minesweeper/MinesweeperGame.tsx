import { Bomb, Clock, Flag, Pickaxe, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import {
  DIFFICULTIES,
  chord,
  createBoard,
  flagCount,
  openCell,
  toggleFlag,
  type Board,
  type Difficulty,
} from './logic'

const LONG_PRESS_MS = 450

const NUMBER_COLOR: Record<number, string> = {
  1: 'text-blue-600',
  2: 'text-green-600',
  3: 'text-red-600',
  4: 'text-indigo-800',
  5: 'text-amber-800',
  6: 'text-teal-600',
  7: 'text-slate-900',
  8: 'text-slate-500',
}

const cellSize = (cols: number) => (cols >= 30 ? 28 : cols >= 16 ? 30 : 36)

const now = () => Date.now()

const formatTime = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

export default function MinesweeperGame({ onGameOver }: GameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [round, setRound] = useState(0)

  if (!difficulty) {
    return (
      <div className="mx-auto flex w-full max-w-110 flex-col gap-3">
        <p className="text-center font-medium">난이도를 선택하세요</p>
        {DIFFICULTIES.map((d) => (
          <button
            key={d.name}
            type="button"
            onClick={() => setDifficulty(d)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-left hover:bg-slate-100"
          >
            <span className="text-lg font-bold">{d.name}</span>
            <span className="ml-3 text-sm text-slate-500">
              {d.cols}x{d.rows} · 지뢰 {d.mines}개
            </span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <Minefield
      key={`${difficulty.name}-${round}`}
      difficulty={difficulty}
      onGameOver={onGameOver}
      onRetry={() => setRound((r) => r + 1)}
      onChangeDifficulty={() => setDifficulty(null)}
    />
  )
}

type FieldProps = {
  difficulty: Difficulty
  onGameOver: GameProps['onGameOver']
  onRetry: () => void
  onChangeDifficulty: () => void
}

function Minefield({ difficulty, onGameOver, onRetry, onChangeDifficulty }: FieldProps) {
  const { rows, cols, mines, name } = difficulty
  const [board, setBoard] = useState<Board>(() => createBoard(rows, cols, mines))
  const [flagMode, setFlagMode] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef<number | null>(null)
  const longPress = useRef<{ timer: number | null; fired: boolean }>({ timer: null, fired: false })

  // 타이머: 첫 클릭부터 진행 중일 때만 갱신
  useEffect(() => {
    if (board.status !== 'playing') return
    const id = window.setInterval(() => {
      if (startedAt.current !== null) {
        setElapsed(Math.floor((now() - startedAt.current) / 1000))
      }
    }, 250)
    return () => window.clearInterval(id)
  }, [board.status])

  const apply = (next: Board) => {
    if (next === board) return
    if (startedAt.current === null && next.status !== 'ready') startedAt.current = now()
    setBoard(next)
    if (next.status === 'won' || next.status === 'lost') {
      const sec = Math.max(1, Math.floor((now() - startedAt.current!) / 1000))
      setElapsed(sec)
      if (next.status === 'won') onGameOver({ score: sec, variant: name })
    }
  }

  const open = (i: number) => apply(openCell(board, i))
  const flag = (i: number) => apply(toggleFlag(board, i))
  const doChord = (i: number) => apply(chord(board, i))

  const clearLongPress = () => {
    if (longPress.current.timer !== null) window.clearTimeout(longPress.current.timer)
    longPress.current.timer = null
  }

  const onPointerDown = (e: React.PointerEvent, i: number) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 2) flag(i)
      return
    }
    longPress.current.fired = false
    clearLongPress()
    longPress.current.timer = window.setTimeout(() => {
      longPress.current.fired = true
      flag(i)
    }, LONG_PRESS_MS)
  }

  const onPointerUp = (e: React.PointerEvent, i: number) => {
    if (e.pointerType === 'mouse') {
      if (e.button === 0) open(i)
      return
    }
    clearLongPress()
    if (longPress.current.fired) return
    if (flagMode) return flag(i)
    const cell = board.cells[i]
    // 터치에서는 숫자 칸을 탭하면 주변 열기(chord)
    if (cell.state === 'open' && cell.adjacent > 0) return doChord(i)
    open(i)
  }

  const size = cellSize(cols)
  const lost = board.status === 'lost'

  return (
    <div className="mx-auto flex w-full flex-col items-center gap-3">
      <div className="flex w-full max-w-110 items-center justify-between text-lg font-semibold tabular-nums">
        <span className="inline-flex items-center gap-1">
          <Flag size={18} className="fill-current text-red-500" />
          {mines - flagCount(board)}
        </span>
        <span className="inline-flex items-center gap-1">
          <Clock size={18} />
          {formatTime(elapsed)}
        </span>
        <button
          type="button"
          onClick={() => setFlagMode((v) => !v)}
          aria-label={flagMode ? '깃발 모드 (누르면 열기 모드)' : '열기 모드 (누르면 깃발 모드)'}
          className="hidden items-center gap-1 rounded-lg border border-slate-300 bg-white px-3 py-1 text-sm pointer-coarse:inline-flex"
        >
          {flagMode ? (
            <Flag size={18} className="fill-current text-red-500" />
          ) : (
            <Pickaxe size={18} />
          )}
          {flagMode ? '깃발' : '열기'}
        </button>
      </div>

      <div className="max-w-full overflow-x-auto">
        <div
          className="mx-auto grid w-max select-none gap-px bg-slate-400 p-px"
          style={{ gridTemplateColumns: `repeat(${cols}, ${size}px)` }}
          onContextMenu={(e) => e.preventDefault()}
        >
          {board.cells.map((cell, i) => {
            const isOpen = cell.state === 'open'
            const showMine = lost && cell.mine && cell.state !== 'flag'
            const wrongFlag = lost && cell.state === 'flag' && !cell.mine
            const exploded = board.exploded === i
            return (
              <button
                key={i}
                type="button"
                tabIndex={-1}
                aria-label={`${Math.floor(i / cols) + 1}행 ${(i % cols) + 1}열`}
                onPointerDown={(e) => onPointerDown(e, i)}
                onPointerUp={(e) => onPointerUp(e, i)}
                onPointerCancel={clearLongPress}
                onPointerLeave={clearLongPress}
                onDoubleClick={() => doChord(i)}
                style={{ width: size, height: size }}
                className={`flex touch-manipulation items-center justify-center text-base font-bold ${
                  exploded
                    ? 'bg-red-500'
                    : isOpen || showMine
                      ? 'bg-slate-100'
                      : 'bg-slate-300 hover:bg-slate-200'
                } ${isOpen ? (NUMBER_COLOR[cell.adjacent] ?? '') : ''}`}
              >
                {isOpen && !cell.mine && cell.adjacent > 0 && cell.adjacent}
                {(showMine || (isOpen && cell.mine)) && (
                  <Bomb size={size * 0.6} className="fill-current text-slate-900" />
                )}
                {cell.state === 'flag' && !wrongFlag && (
                  <Flag size={size * 0.55} className="fill-current text-red-500" />
                )}
                {wrongFlag && <X size={size * 0.6} className="text-red-600" />}
              </button>
            )
          })}
        </div>
      </div>

      {lost && <p className="font-semibold text-red-600">지뢰를 밟았어요</p>}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          다시하기
        </button>
        <button
          type="button"
          onClick={onChangeDifficulty}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          난이도 변경
        </button>
      </div>
    </div>
  )
}
