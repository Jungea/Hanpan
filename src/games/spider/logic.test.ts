import { describe, expect, it } from 'vitest'
import type { Card, Suit } from '../solitaire/logic'
import {
  START_SCORE,
  SPIDER_SCORE,
  autoMove,
  canDeal,
  canDrop,
  createSpiderDeck,
  dealRow,
  getRun,
  isRun,
  isWon,
  move,
  newSpiderGame,
  runStart,
  type SpiderState,
  type SuitCount,
} from './logic'

const card = (suit: Suit, rank: number, faceUp = true): Card => ({ id: -1, suit, rank, faceUp })

const empty = (): SpiderState => ({
  tableau: Array.from({ length: 10 }, () => []),
  stock: [],
  completed: [],
  score: START_SCORE,
})

const run = (suit: Suit, from: number, to: number) => {
  const cards: Card[] = []
  for (let r = from; r >= to; r--) cards.push(card(suit, r))
  return cards
}

describe('newSpiderGame', () => {
  it('덱은 104장이고 모두 다르다', () => {
    for (const n of [1, 2, 4] as SuitCount[]) {
      const deck = createSpiderDeck(n)
      expect(deck).toHaveLength(104)
      expect(new Set(deck.map((c) => c.id)).size).toBe(104)
    }
  })

  it('난이도에 따라 무늬 수가 다르다', () => {
    const suitsOf = (n: SuitCount) => new Set(createSpiderDeck(n).map((c) => c.suit))
    expect(suitsOf(1)).toEqual(new Set(['S']))
    expect(suitsOf(2)).toEqual(new Set(['S', 'H']))
    expect(suitsOf(4)).toEqual(new Set(['S', 'H', 'D', 'C']))
  })

  it('앞 4줄은 6장, 나머지 6줄은 5장, 더미는 50장이다', () => {
    const g = newSpiderGame(4)
    expect(g.tableau.map((p) => p.length)).toEqual([6, 6, 6, 6, 5, 5, 5, 5, 5, 5])
    expect(g.stock).toHaveLength(50)
    expect(g.score).toBe(START_SCORE)
  })

  it('각 줄은 맨 위 한 장만 앞면이다', () => {
    const g = newSpiderGame(2)
    g.tableau.forEach((pile) =>
      pile.forEach((c, i) => expect(c.faceUp).toBe(i === pile.length - 1)),
    )
    expect(g.stock.every((c) => !c.faceUp)).toBe(true)
  })
})

describe('연속 카드와 놓기 규칙', () => {
  it('같은 무늬로 숫자가 이어져야 연속 카드다', () => {
    expect(isRun([card('S', 7), card('S', 6), card('S', 5)])).toBe(true)
    expect(isRun([card('S', 7), card('H', 6)])).toBe(false)
    expect(isRun([card('S', 7), card('S', 5)])).toBe(false)
    expect(isRun([card('S', 7), card('S', 6, false)])).toBe(false)
  })

  it('숫자가 1 큰 카드 위에는 무늬와 상관없이 놓을 수 있다', () => {
    expect(canDrop(card('S', 6), [card('H', 7)])).toBe(true)
    expect(canDrop(card('S', 6), [card('S', 8)])).toBe(false)
  })

  it('빈 줄에는 아무 카드나 놓을 수 있다', () => {
    expect(canDrop(card('S', 3), [])).toBe(true)
  })

  it('끌 수 있는 연속 카드의 시작 위치를 찾는다', () => {
    const pile = [card('S', 9, false), card('H', 8), card('S', 7), card('S', 6)]
    expect(runStart(pile)).toBe(2) // S7, S6만 연속
  })

  it('연속이 아닌 위치에서는 옮길 수 없다', () => {
    const state = {
      ...empty(),
      tableau: [[card('H', 8), card('S', 7), card('S', 6)], ...empty().tableau.slice(1)],
    }
    expect(getRun(state, { col: 0, index: 0 })).toBeNull()
    expect(getRun(state, { col: 0, index: 1 })).toHaveLength(2)
  })
})

describe('move', () => {
  it('연속 카드를 통째로 옮기고 1점을 깎는다', () => {
    const tableau = empty().tableau
    tableau[0] = [card('H', 9), card('S', 7), card('S', 6)]
    tableau[1] = [card('D', 8)]
    const next = move({ ...empty(), tableau }, { col: 0, index: 1 }, 1)!
    expect(next.tableau[1].map((c) => c.rank)).toEqual([8, 7, 6])
    expect(next.tableau[0]).toHaveLength(1)
    expect(next.score).toBe(START_SCORE + SPIDER_SCORE.move)
  })

  it('아래 카드가 드러나면 뒤집는다', () => {
    const tableau = empty().tableau
    tableau[0] = [card('H', 9, false), card('S', 7)]
    tableau[1] = [card('D', 8)]
    const next = move({ ...empty(), tableau }, { col: 0, index: 1 }, 1)!
    expect(next.tableau[0][0].faceUp).toBe(true)
  })

  it('규칙에 안 맞거나 같은 줄이면 null', () => {
    const tableau = empty().tableau
    tableau[0] = [card('S', 7)]
    tableau[1] = [card('D', 9)]
    const state = { ...empty(), tableau }
    expect(move(state, { col: 0, index: 0 }, 1)).toBeNull()
    expect(move(state, { col: 0, index: 0 }, 0)).toBeNull()
  })

  it('K→A 한 벌을 완성하면 치우고 +100점, 아래 카드를 뒤집는다', () => {
    const tableau = empty().tableau
    tableau[0] = [card('H', 5, false), ...run('S', 13, 2)]
    tableau[1] = [card('S', 1)]
    // A를 2 위로 옮겨 K~A 완성: A는 이미 다른 줄에 있고, 2 위에 놓으면 완성
    tableau[0] = [card('H', 5, false), ...run('S', 13, 2)]
    const next = move({ ...empty(), tableau }, { col: 1, index: 0 }, 0)!
    expect(next.completed).toEqual(['S'])
    expect(next.tableau[0]).toHaveLength(1)
    expect(next.tableau[0][0].faceUp).toBe(true)
    expect(next.score).toBe(START_SCORE + SPIDER_SCORE.move + SPIDER_SCORE.run)
  })

  it('원본 상태는 바뀌지 않는다', () => {
    const tableau = empty().tableau
    tableau[0] = [card('S', 7)]
    tableau[1] = [card('D', 8)]
    const state = { ...empty(), tableau }
    move(state, { col: 0, index: 0 }, 1)
    expect(state.tableau[0]).toHaveLength(1)
    expect(state.tableau[1]).toHaveLength(1)
  })
})

describe('dealRow', () => {
  const stock = Array.from({ length: 20 }, (_, i) => card('S', (i % 13) + 1, false))

  it('모든 줄에 앞면으로 한 장씩 나눠 준다', () => {
    const tableau = empty().tableau.map(() => [card('H', 12)])
    const next = dealRow({ ...empty(), tableau, stock })!
    expect(next.tableau.every((p) => p.length === 2 && p[1].faceUp)).toBe(true)
    expect(next.stock).toHaveLength(10)
    expect(next.score).toBe(START_SCORE + SPIDER_SCORE.move)
  })

  it('빈 줄이 있으면 나눠 줄 수 없다', () => {
    const tableau = empty().tableau.map(() => [card('H', 12)])
    tableau[3] = []
    expect(canDeal({ ...empty(), tableau, stock })).toBe(false)
    expect(dealRow({ ...empty(), tableau, stock })).toBeNull()
  })

  it('더미가 비면 나눠 줄 수 없다', () => {
    const tableau = empty().tableau.map(() => [card('H', 12)])
    expect(dealRow({ ...empty(), tableau })).toBeNull()
  })
})

describe('클리어와 자동 이동', () => {
  it('8벌을 모두 완성하면 클리어', () => {
    expect(isWon({ ...empty(), completed: Array(8).fill('S') })).toBe(true)
    expect(isWon(empty())).toBe(false)
  })

  it('자동 이동은 같은 무늬 카드 위를 우선한다', () => {
    const tableau = empty().tableau
    tableau[0] = [card('S', 5)]
    tableau[1] = [card('H', 6)]
    tableau[2] = [card('S', 6)]
    const next = autoMove({ ...empty(), tableau }, { col: 0, index: 0 })!
    expect(next.tableau[2].map((c) => c.rank)).toEqual([6, 5])
  })

  it('갈 곳이 없으면 null, 줄 전체를 빈 줄로 옮기는 건 하지 않는다', () => {
    const tableau = empty().tableau
    tableau[0] = [card('H', 9), card('S', 5)]
    expect(autoMove({ ...empty(), tableau }, { col: 0, index: 1 })).not.toBeNull() // 빈 줄로 이동
    const lone = empty().tableau
    lone[0] = [card('S', 5)]
    expect(autoMove({ ...empty(), tableau: lone }, { col: 0, index: 0 })).toBeNull()
    const full = empty().tableau.map(() => [card('H', 9)])
    full[0] = [card('S', 5)]
    expect(autoMove({ ...empty(), tableau: full }, { col: 0, index: 0 })).toBeNull()
  })
})
