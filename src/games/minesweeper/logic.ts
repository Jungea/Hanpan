export type CellState = 'hidden' | 'open' | 'flag'
export type Cell = { mine: boolean; adjacent: number; state: CellState }
export type Status = 'ready' | 'playing' | 'won' | 'lost'

export type Board = {
  rows: number
  cols: number
  mines: number
  cells: Cell[] // index = row * cols + col
  status: Status
  exploded: number | null // 밟은 지뢰 칸
}

export type Difficulty = { name: string; rows: number; cols: number; mines: number }

export const DIFFICULTIES: Difficulty[] = [
  { name: '초급', rows: 9, cols: 9, mines: 10 },
  { name: '중급', rows: 16, cols: 16, mines: 40 },
  { name: '고급', rows: 16, cols: 30, mines: 99 },
]

export function neighbors(rows: number, cols: number, index: number): number[] {
  const r = Math.floor(index / cols)
  const c = index % cols
  const result: number[] = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (dr === 0 && dc === 0) continue
      const nr = r + dr
      const nc = c + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) result.push(nr * cols + nc)
    }
  }
  return result
}

export function createBoard(rows: number, cols: number, mines: number): Board {
  return {
    rows,
    cols,
    mines,
    cells: Array.from({ length: rows * cols }, () => ({
      mine: false,
      adjacent: 0,
      state: 'hidden' as CellState,
    })),
    status: 'ready',
    exploded: null,
  }
}

function computeAdjacent(cells: Cell[], rows: number, cols: number) {
  cells.forEach((cell, i) => {
    cell.adjacent = neighbors(rows, cols, i).filter((n) => cells[n].mine).length
  })
}

// 테스트용: 지뢰 위치를 직접 지정해 진행 중인 판을 만든다
export function createBoardWithMines(rows: number, cols: number, mineIndexes: number[]): Board {
  const board = createBoard(rows, cols, mineIndexes.length)
  mineIndexes.forEach((i) => {
    board.cells[i].mine = true
  })
  computeAdjacent(board.cells, rows, cols)
  return { ...board, status: 'playing' }
}

// 첫 클릭 칸과 그 주변 8칸에는 지뢰를 놓지 않는다 (칸이 모자라면 클릭 칸만 제외)
export function placeMines(board: Board, safeIndex: number, rng: () => number): Board {
  const { rows, cols, mines } = board
  const around = new Set([safeIndex, ...neighbors(rows, cols, safeIndex)])
  let candidates: number[] = []
  for (let i = 0; i < rows * cols; i++) if (!around.has(i)) candidates.push(i)
  if (candidates.length < mines) {
    candidates = []
    for (let i = 0; i < rows * cols; i++) if (i !== safeIndex) candidates.push(i)
  }

  // Fisher-Yates 셔플 후 앞에서 mines개 사용
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[candidates[i], candidates[j]] = [candidates[j], candidates[i]]
  }

  const cells = board.cells.map((c) => ({ ...c, mine: false }))
  candidates.slice(0, mines).forEach((i) => {
    cells[i].mine = true
  })
  computeAdjacent(cells, rows, cols)
  return { ...board, cells }
}

// 칸을 열고 빈 칸(0)이면 주변으로 번진다. 밟은 첫 지뢰 칸 번호를 반환한다.
function floodOpen(cells: Cell[], rows: number, cols: number, start: number): number | null {
  const stack = [start]
  let exploded: number | null = null
  while (stack.length > 0) {
    const i = stack.pop()!
    const cell = cells[i]
    if (cell.state !== 'hidden') continue
    cell.state = 'open'
    if (cell.mine) {
      if (exploded === null) exploded = i
      continue
    }
    if (cell.adjacent === 0) stack.push(...neighbors(rows, cols, i))
  }
  return exploded
}

function settle(board: Board, cells: Cell[], exploded: number | null): Board {
  if (exploded !== null) return { ...board, cells, status: 'lost', exploded }
  const cleared = cells.every((c) => c.mine || c.state === 'open')
  if (!cleared) return { ...board, cells, status: 'playing' }
  // 클리어하면 남은 지뢰에 깃발을 꽂는다
  const flagged = cells.map((c) => (c.mine ? { ...c, state: 'flag' as CellState } : c))
  return { ...board, cells: flagged, status: 'won' }
}

export function openCell(board: Board, index: number, rng: () => number = Math.random): Board {
  if (board.status === 'won' || board.status === 'lost') return board
  if (board.cells[index].state !== 'hidden') return board

  const base = board.status === 'ready' ? placeMines(board, index, rng) : board
  const cells = base.cells.map((c) => ({ ...c }))
  const exploded = floodOpen(cells, base.rows, base.cols, index)
  return settle(base, cells, exploded)
}

export function toggleFlag(board: Board, index: number): Board {
  if (board.status === 'won' || board.status === 'lost') return board
  const cell = board.cells[index]
  if (cell.state === 'open') return board
  const cells = board.cells.map((c) => ({ ...c }))
  cells[index].state = cell.state === 'flag' ? 'hidden' : 'flag'
  return { ...board, cells }
}

// 숫자 칸의 주변 깃발 수가 숫자와 같으면 나머지 주변 칸을 한 번에 연다
export function chord(board: Board, index: number): Board {
  if (board.status !== 'playing') return board
  const cell = board.cells[index]
  if (cell.state !== 'open' || cell.adjacent === 0) return board

  const around = neighbors(board.rows, board.cols, index)
  const flags = around.filter((n) => board.cells[n].state === 'flag').length
  if (flags !== cell.adjacent) return board

  const cells = board.cells.map((c) => ({ ...c }))
  let exploded: number | null = null
  for (const n of around) {
    if (cells[n].state !== 'hidden') continue
    const hit = floodOpen(cells, board.rows, board.cols, n)
    if (exploded === null) exploded = hit
  }
  return settle(board, cells, exploded)
}

export function flagCount(board: Board): number {
  return board.cells.filter((c) => c.state === 'flag').length
}
