import { Pause, Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import {
  changeDirection,
  createInitialState,
  getTickMs,
  step,
  type Direction,
  type SnakeState,
} from './logic'

const SIZE = 20
const CELL = 22
const CANVAS_PX = SIZE * CELL
const SWIPE_MIN_PX = 24

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

function draw(ctx: CanvasRenderingContext2D, state: SnakeState) {
  ctx.fillStyle = '#0f172a'
  ctx.fillRect(0, 0, CANVAS_PX, CANVAS_PX)

  if (state.food) {
    ctx.fillStyle = '#f43f5e'
    ctx.beginPath()
    ctx.arc(
      state.food.x * CELL + CELL / 2,
      state.food.y * CELL + CELL / 2,
      CELL / 2 - 3,
      0,
      Math.PI * 2,
    )
    ctx.fill()
  }

  state.snake.forEach((p, i) => {
    ctx.fillStyle = i === 0 ? '#4ade80' : '#22c55e'
    ctx.fillRect(p.x * CELL + 1, p.y * CELL + 1, CELL - 2, CELL - 2)
  })
}

export default function SnakeGame({ onGameOver }: GameProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<SnakeState>(createInitialState(SIZE))
  const pausedRef = useRef(false)
  const onGameOverRef = useRef(onGameOver)
  const touchStart = useRef<{ x: number; y: number } | null>(null)
  const [score, setScore] = useState(0)
  const [paused, setPaused] = useState(false)

  useEffect(() => {
    onGameOverRef.current = onGameOver
  }, [onGameOver])

  const setPause = (value: boolean) => {
    pausedRef.current = value
    setPaused(value)
  }

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    stateRef.current = createInitialState(SIZE)
    pausedRef.current = false
    draw(ctx, stateRef.current)

    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (!pausedRef.current) {
        stateRef.current = step(stateRef.current)
        setScore(stateRef.current.score)
        draw(ctx, stateRef.current)
        if (stateRef.current.gameOver) {
          onGameOverRef.current({ score: stateRef.current.score })
          return
        }
      }
      timer = setTimeout(tick, getTickMs(stateRef.current.score))
    }
    timer = setTimeout(tick, getTickMs(0))

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault()
        setPause(!pausedRef.current)
        return
      }
      const dir = KEY_TO_DIR[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!dir) return
      e.preventDefault()
      if (!pausedRef.current) {
        stateRef.current = changeDirection(stateRef.current, dir)
      }
    }
    const onVisibility = () => {
      if (document.hidden) setPause(true)
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const onTouchStart = (e: React.TouchEvent) => {
    const t = e.touches[0]
    touchStart.current = { x: t.clientX, y: t.clientY }
  }

  const onTouchEnd = (e: React.TouchEvent) => {
    const start = touchStart.current
    touchStart.current = null
    if (!start || pausedRef.current) return
    const t = e.changedTouches[0]
    const dx = t.clientX - start.x
    const dy = t.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) return
    const dir: Direction =
      Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up'
    stateRef.current = changeDirection(stateRef.current, dir)
  }

  return (
    <div className="mx-auto flex w-full max-w-110 flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between">
        <p className="text-lg font-semibold tabular-nums">점수 {score}</p>
        <button
          type="button"
          onClick={() => setPause(!paused)}
          aria-label={paused ? '계속하기' : '일시정지'}
          className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100"
        >
          {paused ? <Play size={20} /> : <Pause size={20} />}
        </button>
      </div>
      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_PX}
          height={CANVAS_PX}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          className="aspect-square w-full touch-none rounded-lg"
        />
        {paused && (
          <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50 text-xl font-bold text-white">
            일시정지
          </div>
        )}
      </div>
    </div>
  )
}
