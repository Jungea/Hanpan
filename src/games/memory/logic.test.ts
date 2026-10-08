import { describe, expect, it } from 'vitest'
import { LEVELS, closeMismatch, flip, matchedPairs, newGame, type MemoryState } from './logic'

// 시드가 있는 난수 (테스트 재현용)
function seeded(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// 카드 배치를 직접 지정한 판
const board = (symbols: number[]): MemoryState => ({
  cards: symbols.map((symbol) => ({ symbol, state: 'hidden' as const })),
  open: [],
  moves: 0,
  won: false,
})

describe('newGame', () => {
  it('난이도별로 카드 수가 맞고 모든 그림이 정확히 두 장씩이다', () => {
    for (const { pairs } of LEVELS) {
      const game = newGame(pairs, seeded(pairs))
      expect(game.cards).toHaveLength(pairs * 2)
      for (let s = 0; s < pairs; s++) {
        expect(game.cards.filter((c) => c.symbol === s)).toHaveLength(2)
      }
      expect(game.cards.every((c) => c.state === 'hidden')).toBe(true)
      expect(game.moves).toBe(0)
    }
  })

  it('시드가 다르면 배치도 달라진다', () => {
    const a = newGame(8, seeded(1)).cards.map((c) => c.symbol)
    const b = newGame(8, seeded(2)).cards.map((c) => c.symbol)
    expect(a).not.toEqual(b)
  })
})

describe('flip', () => {
  it('한 장을 뒤집으면 열리고 이동 횟수는 그대로다', () => {
    const next = flip(board([0, 0, 1, 1]), 0)
    expect(next.cards[0].state).toBe('open')
    expect(next.open).toEqual([0])
    expect(next.moves).toBe(0)
  })

  it('두 장이 같으면 짝이 확정되고 이동 횟수가 1 늘어난다', () => {
    const next = flip(flip(board([0, 0, 1, 1]), 0), 1)
    expect(next.cards[0].state).toBe('matched')
    expect(next.cards[1].state).toBe('matched')
    expect(next.open).toEqual([])
    expect(next.moves).toBe(1)
  })

  it('두 장이 다르면 열린 채로 남고 이동 횟수가 늘어난다', () => {
    const next = flip(flip(board([0, 1, 0, 1]), 0), 1)
    expect(next.open).toEqual([0, 1])
    expect(next.cards[0].state).toBe('open')
    expect(next.moves).toBe(1)
  })

  it('두 장이 열려 있는 동안에는 더 뒤집을 수 없다', () => {
    const mismatch = flip(flip(board([0, 1, 0, 1]), 0), 1)
    expect(flip(mismatch, 2)).toBe(mismatch)
  })

  it('이미 열렸거나 짝이 맞은 카드는 다시 뒤집을 수 없다', () => {
    const one = flip(board([0, 0, 1, 1]), 0)
    expect(flip(one, 0)).toBe(one)
    const matched = flip(one, 1)
    expect(flip(matched, 0)).toBe(matched)
  })

  it('범위를 벗어난 번호는 무시한다', () => {
    const state = board([0, 0])
    expect(flip(state, 5)).toBe(state)
  })

  it('원본 상태는 바뀌지 않는다', () => {
    const state = board([0, 0, 1, 1])
    flip(state, 0)
    expect(state.cards[0].state).toBe('hidden')
    expect(state.open).toEqual([])
  })
})

describe('closeMismatch', () => {
  it('열려 있던 두 장을 다시 덮는다', () => {
    const mismatch = flip(flip(board([0, 1, 0, 1]), 0), 1)
    const closed = closeMismatch(mismatch)
    expect(closed.cards.every((c) => c.state === 'hidden')).toBe(true)
    expect(closed.open).toEqual([])
    expect(closed.moves).toBe(1)
  })

  it('열린 카드가 두 장 미만이면 그대로', () => {
    const one = flip(board([0, 0]), 0)
    expect(closeMismatch(one)).toBe(one)
  })

  it('덮은 뒤 다음 카드를 뒤집을 수 있다', () => {
    const closed = closeMismatch(flip(flip(board([0, 1, 0, 1]), 0), 1))
    expect(flip(closed, 2).cards[2].state).toBe('open')
  })
})

describe('클리어', () => {
  it('모든 짝을 찾으면 클리어이고 이동 횟수가 점수다', () => {
    let state = board([0, 1, 0, 1])
    state = flip(flip(state, 0), 2) // 0과 0
    expect(state.won).toBe(false)
    expect(matchedPairs(state)).toBe(1)
    state = flip(flip(state, 1), 3) // 1과 1
    expect(state.won).toBe(true)
    expect(state.moves).toBe(2)
  })

  it('끝난 판에서는 더 뒤집을 수 없다', () => {
    let state = board([0, 0])
    state = flip(flip(state, 0), 1)
    expect(flip(state, 0)).toBe(state)
  })
})
