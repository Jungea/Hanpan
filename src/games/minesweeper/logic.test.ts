import { describe, expect, it } from 'vitest'
import {
  DIFFICULTIES,
  chord,
  createBoard,
  createBoardWithMines,
  flagCount,
  neighbors,
  openCell,
  placeMines,
  toggleFlag,
} from './logic'

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

const mineIndexes = (cells: { mine: boolean }[]) => cells.flatMap((c, i) => (c.mine ? [i] : []))

describe('placeMines', () => {
  it('난이도별 지뢰 개수가 맞다', () => {
    for (const d of DIFFICULTIES) {
      const board = placeMines(createBoard(d.rows, d.cols, d.mines), 0, seeded(1))
      expect(mineIndexes(board.cells)).toHaveLength(d.mines)
    }
  })

  it('첫 클릭 칸과 주변 8칸에는 지뢰가 없다 (여러 시드)', () => {
    const d = DIFFICULTIES[0]
    const click = 4 * d.cols + 4
    const safe = new Set([click, ...neighbors(d.rows, d.cols, click)])
    for (let seed = 0; seed < 200; seed++) {
      const board = placeMines(createBoard(d.rows, d.cols, d.mines), click, seeded(seed))
      expect(mineIndexes(board.cells).some((i) => safe.has(i))).toBe(false)
    }
  })

  it('구석 클릭도 안전하다', () => {
    const d = DIFFICULTIES[2]
    for (let seed = 0; seed < 50; seed++) {
      const board = placeMines(createBoard(d.rows, d.cols, d.mines), 0, seeded(seed))
      expect(board.cells[0].mine).toBe(false)
      expect(mineIndexes(board.cells)).toHaveLength(d.mines)
    }
  })

  it('시드가 다르면 지뢰 위치도 달라진다', () => {
    const d = DIFFICULTIES[1]
    const a = placeMines(createBoard(d.rows, d.cols, d.mines), 0, seeded(1))
    const b = placeMines(createBoard(d.rows, d.cols, d.mines), 0, seeded(2))
    expect(mineIndexes(a.cells)).not.toEqual(mineIndexes(b.cells))
  })

  it('칸이 모자라면 클릭 칸만 제외한다', () => {
    const board = placeMines(createBoard(3, 3, 8), 4, seeded(1))
    expect(board.cells[4].mine).toBe(false)
    expect(mineIndexes(board.cells)).toHaveLength(8)
  })
})

describe('openCell', () => {
  it('첫 클릭으로 지뢰가 놓이고 게임이 시작되며 절대 지지 않는다', () => {
    const d = DIFFICULTIES[0]
    for (let seed = 0; seed < 100; seed++) {
      const board = openCell(createBoard(d.rows, d.cols, d.mines), 40, seeded(seed))
      expect(board.status).not.toBe('lost')
      expect(board.cells[40].state).toBe('open')
    }
  })

  it('주변 숫자를 계산한다', () => {
    // 3x3, 가운데 위(1)에 지뢰
    const board = createBoardWithMines(3, 3, [1])
    expect(board.cells[0].adjacent).toBe(1)
    expect(board.cells[4].adjacent).toBe(1)
    expect(board.cells[6].adjacent).toBe(0)
  })

  it('빈 칸(0)을 열면 주변으로 번진다', () => {
    // 4x4, 오른쪽 위 구석 지뢰
    const board = openCell(createBoardWithMines(4, 4, [3]), 12)
    expect(board.cells[12].state).toBe('open')
    expect(board.cells[0].state).toBe('open')
    expect(board.cells[3].state).not.toBe('open') // 지뢰 칸은 열리지 않는다
    expect(board.status).toBe('won') // 지뢰 외 모든 칸이 번져서 열림
  })

  it('지뢰를 열면 패배한다', () => {
    const board = openCell(createBoardWithMines(3, 3, [0]), 0)
    expect(board.status).toBe('lost')
    expect(board.exploded).toBe(0)
  })

  it('깃발 칸은 열리지 않는다', () => {
    const flagged = toggleFlag(createBoardWithMines(3, 3, [0]), 0)
    expect(openCell(flagged, 0)).toBe(flagged)
  })

  it('지뢰가 아닌 칸을 모두 열면 클리어하고 남은 지뢰에 깃발이 꽂힌다', () => {
    let board = createBoardWithMines(2, 2, [0])
    board = openCell(board, 1)
    board = openCell(board, 2)
    expect(board.status).toBe('playing')
    board = openCell(board, 3)
    expect(board.status).toBe('won')
    expect(board.cells[0].state).toBe('flag')
  })

  it('끝난 판에서는 더 열리지 않는다', () => {
    const lost = openCell(createBoardWithMines(3, 3, [0]), 0)
    expect(openCell(lost, 8)).toBe(lost)
  })
})

describe('toggleFlag', () => {
  it('깃발을 꽂고 뽑는다', () => {
    let board = createBoard(3, 3, 1)
    board = toggleFlag(board, 0)
    expect(board.cells[0].state).toBe('flag')
    expect(flagCount(board)).toBe(1)
    board = toggleFlag(board, 0)
    expect(board.cells[0].state).toBe('hidden')
  })

  it('열린 칸에는 꽂을 수 없다', () => {
    const board = openCell(createBoardWithMines(3, 3, [0]), 8)
    expect(toggleFlag(board, 8)).toBe(board)
  })
})

describe('chord', () => {
  it('깃발 수가 숫자와 같으면 주변 칸을 연다', () => {
    // 3x3, 지뢰 0. 4번(가운데)은 숫자 1
    let board = createBoardWithMines(3, 3, [0])
    board = openCell(board, 4)
    board = toggleFlag(board, 0)
    const next = chord(board, 4)
    expect(next.cells[1].state).toBe('open')
    expect(next.cells[8].state).toBe('open')
    expect(next.status).toBe('won')
  })

  it('깃발 수가 모자라면 아무 일도 없다', () => {
    const board = openCell(createBoardWithMines(3, 3, [0]), 4)
    expect(chord(board, 4)).toBe(board)
  })

  it('깃발을 잘못 꽂았다면 지뢰를 밟고 패배한다', () => {
    let board = createBoardWithMines(3, 3, [0])
    board = openCell(board, 4)
    board = toggleFlag(board, 1) // 틀린 위치
    const next = chord(board, 4)
    expect(next.status).toBe('lost')
  })
})
