import { describe, expect, it } from 'vitest'
import {
  SCORE,
  autoToFoundation,
  canPlaceOnFoundation,
  canStackOnTableau,
  createDeck,
  draw,
  getSourceCards,
  isWon,
  move,
  newGame,
  timeBonus,
  type Card,
  type GameState,
  type Suit,
} from './logic'

const card = (suit: Suit, rank: number, faceUp = true): Card => ({
  id: -1,
  suit,
  rank,
  faceUp,
})

const empty = (): GameState => ({
  stock: [],
  waste: [],
  foundations: [[], [], [], []],
  tableau: [[], [], [], [], [], [], []],
  score: 0,
})

describe('newGame', () => {
  it('덱은 52장이고 모두 다르다', () => {
    const ids = new Set(createDeck().map((c) => c.id))
    expect(ids.size).toBe(52)
  })

  it('탭 7줄에 1~7장, 나머지 24장은 더미에 놓인다', () => {
    const g = newGame()
    expect(g.tableau.map((p) => p.length)).toEqual([1, 2, 3, 4, 5, 6, 7])
    expect(g.stock).toHaveLength(24)
    expect(g.waste).toHaveLength(0)
  })

  it('각 줄은 맨 위 한 장만 앞면이다', () => {
    const g = newGame()
    g.tableau.forEach((pile) => {
      pile.forEach((c, i) => expect(c.faceUp).toBe(i === pile.length - 1))
    })
    expect(g.stock.every((c) => !c.faceUp)).toBe(true)
  })

  it('모든 카드가 정확히 한 번씩 배치된다', () => {
    const g = newGame()
    const all = [...g.stock, ...g.tableau.flat()]
    expect(new Set(all.map((c) => c.id)).size).toBe(52)
  })
})

describe('규칙 판정', () => {
  it('탭에는 색이 다르고 1 작은 숫자만 쌓을 수 있다', () => {
    expect(canStackOnTableau(card('H', 6), [card('S', 7)])).toBe(true)
    expect(canStackOnTableau(card('S', 6), [card('C', 7)])).toBe(false) // 같은 색
    expect(canStackOnTableau(card('H', 5), [card('S', 7)])).toBe(false) // 숫자 차이
  })

  it('빈 탭에는 K만 놓을 수 있다', () => {
    expect(canStackOnTableau(card('H', 13), [])).toBe(true)
    expect(canStackOnTableau(card('H', 12), [])).toBe(false)
  })

  it('뒤집힌 카드 위에는 쌓을 수 없다', () => {
    expect(canStackOnTableau(card('H', 6), [card('S', 7, false)])).toBe(false)
  })

  it('위 칸은 A부터 같은 무늬로 1씩 쌓는다', () => {
    expect(canPlaceOnFoundation(card('S', 1), [])).toBe(true)
    expect(canPlaceOnFoundation(card('S', 2), [])).toBe(false)
    expect(canPlaceOnFoundation(card('S', 2), [card('S', 1)])).toBe(true)
    expect(canPlaceOnFoundation(card('H', 2), [card('S', 1)])).toBe(false)
  })
})

describe('draw', () => {
  it('더미에서 한 장을 앞면으로 버린 더미에 올린다', () => {
    const state = { ...empty(), stock: [card('S', 1, false), card('H', 2, false)] }
    const next = draw(state)!
    expect(next.waste).toHaveLength(1)
    expect(next.waste[0]).toMatchObject({ suit: 'H', rank: 2, faceUp: true })
    expect(next.stock).toHaveLength(1)
  })

  it('더미가 비면 버린 카드를 다시 더미로 되돌리고 감점한다', () => {
    const state = { ...empty(), waste: [card('S', 1), card('H', 2)], score: 150 }
    const next = draw(state)!
    expect(next.waste).toHaveLength(0)
    expect(next.stock.map((c) => c.rank)).toEqual([2, 1]) // 뒤집어 순서가 바뀜
    expect(next.stock.every((c) => !c.faceUp)).toBe(true)
    expect(next.score).toBe(150 + SCORE.recycle)
  })

  it('점수는 0 밑으로 내려가지 않는다', () => {
    const state = { ...empty(), waste: [card('S', 1)], score: 30 }
    expect(draw(state)!.score).toBe(0)
  })

  it('더미와 버린 더미가 모두 비면 null', () => {
    expect(draw(empty())).toBeNull()
  })
})

describe('move', () => {
  it('버린 더미 → 탭 +5', () => {
    const state = {
      ...empty(),
      waste: [card('H', 6)],
      tableau: [[card('S', 7)], [], [], [], [], [], []],
    }
    const next = move(state, { zone: 'waste' }, { zone: 'tableau', col: 0 })!
    expect(next.tableau[0]).toHaveLength(2)
    expect(next.waste).toHaveLength(0)
    expect(next.score).toBe(SCORE.wasteToTableau)
  })

  it('탭 → 위 칸 +10, 아래 카드가 드러나면 뒤집고 +5', () => {
    const state = {
      ...empty(),
      tableau: [[card('D', 9, false), card('S', 1)], [], [], [], [], [], []],
    }
    const next = move(
      state,
      { zone: 'tableau', col: 0, index: 1 },
      { zone: 'foundation', pile: 0 },
    )!
    expect(next.foundations[0]).toHaveLength(1)
    expect(next.tableau[0][0].faceUp).toBe(true)
    expect(next.score).toBe(SCORE.toFoundation + SCORE.flip)
  })

  it('여러 장을 한 번에 옮길 수 있다', () => {
    const state = {
      ...empty(),
      tableau: [[card('S', 8), card('H', 7), card('S', 6)], [card('D', 9)], [], [], [], [], []],
    }
    const next = move(state, { zone: 'tableau', col: 0, index: 0 }, { zone: 'tableau', col: 1 })!
    expect(next.tableau[0]).toHaveLength(0)
    expect(next.tableau[1].map((c) => c.rank)).toEqual([9, 8, 7, 6])
  })

  it('위 칸에는 여러 장을 한 번에 올릴 수 없다', () => {
    const state = {
      ...empty(),
      tableau: [[card('S', 2), card('H', 1)], [], [], [], [], [], []],
    }
    expect(
      move(state, { zone: 'tableau', col: 0, index: 0 }, { zone: 'foundation', pile: 0 }),
    ).toBeNull()
  })

  it('위 칸 → 탭은 -15', () => {
    const state = {
      ...empty(),
      score: 40,
      foundations: [[card('S', 1), card('S', 2)], [], [], []],
      tableau: [[card('H', 3)], [], [], [], [], [], []],
    }
    const next = move(state, { zone: 'foundation', pile: 0 }, { zone: 'tableau', col: 0 })!
    expect(next.tableau[0]).toHaveLength(2)
    expect(next.score).toBe(40 + SCORE.foundationToTableau)
  })

  it('규칙에 안 맞는 이동은 null이고 같은 줄로의 이동도 불가', () => {
    const state = {
      ...empty(),
      tableau: [[card('S', 7)], [card('S', 6)], [], [], [], [], []],
    }
    expect(
      move(state, { zone: 'tableau', col: 1, index: 0 }, { zone: 'tableau', col: 0 }),
    ).toBeNull()
    expect(
      move(state, { zone: 'tableau', col: 0, index: 0 }, { zone: 'tableau', col: 0 }),
    ).toBeNull()
  })

  it('뒤집힌 카드는 옮길 수 없다', () => {
    const state = { ...empty(), tableau: [[card('S', 7, false)], [], [], [], [], [], []] }
    expect(getSourceCards(state, { zone: 'tableau', col: 0, index: 0 })).toBeNull()
  })

  it('원본 상태는 바뀌지 않는다', () => {
    const state = {
      ...empty(),
      waste: [card('H', 6)],
      tableau: [[card('S', 7)], [], [], [], [], [], []],
    }
    move(state, { zone: 'waste' }, { zone: 'tableau', col: 0 })
    expect(state.waste).toHaveLength(1)
    expect(state.tableau[0]).toHaveLength(1)
  })
})

describe('autoToFoundation', () => {
  it('A는 빈 위 칸으로 간다', () => {
    const state = { ...empty(), waste: [card('C', 1)] }
    const next = autoToFoundation(state, { zone: 'waste' })!
    expect(next.foundations[0]).toHaveLength(1)
  })

  it('같은 무늬의 다음 숫자는 그 무늬가 쌓인 칸으로 간다', () => {
    const state = {
      ...empty(),
      foundations: [[card('S', 1)], [card('H', 1)], [], []],
      waste: [card('H', 2)],
    }
    const next = autoToFoundation(state, { zone: 'waste' })!
    expect(next.foundations[1]).toHaveLength(2)
  })

  it('갈 수 없으면 null', () => {
    const state = { ...empty(), waste: [card('H', 5)] }
    expect(autoToFoundation(state, { zone: 'waste' })).toBeNull()
  })
})

describe('클리어와 보너스', () => {
  it('위 칸 4개가 13장씩이면 클리어', () => {
    const full = (suit: Suit) => Array.from({ length: 13 }, (_, i) => card(suit, i + 1))
    const state = { ...empty(), foundations: [full('S'), full('H'), full('D'), full('C')] }
    expect(isWon(state)).toBe(true)
    expect(isWon(empty())).toBe(false)
  })

  it('시간 보너스는 30초 이상일 때만 700000/초', () => {
    expect(timeBonus(10)).toBe(0)
    expect(timeBonus(100)).toBe(7000)
    expect(timeBonus(300)).toBe(2333)
  })
})
