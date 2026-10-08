export type Level = { name: string; pairs: number; cols: number }

export const LEVELS: Level[] = [
  { name: '쉬움', pairs: 6, cols: 4 }, // 4x3
  { name: '보통', pairs: 8, cols: 4 }, // 4x4
  { name: '어려움', pairs: 12, cols: 6 }, // 6x4
]

export type CardState = 'hidden' | 'open' | 'matched'
export type Card = { symbol: number; state: CardState }

export type MemoryState = {
  cards: Card[]
  open: number[] // 지금 앞면으로 열려 있는 (아직 짝이 확정되지 않은) 카드 번호, 최대 2장
  moves: number // 두 장을 뒤집을 때마다 1
  won: boolean
}

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

export function newGame(pairs: number, rng: () => number = Math.random): MemoryState {
  const symbols = Array.from({ length: pairs }, (_, i) => i)
  const cards = shuffle([...symbols, ...symbols], rng).map<Card>((symbol) => ({
    symbol,
    state: 'hidden',
  }))
  return { cards, open: [], moves: 0, won: false }
}

// 카드를 뒤집는다. 이미 두 장이 열려 있거나(짝이 안 맞아 덮기 전) 뒤집을 수 없는 카드면 그대로
export function flip(state: MemoryState, index: number): MemoryState {
  const card = state.cards[index]
  if (!card || card.state !== 'hidden' || state.open.length >= 2 || state.won) return state

  const cards = state.cards.map((c, i) => (i === index ? { ...c, state: 'open' as const } : c))
  const open = [...state.open, index]
  if (open.length < 2) return { ...state, cards, open }

  const [a, b] = open
  const moves = state.moves + 1
  if (cards[a].symbol !== cards[b].symbol) return { ...state, cards, open, moves }

  // 짝이 맞으면 그대로 남긴다
  const matched = cards.map((c, i) =>
    i === a || i === b ? { ...c, state: 'matched' as const } : c,
  )
  return {
    cards: matched,
    open: [],
    moves,
    won: matched.every((c) => c.state === 'matched'),
  }
}

// 짝이 안 맞은 두 장을 다시 덮는다
export function closeMismatch(state: MemoryState): MemoryState {
  if (state.open.length < 2) return state
  const cards = state.cards.map((c, i) =>
    state.open.includes(i) ? { ...c, state: 'hidden' as const } : c,
  )
  return { ...state, cards, open: [] }
}

export const matchedPairs = (state: MemoryState) =>
  state.cards.filter((c) => c.state === 'matched').length / 2
