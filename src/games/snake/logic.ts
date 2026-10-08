export type Point = { x: number; y: number }
export type Direction = 'up' | 'down' | 'left' | 'right'

export type SnakeState = {
  size: number
  snake: Point[] // 머리가 0번
  direction: Direction // 마지막으로 이동한 방향
  nextDirection: Direction // 다음 이동에 쓸 방향
  food: Point | null
  score: number
  gameOver: boolean
}

export const FOOD_SCORE = 10
const BASE_TICK_MS = 150
const MIN_TICK_MS = 70
const TICK_STEP_MS = 5

const DELTA: Record<Direction, Point> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}

const OPPOSITE: Record<Direction, Direction> = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
}

const samePoint = (a: Point, b: Point) => a.x === b.x && a.y === b.y

export function placeFood(snake: Point[], size: number, rng: () => number): Point | null {
  const empty: Point[] = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (!snake.some((p) => p.x === x && p.y === y)) empty.push({ x, y })
    }
  }
  if (empty.length === 0) return null
  return empty[Math.floor(rng() * empty.length)]
}

export function createInitialState(size = 20, rng: () => number = Math.random): SnakeState {
  const cy = Math.floor(size / 2)
  const cx = Math.floor(size / 2)
  const snake = [
    { x: cx, y: cy },
    { x: cx - 1, y: cy },
    { x: cx - 2, y: cy },
  ]
  return {
    size,
    snake,
    direction: 'right',
    nextDirection: 'right',
    food: placeFood(snake, size, rng),
    score: 0,
    gameOver: false,
  }
}

// 반대 방향 즉시 전환은 무시한다 (이동 방향 기준)
export function changeDirection(state: SnakeState, dir: Direction): SnakeState {
  if (dir === OPPOSITE[state.direction]) return state
  return { ...state, nextDirection: dir }
}

export function step(state: SnakeState, rng: () => number = Math.random): SnakeState {
  if (state.gameOver) return state

  const dir = state.nextDirection
  const head = state.snake[0]
  const newHead = { x: head.x + DELTA[dir].x, y: head.y + DELTA[dir].y }

  if (newHead.x < 0 || newHead.y < 0 || newHead.x >= state.size || newHead.y >= state.size) {
    return { ...state, direction: dir, gameOver: true }
  }

  const eating = state.food !== null && samePoint(newHead, state.food)
  // 먹지 않으면 꼬리가 비켜나므로 꼬리 칸은 충돌로 보지 않는다
  const body = eating ? state.snake : state.snake.slice(0, -1)
  if (body.some((p) => samePoint(p, newHead))) {
    return { ...state, direction: dir, gameOver: true }
  }

  const snake = [newHead, ...(eating ? state.snake : state.snake.slice(0, -1))]
  if (!eating) return { ...state, snake, direction: dir }

  const food = placeFood(snake, state.size, rng)
  return {
    ...state,
    snake,
    direction: dir,
    food,
    score: state.score + FOOD_SCORE,
    gameOver: food === null, // 판을 가득 채우면 종료
  }
}

export function getTickMs(score: number): number {
  const eaten = Math.floor(score / FOOD_SCORE)
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - eaten * TICK_STEP_MS)
}
