import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Pause, Play } from 'lucide-react'
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

type Status = 'playing' | 'paused' | 'over'

const SIZE = 20
const CELL = 22
const CANVAS_PX = SIZE * CELL
const SWIPE_MIN_PX = 24

const DPAD: { dir: Direction; label: string; Icon: typeof ArrowUp; cell: string }[] = [
  { dir: 'up', label: '위', Icon: ArrowUp, cell: 'col-start-2 row-start-1' },
  { dir: 'left', label: '왼쪽', Icon: ArrowLeft, cell: 'col-start-1 row-start-2' },
  { dir: 'right', label: '오른쪽', Icon: ArrowRight, cell: 'col-start-3 row-start-2' },
  { dir: 'down', label: '아래', Icon: ArrowDown, cell: 'col-start-2 row-start-2' },
]

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
  const statusRef = useRef<Status>('playing')
  const onGameOverRef = useRef(onGameOver)
  const pointerStart = useRef<{ x: number; y: number } | null>(null)
  const [score, setScore] = useState(0)
  const [status, setStatusState] = useState<Status>('playing')

  useEffect(() => {
    onGameOverRef.current = onGameOver
  }, [onGameOver])

  const setStatus = (value: Status) => {
    statusRef.current = value
    setStatusState(value)
  }

  const togglePlay = () => {
    const current = statusRef.current
    if (current === 'paused') setStatus('playing')
    else if (current === 'playing') setStatus('paused')
  }

  const turn = (dir: Direction) => {
    if (statusRef.current === 'playing') {
      stateRef.current = changeDirection(stateRef.current, dir)
    }
  }

  useEffect(() => {
    const ctx = canvasRef.current!.getContext('2d')!
    stateRef.current = createInitialState(SIZE)
    statusRef.current = 'playing'
    draw(ctx, stateRef.current)

    let timer: ReturnType<typeof setTimeout>
    const tick = () => {
      if (statusRef.current === 'playing') {
        stateRef.current = step(stateRef.current)
        setScore(stateRef.current.score)
        draw(ctx, stateRef.current)
        if (stateRef.current.gameOver) {
          setStatus('over')
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
        togglePlay()
        return
      }
      const dir = KEY_TO_DIR[e.key.length === 1 ? e.key.toLowerCase() : e.key]
      if (!dir) return
      e.preventDefault()
      turn(dir)
    }
    const onVisibility = () => {
      if (document.hidden && statusRef.current === 'playing') setStatus('paused')
    }

    window.addEventListener('keydown', onKeyDown)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      clearTimeout(timer)
      window.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  // 터치/마우스를 같이 처리: 거의 안 움직이면 탭(일시정지/계속), 움직이면 스와이프(방향 전환)
  const onPointerDown = (e: React.PointerEvent) => {
    pointerStart.current = { x: e.clientX, y: e.clientY }
  }

  const onPointerUp = (e: React.PointerEvent) => {
    const start = pointerStart.current
    pointerStart.current = null
    if (!start) return
    const dx = e.clientX - start.x
    const dy = e.clientY - start.y
    if (Math.max(Math.abs(dx), Math.abs(dy)) < SWIPE_MIN_PX) {
      togglePlay()
      return
    }
    turn(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up')
  }

  return (
    <div className="mx-auto flex w-full max-w-110 flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between">
        <p className="text-lg font-semibold tabular-nums">점수 {score}</p>
        <button
          type="button"
          onClick={togglePlay}
          disabled={status === 'over'}
          aria-label={status === 'playing' ? '일시정지' : '계속하기'}
          className="rounded-lg border border-slate-300 p-2 text-slate-700 hover:bg-slate-100 disabled:opacity-40"
        >
          {status === 'playing' ? <Pause size={20} /> : <Play size={20} />}
        </button>
      </div>
      <div className="relative w-full">
        <canvas
          ref={canvasRef}
          width={CANVAS_PX}
          height={CANVAS_PX}
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          className="aspect-square w-full touch-none rounded-lg"
        />
        {status === 'paused' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 rounded-lg bg-black/50 text-white">
            <p className="text-xl font-bold">일시정지</p>
            <p className="text-sm">탭해서 계속</p>
          </div>
        )}
      </div>
      {/* 터치 기기에서만 보이는 방향 버튼 */}
      <div className="hidden select-none grid-cols-3 grid-rows-2 gap-1 pointer-coarse:grid">
        {DPAD.map(({ dir, label, Icon, cell }) => (
          <button
            key={dir}
            type="button"
            aria-label={label}
            onPointerDown={(e) => {
              e.preventDefault()
              turn(dir)
            }}
            className={`${cell} flex h-14 w-14 touch-manipulation items-center justify-center rounded-xl border border-slate-300 bg-white text-slate-700 active:bg-slate-200`}
          >
            <Icon size={26} />
          </button>
        ))}
      </div>
    </div>
  )
}
