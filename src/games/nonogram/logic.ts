export type Size = { name: string; n: number }

export const SIZES: Size[] = [
  { name: '5x5', n: 5 },
  { name: '10x10', n: 10 },
  { name: '15x15', n: 15 },
]

export type CellMark = 'empty' | 'filled' | 'marked'

export function shuffle<T>(items: T[], rng: () => number = Math.random): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

// 한 줄(행 또는 열)에서 연속으로 채워진 칸의 길이들을 구한다 (힌트)
export function runsOf(line: readonly boolean[]): number[] {
  const runs: number[] = []
  let count = 0
  for (const v of line) {
    if (v) count++
    else if (count > 0) {
      runs.push(count)
      count = 0
    }
  }
  if (count > 0) runs.push(count)
  return runs
}

export function rowHintsOf(solution: readonly boolean[], n: number): number[][] {
  return Array.from({ length: n }, (_, r) =>
    runsOf(Array.from({ length: n }, (_, c) => solution[r * n + c])),
  )
}

export function colHintsOf(solution: readonly boolean[], n: number): number[][] {
  return Array.from({ length: n }, (_, c) =>
    runsOf(Array.from({ length: n }, (_, r) => solution[r * n + c])),
  )
}

// 힌트를 만족하는 모든 배치(길이 length짜리 boolean 배열)를 나열한다
export function placements(hints: readonly number[], length: number): boolean[][] {
  if (hints.length === 0) return [new Array(length).fill(false)]

  const minExtra = (fromIndex: number) => {
    let total = 0
    for (let k = fromIndex; k < hints.length; k++) total += hints[k]
    return total + (hints.length - fromIndex - 1)
  }

  const results: boolean[][] = []

  function backtrack(blockIndex: number, start: number, line: boolean[]) {
    if (blockIndex === hints.length) {
      results.push([...line])
      return
    }
    const blockLen = hints[blockIndex]
    const maxStart = length - minExtra(blockIndex)
    for (let s = start; s <= maxStart; s++) {
      const next = [...line]
      for (let k = 0; k < blockLen; k++) next[s + k] = true
      backtrack(blockIndex + 1, s + blockLen + 1, next)
    }
  }

  backtrack(0, 0, new Array(length).fill(false))
  return results
}

type LineKnown = 'unknown' | 'filled' | 'empty'

const consistent = (placement: boolean[], known: LineKnown[]) =>
  known.every((state, i) => state === 'unknown' || (state === 'filled') === placement[i])

// 각 줄의 힌트만으로 확정되는 칸을 반복해서 채운다 (라인 솔버). 모든 칸이 확정되면 그 결과를 유일해로 간주한다
export function solveByLines(n: number, rowHints: number[][], colHints: number[][]): boolean[] | null {
  const state: LineKnown[] = new Array(n * n).fill('unknown')

  const applyLine = (hints: number[], getIndex: (i: number) => number): boolean => {
    const known = Array.from({ length: n }, (_, i) => state[getIndex(i)])
    const valid = placements(hints, n).filter((p) => consistent(p, known))
    if (valid.length === 0) return false
    for (let i = 0; i < n; i++) {
      if (known[i] !== 'unknown') continue
      const allFilled = valid.every((p) => p[i])
      const allEmpty = valid.every((p) => !p[i])
      if (allFilled) state[getIndex(i)] = 'filled'
      else if (allEmpty) state[getIndex(i)] = 'empty'
    }
    return true
  }

  let changed = true
  while (changed) {
    changed = false
    const before = state.join('')
    for (let r = 0; r < n; r++) {
      if (!applyLine(rowHints[r], (c) => r * n + c)) return null
    }
    for (let c = 0; c < n; c++) {
      if (!applyLine(colHints[c], (r) => r * n + c)) return null
    }
    if (state.join('') !== before) changed = true
  }

  if (state.some((s) => s === 'unknown')) return null
  return state.map((s) => s === 'filled')
}

export type Puzzle = { rowHints: number[][]; colHints: number[][] }

const MAX_ATTEMPTS = 150

// 무작위 도안을 만들고, 라인 솔버로 힌트만으로 유일하게 풀리는지 확인한다 (아니면 다시 생성)
export function generatePuzzle(size: Size, rng: () => number = Math.random): Puzzle {
  const { n } = size
  let fallback: Puzzle | null = null

  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    const solution = Array.from({ length: n * n }, () => rng() < 0.5)
    const rowHints = rowHintsOf(solution, n)
    const colHints = colHintsOf(solution, n)
    if (!fallback) fallback = { rowHints, colHints }
    if (solveByLines(n, rowHints, colHints) !== null) return { rowHints, colHints }
  }

  return fallback as Puzzle
}

export function isLineSatisfied(cells: readonly CellMark[], hints: readonly number[]): boolean {
  const runs = runsOf(cells.map((c) => c === 'filled'))
  return runs.length === hints.length && runs.every((r, i) => r === hints[i])
}

export function isSolved(
  player: readonly CellMark[],
  n: number,
  rowHints: number[][],
  colHints: number[][],
): boolean {
  for (let r = 0; r < n; r++) {
    const row = Array.from({ length: n }, (_, c) => player[r * n + c])
    if (!isLineSatisfied(row, rowHints[r])) return false
  }
  for (let c = 0; c < n; c++) {
    const col = Array.from({ length: n }, (_, r) => player[r * n + c])
    if (!isLineSatisfied(col, colHints[c])) return false
  }
  return true
}

export function setCell(grid: CellMark[], index: number, mark: CellMark): CellMark[] {
  if (grid[index] === mark) return grid
  const next = [...grid]
  next[index] = mark
  return next
}
