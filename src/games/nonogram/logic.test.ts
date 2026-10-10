import { describe, expect, it } from 'vitest'
import {
  SIZES,
  colHintsOf,
  generatePuzzle,
  isLineSatisfied,
  isSolved,
  placements,
  rowHintsOf,
  runsOf,
  setCell,
  solveByLines,
  type CellMark,
} from './logic'

// 결정적인 테스트를 위한 간단한 시드 난수 생성기 (mulberry32)
function seeded(seed: number): () => number {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('runsOf', () => {
  it('연속된 칸의 길이들을 구한다', () => {
    expect(runsOf([true, true, false, true, false, false, true])).toEqual([2, 1, 1])
    expect(runsOf([false, false, false])).toEqual([])
    expect(runsOf([true, true, true])).toEqual([3])
  })
})

describe('rowHintsOf / colHintsOf', () => {
  it('3x3 보드에서 행/열 힌트를 계산한다', () => {
    // 1 0 1
    // 0 1 0
    // 1 1 1
    const solution = [true, false, true, false, true, false, true, true, true]
    expect(rowHintsOf(solution, 3)).toEqual([[1, 1], [1], [3]])
    expect(colHintsOf(solution, 3)).toEqual([[1, 1], [2], [1, 1]])
  })
})

describe('placements', () => {
  it('길이 5에 힌트 [2,1]을 만족하는 모든 배치를 나열한다', () => {
    const result = placements([2, 1], 5)
    // 블록 2개(길이2,1) + 최소 간격1 = 최소길이4, 여유 1칸 -> 경우 3가지
    expect(result).toHaveLength(3)
    expect(result).toContainEqual([true, true, false, true, false])
    expect(result).toContainEqual([true, true, false, false, true])
    expect(result).toContainEqual([false, true, true, false, true])
  })

  it('힌트가 빈 배열이면 전부 빈 줄 하나만 나온다', () => {
    expect(placements([], 4)).toEqual([[false, false, false, false]])
  })
})

describe('solveByLines', () => {
  it('유일하게 풀리는 보드는 원래 해를 그대로 복원한다', () => {
    // 4x4 보드에서 (row1, col2) 한 칸만 채워진 경우, 행/열 힌트를 번갈아 적용하면 유일하게 복원된다
    const n = 4
    const solution = new Array(n * n).fill(false)
    solution[1 * n + 2] = true
    const rowHints = rowHintsOf(solution, n)
    const colHints = colHintsOf(solution, n)
    expect(solveByLines(n, rowHints, colHints)).toEqual(solution)
  })

  it('모호한 힌트는 null을 반환한다', () => {
    // 2x2 보드에서 각 줄 힌트가 [1]이면 대각선 두 가지 모두 가능해 모호하다
    const n = 2
    const rowHints = [[1], [1]]
    const colHints = [[1], [1]]
    expect(solveByLines(n, rowHints, colHints)).toBeNull()
  })
})

describe('generatePuzzle', () => {
  it.each(SIZES)('$name 크기는 힌트만으로 유일하게 풀린다', (size) => {
    const puzzle = generatePuzzle(size, seeded(1))
    const solved = solveByLines(size.n, puzzle.rowHints, puzzle.colHints)
    expect(solved).not.toBeNull()
  })
})

describe('isLineSatisfied / isSolved', () => {
  it('채운 칸의 연속 길이가 힌트와 같으면 만족', () => {
    const cells: CellMark[] = ['filled', 'filled', 'empty', 'filled']
    expect(isLineSatisfied(cells, [2, 1])).toBe(true)
    expect(isLineSatisfied(cells, [2, 2])).toBe(false)
  })

  it('X표시는 채운 것으로 치지 않는다', () => {
    const cells: CellMark[] = ['marked', 'filled', 'filled', 'marked']
    expect(isLineSatisfied(cells, [2])).toBe(true)
  })

  it('모든 행/열이 힌트를 만족하면 클리어', () => {
    const n = 2
    const rowHints = [[2], [2]]
    const colHints = [[2], [2]]
    const player: CellMark[] = ['filled', 'filled', 'filled', 'filled']
    expect(isSolved(player, n, rowHints, colHints)).toBe(true)
    const broken: CellMark[] = ['filled', 'empty', 'filled', 'filled']
    expect(isSolved(broken, n, rowHints, colHints)).toBe(false)
  })
})

describe('setCell', () => {
  it('칸의 상태를 바꾼다', () => {
    const grid: CellMark[] = ['empty', 'empty']
    const next = setCell(grid, 0, 'filled')
    expect(next[0]).toBe('filled')
    expect(grid[0]).toBe('empty')
  })

  it('이미 같은 상태면 원본을 그대로 반환한다', () => {
    const grid: CellMark[] = ['filled', 'empty']
    expect(setCell(grid, 0, 'filled')).toBe(grid)
  })
})
