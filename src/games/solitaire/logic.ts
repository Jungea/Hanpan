export type Suit = 'S' | 'H' | 'D' | 'C'

export type Card = { id: number; suit: Suit; rank: number; faceUp: boolean }

export type GameState = {
  stock: Card[] // 맨 위 카드가 배열 끝
  waste: Card[]
  foundations: Card[][] // 4개, 먼저 놓인 A가 무늬를 정한다
  tableau: Card[][] // 7개
  score: number
}

export type Source =
  | { zone: 'waste' }
  | { zone: 'tableau'; col: number; index: number }
  | { zone: 'foundation'; pile: number }

export type Target = { zone: 'tableau'; col: number } | { zone: 'foundation'; pile: number }

export const SUITS: Suit[] = ['S', 'H', 'D', 'C']

// 윈도우 솔리테어 방식 점수
export const SCORE = {
  wasteToTableau: 5,
  toFoundation: 10,
  flip: 5,
  foundationToTableau: -15,
  recycle: -100,
}

export const isRed = (card: Card) => card.suit === 'H' || card.suit === 'D'

const clamp = (score: number) => Math.max(0, score)

export function createDeck(): Card[] {
  const deck: Card[] = []
  SUITS.forEach((suit, s) => {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: s * 13 + rank - 1, suit, rank, faceUp: false })
    }
  })
  return deck
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function newGame(rng: () => number = Math.random): GameState {
  const deck = shuffle(createDeck(), rng)
  const tableau: Card[][] = []
  let cursor = 0
  for (let col = 0; col < 7; col++) {
    const pile = deck.slice(cursor, cursor + col + 1)
    cursor += col + 1
    pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true }
    tableau.push(pile)
  }
  return {
    stock: deck.slice(cursor),
    waste: [],
    foundations: [[], [], [], []],
    tableau,
    score: 0,
  }
}

// 탭에는 색이 번갈아가며 1 작은 숫자를 쌓고, 빈 칸에는 K만 놓는다
export function canStackOnTableau(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 13
  const top = pile[pile.length - 1]
  return top.faceUp && isRed(top) !== isRed(card) && top.rank === card.rank + 1
}

// 위 칸에는 A부터 같은 무늬로 1씩 올려 쌓는다
export function canPlaceOnFoundation(card: Card, pile: Card[]): boolean {
  if (pile.length === 0) return card.rank === 1
  const top = pile[pile.length - 1]
  return top.suit === card.suit && top.rank + 1 === card.rank
}

export function isWon(state: GameState): boolean {
  return state.foundations.every((pile) => pile.length === 13)
}

// 옮길 수 있는 카드(들)를 반환한다. 불가능하면 null
export function getSourceCards(state: GameState, from: Source): Card[] | null {
  if (from.zone === 'waste') {
    const top = state.waste[state.waste.length - 1]
    return top ? [top] : null
  }
  if (from.zone === 'foundation') {
    const pile = state.foundations[from.pile]
    return pile && pile.length > 0 ? [pile[pile.length - 1]] : null
  }
  const pile = state.tableau[from.col]
  if (!pile || from.index < 0 || from.index >= pile.length) return null
  const cards = pile.slice(from.index)
  return cards[0].faceUp ? cards : null
}

export function draw(state: GameState): GameState | null {
  if (state.stock.length > 0) {
    const card = { ...state.stock[state.stock.length - 1], faceUp: true }
    return { ...state, stock: state.stock.slice(0, -1), waste: [...state.waste, card] }
  }
  if (state.waste.length === 0) return null
  // 더미가 비면 버린 카드를 뒤집어 다시 더미로 (재순환 감점)
  const stock = [...state.waste].reverse().map((c) => ({ ...c, faceUp: false }))
  return { ...state, stock, waste: [], score: clamp(state.score + SCORE.recycle) }
}

export function move(state: GameState, from: Source, to: Target): GameState | null {
  const cards = getSourceCards(state, from)
  if (!cards) return null

  let delta = 0
  if (to.zone === 'tableau') {
    if (from.zone === 'tableau' && from.col === to.col) return null
    if (!canStackOnTableau(cards[0], state.tableau[to.col])) return null
    if (from.zone === 'waste') delta = SCORE.wasteToTableau
    if (from.zone === 'foundation') delta = SCORE.foundationToTableau
  } else {
    if (from.zone === 'foundation' || cards.length !== 1) return null
    if (!canPlaceOnFoundation(cards[0], state.foundations[to.pile])) return null
    delta = SCORE.toFoundation
  }

  const stock = state.stock
  let waste = state.waste
  const foundations = state.foundations.map((p) => [...p])
  const tableau = state.tableau.map((p) => [...p])

  if (from.zone === 'waste') waste = waste.slice(0, -1)
  else if (from.zone === 'foundation') foundations[from.pile].pop()
  else {
    tableau[from.col] = tableau[from.col].slice(0, from.index)
    const pile = tableau[from.col]
    // 아래에 덮여 있던 카드가 드러나면 뒤집는다
    if (pile.length > 0 && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1] = { ...pile[pile.length - 1], faceUp: true }
      delta += SCORE.flip
    }
  }

  if (to.zone === 'tableau') tableau[to.col] = [...tableau[to.col], ...cards]
  else foundations[to.pile] = [...foundations[to.pile], ...cards]

  return { stock, waste, foundations, tableau, score: clamp(state.score + delta) }
}

// 더블클릭용: 위 칸으로 갈 수 있으면 알맞은 칸으로 보낸다
export function autoToFoundation(state: GameState, from: Source): GameState | null {
  for (let pile = 0; pile < 4; pile++) {
    const next = move(state, from, { zone: 'foundation', pile })
    if (next) return next
  }
  return null
}

// 클리어 시간 보너스 (윈도우 방식: 30초 이상일 때 700000 / 초)
export function timeBonus(seconds: number): number {
  return seconds >= 30 ? Math.floor(700000 / seconds) : 0
}
