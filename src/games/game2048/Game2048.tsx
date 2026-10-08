import { RotateCcw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import { SIZE, TARGET, move, newGame, type Direction, type GameState, type Tile } from './logic'

const SWIPE_MIN_PX = 24
const GAP = '0.5rem'
const CELL = `calc((100% - ${SIZE - 1} * ${GAP}) / ${SIZE})`

const KEY_TO_DIR: Record<string, Direction> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
  w: 'up',
  s: 'down',
  a: 'left',
  d: 'right',
}

const TILE_COLOR: Record<number, string> = {
  2: 'bg-stone-200 text-stone-700',
  4: 'bg-stone-300 text-stone-700',
  8: 'bg-orange-300 text-white',
  16: 'bg-orange-400 text-white',
  32: 'bg-orange-500 text-white',
  64: 'bg-red-500 text-white',
  128: 'bg-yellow-400 text-white',
  256: 'bg-yellow-500 text-white',
  512: 'bg-amber-500 text-white',
  1024: 'bg-emerald-500 text-white',
  2048: 'bg-sky-500 text-white',
}

// 숫자 자릿수가 늘면 글자를 줄인다 (타일 폭 대비 비율)
const fontSize = (value: number) => {
  const digits = String(value).length
  return digits <= 2 ? '44cqw' : digits === 3 ? '36cqw' : digits === 4 ? '29cqw' : '23cqw'
}

function TileView({ tile }: { tile: Tile }) {
  const animation = tile.isNew ? 'tile-appear' : tile.merged ? 'tile-pop' : ''
  return (
    <div
      className={`absolute transition-[left,top] duration-100 ease-out [container-type:inline-size] ${
        tile.consumed ? 'z-0' : 'z-10'
      }`}
      style={{
        width: CELL,
        height: CELL,
        left: `calc(${tile.col} * (${CELL} + ${GAP}))`,
        top: `calc(${tile.row} * (${CELL} + ${GAP}))`,
        opacity: tile.consumed ? 0 : 1,
        transitionProperty: tile.consumed ? 'left, top, opacity' : undefined,
        transitionDelay: tile.consumed ? '0ms, 0ms, 100ms' : undefined,
      }}
    >
      <div
        className={`flex h-full w-full items-center justify-center rounded-lg font-bold ${animation} ${
          TILE_COLOR[tile.value] ?? 'bg-slate-800 text-white'
        }`}
        style={{ fontSize: fontSize(tile.value) }}
      >
        {tile.value}
      </div>
    </div>
  )
}

export default function Game2048({ onGameOver }: GameProps) {
  const [state, setState] = useState<GameState>(() => newGame())
  const stateRef = useRef(state)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const onGameOverRef = useRef(onGameOver)

  useEffect(() => {
    onGameOverRef.current = onGameOver
  }, [onGameOver])

  const apply = (dir: Direction) => {
    const next = move(stateRef.current, dir)
    if (next === stateRef.current) return
    stateRef.current = next
    setState(next)
    if (next.over) onGameOverRef.current({ score: next.score })
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const dir = KEY_TO_DIR[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!dir) return
      e.preventDefault()
      apply(dir)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  const restart = () => {
    const fresh = newGame()
    stateRef.current = fresh
    setState(fresh)
  }

  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current
    pointerStart.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return
    apply(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }

  return (
    <div className="mx-auto flex w-full max-w-110 flex-col gap-3">
      <div className="flex items-center justify-between text-lg font-semibold tabular-nums">
        <span>점수 {state.score}</span>
        <button
          type="button"
          onClick={restart}
          aria-label="새 게임"
          className="rounded-lg border border-slate-300 bg-white p-2"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      <div
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        className="aspect-square w-full touch-none select-none rounded-xl bg-slate-300 p-2"
      >
        <div className="relative h-full w-full">
          <div
            className="absolute inset-0 grid gap-2"
            style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)` }}
          >
            {Array.from({ length: SIZE * SIZE }, (_, i) => (
              <div key={i} className="rounded-lg bg-slate-200/70" />
            ))}
          </div>
          {state.tiles.map((tile) => (
            <TileView key={tile.id} tile={tile} />
          ))}
        </div>
      </div>

      <p className="min-h-5 text-center text-sm text-emerald-700" role="status">
        {state.reached ? `${TARGET} 달성! 이어서 계속할 수 있어요` : ''}
      </p>
    </div>
  )
}
