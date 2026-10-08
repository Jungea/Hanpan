import { describe, expect, it } from 'vitest'
import {
  changeDirection,
  createInitialState,
  getTickMs,
  placeFood,
  step,
  type SnakeState,
} from './logic'

const rng = () => 0

const make = (over: Partial<SnakeState>): SnakeState => ({
  ...createInitialState(20, rng),
  ...over,
})

describe('step', () => {
  it('방향대로 한 칸 이동하고 길이는 유지된다', () => {
    const s = createInitialState(20, rng)
    const next = step(s, rng)
    expect(next.snake[0]).toEqual({ x: s.snake[0].x + 1, y: s.snake[0].y })
    expect(next.snake).toHaveLength(3)
    expect(next.gameOver).toBe(false)
  })

  it('벽에 부딪히면 종료된다', () => {
    const s = make({ snake: [{ x: 19, y: 5 }, { x: 18, y: 5 }], food: { x: 0, y: 0 } })
    expect(step(s, rng).gameOver).toBe(true)
  })

  it('자기 몸에 부딪히면 종료된다', () => {
    const s = make({
      snake: [
        { x: 5, y: 5 },
        { x: 5, y: 6 },
        { x: 6, y: 6 },
        { x: 6, y: 5 },
        { x: 6, y: 4 },
      ],
      direction: 'up',
      nextDirection: 'right',
      food: { x: 0, y: 0 },
    })
    expect(step(s, rng).gameOver).toBe(true)
  })

  it('꼬리가 있던 칸으로는 이동할 수 있다', () => {
    const s = make({
      snake: [
        { x: 5, y: 5 },
        { x: 6, y: 5 },
        { x: 6, y: 6 },
        { x: 5, y: 6 },
      ],
      direction: 'left',
      nextDirection: 'down',
      food: { x: 0, y: 0 },
    })
    expect(step(s, rng).gameOver).toBe(false)
  })

  it('먹이를 먹으면 +10점, 길이 증가, 새 먹이가 생긴다', () => {
    const s = make({
      snake: [{ x: 5, y: 5 }, { x: 4, y: 5 }, { x: 3, y: 5 }],
      food: { x: 6, y: 5 },
    })
    const next = step(s, rng)
    expect(next.score).toBe(10)
    expect(next.snake).toHaveLength(4)
    expect(next.food).not.toEqual({ x: 6, y: 5 })
    expect(next.food).not.toBeNull()
  })

  it('종료된 상태에서는 움직이지 않는다', () => {
    const s = make({ gameOver: true })
    expect(step(s, rng)).toBe(s)
  })
})

describe('changeDirection', () => {
  it('반대 방향 전환은 무시한다', () => {
    const s = createInitialState(20, rng)
    expect(changeDirection(s, 'left').nextDirection).toBe('right')
  })

  it('수직 방향 전환은 다음 이동에 반영된다', () => {
    const s = createInitialState(20, rng)
    const next = step(changeDirection(s, 'up'), rng)
    expect(next.snake[0].y).toBe(s.snake[0].y - 1)
  })

  it('한 틱 안에서 연속 입력해도 반대 방향으로 꺾이지 않는다', () => {
    let s = createInitialState(20, rng)
    s = changeDirection(s, 'up')
    s = changeDirection(s, 'left') // 아직 right로 이동 중이므로 left는 무시
    expect(s.nextDirection).toBe('up')
  })
})

describe('placeFood', () => {
  it('뱀과 겹치지 않는 칸에 배치한다', () => {
    const snake = [{ x: 0, y: 0 }, { x: 1, y: 0 }]
    for (let i = 0; i < 20; i++) {
      const f = placeFood(snake, 3, Math.random)!
      expect(snake.some((p) => p.x === f.x && p.y === f.y)).toBe(false)
    }
  })

  it('빈 칸이 없으면 null', () => {
    const snake = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: 1, y: 1 },
    ]
    expect(placeFood(snake, 2, rng)).toBeNull()
  })
})

describe('getTickMs', () => {
  it('점수가 오를수록 빨라지고 최소값 아래로 내려가지 않는다', () => {
    expect(getTickMs(0)).toBe(150)
    expect(getTickMs(100)).toBeLessThan(getTickMs(0))
    expect(getTickMs(100000)).toBe(70)
  })
})
