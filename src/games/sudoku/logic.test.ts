import { describe, expect, it } from 'vitest'
import {
  DIFFICULTIES,
  clearNotesAt,
  conflictSet,
  generatePuzzle,
  generateSolved,
  hasUniqueSolution,
  isSolved,
  toggleNote,
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

const rowOf = (values: readonly number[], r: number) =>
  Array.from({ length: 9 }, (_, c) => values[r * 9 + c])
const colOf = (values: readonly number[], c: number) =>
  Array.from({ length: 9 }, (_, r) => values[r * 9 + c])

describe('generateSolved', () => {
  it('모든 칸을 1-9로 채우고 행/열/박스에 중복이 없다', () => {
    const solved = generateSolved(seeded(1))
    expect(solved).toHaveLength(81)
    expect(solved.every((v) => v >= 1 && v <= 9)).toBe(true)
    for (let i = 0; i < 9; i++) {
      expect(new Set(rowOf(solved, i)).size).toBe(9)
      expect(new Set(colOf(solved, i)).size).toBe(9)
    }
    expect(conflictSet(solved).size).toBe(0)
    expect(isSolved(solved)).toBe(true)
  })

  it('시드가 다르면 다른 보드를 만든다', () => {
    const a = generateSolved(seeded(1))
    const b = generateSolved(seeded(2))
    expect(a).not.toEqual(b)
  })
})

describe('generatePuzzle', () => {
  it.each(DIFFICULTIES)('$name 난이도는 지운 뒤에도 해가 유일하다', (difficulty) => {
    const given = generatePuzzle(difficulty, seeded(42))
    expect(conflictSet(given).size).toBe(0)
    expect(hasUniqueSolution(given)).toBe(true)
    expect(given.filter((v) => v !== 0).length).toBeGreaterThan(0)
    expect(given.some((v) => v === 0)).toBe(true)
  })
})

describe('conflictSet', () => {
  it('같은 행에 중복된 숫자를 찾는다', () => {
    const values = new Array(81).fill(0)
    values[0] = 5
    values[3] = 5
    const conflicts = conflictSet(values)
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.has(3)).toBe(true)
    expect(conflicts.size).toBe(2)
  })

  it('같은 3x3 박스에 중복된 숫자를 찾는다', () => {
    const values = new Array(81).fill(0)
    values[0] = 7 // (0,0)
    values[10] = 7 // (1,1), 같은 박스
    const conflicts = conflictSet(values)
    expect(conflicts.has(0)).toBe(true)
    expect(conflicts.has(10)).toBe(true)
  })

  it('중복이 없으면 빈 집합을 반환한다', () => {
    const solved = generateSolved(seeded(7))
    expect(conflictSet(solved).size).toBe(0)
  })
})

describe('isSolved', () => {
  it('빈 칸이 있으면 false', () => {
    const solved = generateSolved(seeded(3))
    solved[0] = 0
    expect(isSolved(solved)).toBe(false)
  })

  it('충돌이 있으면 false', () => {
    const solved = generateSolved(seeded(3))
    solved[1] = solved[0]
    expect(isSolved(solved)).toBe(false)
  })
})

describe('toggleNote / clearNotesAt', () => {
  it('메모를 추가하고 다시 누르면 지운다', () => {
    const notes: Set<number>[] = Array.from({ length: 81 }, () => new Set<number>())
    const withNote = toggleNote(notes, 5, 3)
    expect(withNote[5].has(3)).toBe(true)
    expect(notes[5].has(3)).toBe(false) // 원본은 바뀌지 않음

    const removed = toggleNote(withNote, 5, 3)
    expect(removed[5].has(3)).toBe(false)
  })

  it('clearNotesAt은 해당 칸의 메모만 비운다', () => {
    const notes: Set<number>[] = Array.from({ length: 81 }, () => new Set<number>())
    const withNotes = toggleNote(toggleNote(notes, 5, 3), 6, 4)
    const cleared = clearNotesAt(withNotes, 5)
    expect(cleared[5].size).toBe(0)
    expect(cleared[6].has(4)).toBe(true)
  })
})
