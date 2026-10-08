export const SIZE = 4
export const TARGET = 2048

export type Direction = 'up' | 'down' | 'left' | 'right'

export type Tile = {
  id: number
  value: number
  row: number
  col: number
  merged?: boolean // 이번 이동에서 합쳐져 생긴 타일
  isNew?: boolean // 이번 이동 뒤 새로 생긴 타일
  consumed?: boolean // 이번 이동에서 다른 타일에 합쳐져 사라지는 타일 (애니메이션용으로 한 번만 남음)
}

export type GameState = {
  tiles: Tile[]
  score: number
  nextId: number
  reached: boolean // 2048 타일을 한 번이라도 만들었는지 (만들어도 계속 진행)
  over: boolean
}

type Rng = () => number

const live = (tiles: Tile[]) => tiles.filter((t) => !t.consumed)

export function toBoard(tiles: Tile[]): number[][] {
  const board = Array.from({ length: SIZE }, () => Array<number>(SIZE).fill(0))
  for (const t of live(tiles)) board[t.row][t.col] = t.value
  return board
}

// 칸이 가득 찼고 이웃한 같은 숫자도 없으면 더 움직일 수 없다
export function isOver(tiles: Tile[]): boolean {
  const board = toBoard(tiles)
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board[r][c] === 0) return false
      if (c + 1 < SIZE && board[r][c] === board[r][c + 1]) return false
      if (r + 1 < SIZE && board[r][c] === board[r + 1][c]) return false
    }
  }
  return true
}

function spawn(state: GameState, rng: Rng): GameState {
  const taken = new Set(live(state.tiles).map((t) => t.row * SIZE + t.col))
  const empty: number[] = []
  for (let i = 0; i < SIZE * SIZE; i++) if (!taken.has(i)) empty.push(i)
  if (empty.length === 0) return state
  const cell = empty[Math.floor(rng() * empty.length)]
  const tile: Tile = {
    id: state.nextId,
    value: rng() < 0.9 ? 2 : 4,
    row: Math.floor(cell / SIZE),
    col: cell % SIZE,
    isNew: true,
  }
  const tiles = [...state.tiles, tile]
  return { ...state, tiles, nextId: state.nextId + 1, over: isOver(tiles) }
}

export function newGame(rng: Rng = Math.random): GameState {
  const empty: GameState = { tiles: [], score: 0, nextId: 0, reached: false, over: false }
  return spawn(spawn(empty, rng), rng)
}

// 테스트용: 숫자 판(0은 빈 칸)에서 상태를 만든다
export function fromBoard(board: number[][], score = 0): GameState {
  const tiles: Tile[] = []
  board.forEach((row, r) =>
    row.forEach((value, c) => {
      if (value > 0) tiles.push({ id: tiles.length, value, row: r, col: c })
    }),
  )
  return {
    tiles,
    score,
    nextId: tiles.length,
    reached: tiles.some((t) => t.value >= TARGET),
    over: isOver(tiles),
  }
}

// 한 줄의 칸 좌표를 이동 방향의 맨 앞 칸부터 차례로 돌려준다
function lineCoords(dir: Direction, i: number): [number, number][] {
  return Array.from({ length: SIZE }, (_, k): [number, number] => {
    if (dir === 'left') return [i, k]
    if (dir === 'right') return [i, SIZE - 1 - k]
    if (dir === 'up') return [k, i]
    return [SIZE - 1 - k, i]
  })
}

// 한 번 이동한다. 판이 달라지지 않으면 같은 상태를 그대로 돌려주고 새 타일도 만들지 않는다.
export function move(state: GameState, dir: Direction, rng: Rng = Math.random): GameState {
  if (state.over) return state

  const tiles: Tile[] = live(state.tiles).map((t) => ({
    ...t,
    merged: false,
    isNew: false,
    consumed: false,
  }))
  const result: Tile[] = []
  let gained = 0
  let changed = false

  for (let i = 0; i < SIZE; i++) {
    const coords = lineCoords(dir, i)
    const line = coords
      .map(([r, c]) => tiles.find((t) => t.row === r && t.col === c))
      .filter((t): t is Tile => t !== undefined)

    let placed = 0
    let last: Tile | null = null
    for (const tile of line) {
      if (last && last.value === tile.value && !last.merged) {
        // 한 번의 이동에서 이미 합쳐진 타일은 다시 합치지 않는다
        last.value *= 2
        last.merged = true
        gained += last.value
        result.push({ ...tile, row: last.row, col: last.col, consumed: true })
        changed = true
      } else {
        const [r, c] = coords[placed++]
        if (tile.row !== r || tile.col !== c) changed = true
        const moved = { ...tile, row: r, col: c }
        result.push(moved)
        last = moved
      }
    }
  }

  if (!changed) return state

  const reached = state.reached || result.some((t) => !t.consumed && t.value >= TARGET)
  return spawn({ ...state, tiles: result, score: state.score + gained, reached }, rng)
}
