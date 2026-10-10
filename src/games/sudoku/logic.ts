export type Difficulty = { name: string; clues: number }

export const DIFFICULTIES: Difficulty[] = [
  { name: '쉬움', clues: 40 },
  { name: '보통', clues: 32 },
  { name: '어려움', clues: 26 },
]

const FULL_MASK = 0b111111111

const boxIndex = (r: number, c: number) => Math.floor(r / 3) * 3 + Math.floor(c / 3)

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

function candidates(mask: number): number[] {
  const result: number[] = []
  for (let d = 1; d <= 9; d++) if (mask & (1 << (d - 1))) result.push(d)
  return result
}

// 빈 보드에서 가능한 숫자를 무작위 순서로 시도해 완성된 보드 하나를 만든다
export function generateSolved(rng: () => number = Math.random): number[] {
  const grid = new Array(81).fill(0)
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)

  function fill(pos: number): boolean {
    if (pos === 81) return true
    const r = Math.floor(pos / 9)
    const c = pos % 9
    const b = boxIndex(r, c)
    const avail = FULL_MASK & ~(rows[r] | cols[c] | boxes[b])
    for (const d of shuffle(candidates(avail), rng)) {
      const bit = 1 << (d - 1)
      grid[pos] = d
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      if (fill(pos + 1)) return true
      grid[pos] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
    }
    return false
  }

  fill(0)
  return grid
}

// grid(0은 빈 칸)의 해를 limit개까지 센다. 유일해 검증에 쓴다 (MRV 백트래킹)
export function countSolutions(grid: readonly number[], limit = 2): number {
  const g = [...grid]
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)

  for (let i = 0; i < 81; i++) {
    const v = g[i]
    if (!v) continue
    const r = Math.floor(i / 9)
    const c = i % 9
    const bit = 1 << (v - 1)
    rows[r] |= bit
    cols[c] |= bit
    boxes[boxIndex(r, c)] |= bit
  }

  let count = 0

  function solve(): boolean {
    let best = -1
    let bestMask = 0
    let bestCount = 10
    for (let i = 0; i < 81; i++) {
      if (g[i] !== 0) continue
      const r = Math.floor(i / 9)
      const c = i % 9
      const avail = FULL_MASK & ~(rows[r] | cols[c] | boxes[boxIndex(r, c)])
      const cnt = candidates(avail).length
      if (cnt === 0) return false
      if (cnt < bestCount) {
        bestCount = cnt
        best = i
        bestMask = avail
        if (cnt === 1) break
      }
    }

    if (best === -1) {
      count++
      return count >= limit
    }

    const r = Math.floor(best / 9)
    const c = best % 9
    const b = boxIndex(r, c)
    for (const d of candidates(bestMask)) {
      const bit = 1 << (d - 1)
      g[best] = d
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      const stop = solve()
      g[best] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
      if (stop) return true
    }
    return false
  }

  solve()
  return count
}

export const hasUniqueSolution = (grid: readonly number[]) => countSolutions(grid, 2) === 1

// 완성 보드에서 칸을 무작위로 지우되, 지운 뒤에도 해가 유일할 때만 지운 상태를 유지한다
export function generatePuzzle(difficulty: Difficulty, rng: () => number = Math.random): number[] {
  const solved = generateSolved(rng)
  const given = [...solved]
  const order = shuffle(
    Array.from({ length: 81 }, (_, i) => i),
    rng,
  )
  const target = 81 - difficulty.clues
  let removed = 0

  for (const i of order) {
    if (removed >= target) break
    const backup = given[i]
    given[i] = 0
    if (hasUniqueSolution(given)) {
      removed++
    } else {
      given[i] = backup
    }
  }

  return given
}

// 행/열/3x3 박스 안에서 같은 숫자가 중복된 칸의 인덱스를 모은다
export function conflictSet(values: readonly number[]): Set<number> {
  const conflicts = new Set<number>()

  const mark = (indexes: number[]) => {
    const seen = new Map<number, number[]>()
    for (const i of indexes) {
      const v = values[i]
      if (!v) continue
      const group = seen.get(v)
      if (group) group.push(i)
      else seen.set(v, [i])
    }
    for (const group of seen.values()) {
      if (group.length > 1) group.forEach((i) => conflicts.add(i))
    }
  }

  for (let r = 0; r < 9; r++) mark(Array.from({ length: 9 }, (_, c) => r * 9 + c))
  for (let c = 0; c < 9; c++) mark(Array.from({ length: 9 }, (_, r) => r * 9 + c))
  for (let b = 0; b < 9; b++) {
    const br = Math.floor(b / 3) * 3
    const bc = (b % 3) * 3
    const indexes: number[] = []
    for (let dr = 0; dr < 3; dr++)
      for (let dc = 0; dc < 3; dc++) indexes.push((br + dr) * 9 + (bc + dc))
    mark(indexes)
  }

  return conflicts
}

export const isSolved = (values: readonly number[]): boolean =>
  values.every((v) => v !== 0) && conflictSet(values).size === 0

// 메모(후보 숫자) 토글. 원본은 바꾸지 않는다
export function toggleNote(notes: readonly Set<number>[], index: number, digit: number): Set<number>[] {
  const next = notes.map((s, i) => (i === index ? new Set(s) : s))
  const set = next[index]
  if (set.has(digit)) set.delete(digit)
  else set.add(digit)
  return next
}

export const clearNotesAt = (notes: readonly Set<number>[], index: number): Set<number>[] =>
  notes.map((s, i) => (i === index ? new Set<number>() : s))
