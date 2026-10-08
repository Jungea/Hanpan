import { shuffle, type Card, type Suit } from '../solitaire/logic'

export type SuitCount = 1 | 2 | 4

export type SpiderState = {
  tableau: Card[][] // 10줄
  stock: Card[] // 맨 위 카드가 배열 끝, 한 번에 10장씩 나눠 준다
  completed: Suit[] // 완성해서 치운 K→A 한 벌의 무늬
  score: number
}

export type SpiderSource = { col: number; index: number }

export const COLUMNS = 10
export const TOTAL_RUNS = 8
export const START_SCORE = 500
// 윈도우 스파이더 방식: 500점에서 시작, 이동마다 -1, 한 벌 완성마다 +100
export const SPIDER_SCORE = { move: -1, run: 100 }

const SUIT_SETS: Record<SuitCount, Suit[]> = {
  1: ['S'],
  2: ['S', 'H'],
  4: ['S', 'H', 'D', 'C'],
}

const clamp = (score: number) => Math.max(0, score)

export function createSpiderDeck(suitCount: SuitCount): Card[] {
  const suits = SUIT_SETS[suitCount]
  const copies = TOTAL_RUNS / suits.length
  const deck: Card[] = []
  let id = 0
  for (let c = 0; c < copies; c++) {
    for (const suit of suits) {
      for (let rank = 1; rank <= 13; rank++) deck.push({ id: id++, suit, rank, faceUp: false })
    }
  }
  return deck
}

export function newSpiderGame(suitCount: SuitCount, rng: () => number = Math.random): SpiderState {
  const deck = shuffle(createSpiderDeck(suitCount), rng)
  const tableau: Card[][] = []
  let cursor = 0
  for (let col = 0; col < COLUMNS; col++) {
    const count = col < 4 ? 6 : 5
    const pile = deck.slice(cursor, cursor + count)
    cursor += count
    pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true }
    tableau.push(pile)
  }
  return { tableau, stock: deck.slice(cursor), completed: [], score: START_SCORE }
}

// 앞면이고 같은 무늬로 숫자가 1씩 줄어드는 연속 카드인지
export function isRun(cards: Card[]): boolean {
  if (cards.length === 0) return false
  return cards.every(
    (c, i) =>
      c.faceUp && (i === 0 || (c.suit === cards[i - 1].suit && c.rank === cards[i - 1].rank - 1)),
  )
}

// 이 위치부터 끝까지 옮길 수 있으면 그 카드들, 아니면 null
export function getRun(state: SpiderState, from: SpiderSource): Card[] | null {
  const pile = state.tableau[from.col]
  if (!pile || from.index < 0 || from.index >= pile.length) return null
  const cards = pile.slice(from.index)
  return isRun(cards) ? cards : null
}

// 줄 맨 위 카드보다 숫자가 1 작으면 무늬와 상관없이 놓을 수 있고, 빈 줄에는 아무 카드나 놓는다
export function canDrop(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return true
  const top = pile[pile.length - 1]
  return top.faceUp && top.rank === card.rank + 1
}

// 옮길 수 있는 연속 카드가 시작되는 위치 (그 앞의 카드는 끌 수 없다)
export function runStart(pile: Card[]): number {
  let start = pile.length
  while (start > 0 && isRun(pile.slice(start - 1))) start--
  return start
}

// 한 줄 끝에 같은 무늬 K→A 13장이 이어지면 치우고 아래 카드를 뒤집는다
function collectRuns(tableau: Card[][], completed: Suit[]) {
  const done = [...completed]
  let runs = 0
  const next = tableau.map((pile) => {
    if (pile.length < 13) return pile
    const tail = pile.slice(-13)
    if (!isRun(tail) || tail[0].rank !== 13) return pile
    runs++
    done.push(tail[0].suit)
    const rest = pile.slice(0, -13)
    if (rest.length > 0 && !rest[rest.length - 1].faceUp) {
      rest[rest.length - 1] = { ...rest[rest.length - 1], faceUp: true }
    }
    return rest
  })
  return { tableau: next, completed: done, runs }
}

export function move(state: SpiderState, from: SpiderSource, toCol: number): SpiderState | null {
  const cards = getRun(state, from)
  if (!cards) return null
  if (toCol === from.col || toCol < 0 || toCol >= COLUMNS) return null
  if (!canDrop(cards[0], state.tableau[toCol])) return null

  const tableau = state.tableau.map((p) => [...p])
  tableau[from.col] = tableau[from.col].slice(0, from.index)
  const source = tableau[from.col]
  if (source.length > 0 && !source[source.length - 1].faceUp) {
    source[source.length - 1] = { ...source[source.length - 1], faceUp: true }
  }
  tableau[toCol] = [...tableau[toCol], ...cards]

  const result = collectRuns(tableau, state.completed)
  return {
    ...state,
    tableau: result.tableau,
    completed: result.completed,
    score: clamp(state.score + SPIDER_SCORE.move + result.runs * SPIDER_SCORE.run),
  }
}

// 빈 줄이 없을 때만 모든 줄에 한 장씩 나눠 준다
export function canDeal(state: SpiderState): boolean {
  return state.stock.length > 0 && state.tableau.every((p) => p.length > 0)
}

export function dealRow(state: SpiderState): SpiderState | null {
  if (!canDeal(state)) return null
  const dealt = state.stock.slice(-COLUMNS)
  const tableau = state.tableau.map((pile, col) => [...pile, { ...dealt[col], faceUp: true }])
  const result = collectRuns(tableau, state.completed)
  return {
    tableau: result.tableau,
    stock: state.stock.slice(0, -COLUMNS),
    completed: result.completed,
    score: clamp(state.score + SPIDER_SCORE.move + result.runs * SPIDER_SCORE.run),
  }
}

export function isWon(state: SpiderState): boolean {
  return state.completed.length === TOTAL_RUNS
}

// 더블클릭용: 같은 무늬 위 → 다른 카드 위 → 빈 줄 순서로 알맞은 줄에 옮긴다
export function autoMove(state: SpiderState, from: SpiderSource): SpiderState | null {
  const cards = getRun(state, from)
  if (!cards) return null
  const pile = state.tableau[from.col]
  const rank = (toCol: number) => {
    const target = state.tableau[toCol]
    if (toCol === from.col || !canDrop(cards[0], target)) return 0
    if (target.length === 0) return from.index === 0 ? 0 : 1 // 줄 전체를 빈 줄로 옮기는 건 의미 없음
    return target[target.length - 1].suit === cards[0].suit ? 3 : 2
  }
  let best = -1
  let bestRank = 0
  for (let col = 0; col < COLUMNS; col++) {
    const r = rank(col)
    if (r > bestRank) {
      best = col
      bestRank = r
    }
  }
  // 이미 같은 무늬 위에 붙어 있는 카드는 다른 줄로 굳이 옮기지 않는다
  if (best >= 0 && from.index > 0 && pile[from.index - 1].suit === cards[0].suit) {
    if (pile[from.index - 1].rank === cards[0].rank + 1 && bestRank < 3) return null
  }
  return best >= 0 ? move(state, from, best) : null
}
