import { describe, expect, it } from 'vitest'
import {
  LEVELS,
  describe as describeResult,
  generateSecret,
  isCorrect,
  isOut,
  judge,
  validateGuess,
} from './logic'

function seeded(seed: number) {
  return () => {
    seed |= 0
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

describe('generateSecret', () => {
  it('요청한 자릿수이고 숫자만 쓰며 중복이 없다 (여러 시드)', () => {
    for (const { digits } of LEVELS) {
      for (let seed = 0; seed < 200; seed++) {
        const secret = generateSecret(digits, seeded(seed))
        expect(secret).toMatch(new RegExp(`^\\d{${digits}}$`))
        expect(new Set(secret).size).toBe(digits)
      }
    }
  })

  it('시드가 다르면 다른 숫자가 나온다', () => {
    const results = new Set(Array.from({ length: 30 }, (_, i) => generateSecret(3, seeded(i))))
    expect(results.size).toBeGreaterThan(10)
  })

  it('맨 앞자리가 0일 수도 있다', () => {
    const seen = Array.from({ length: 500 }, (_, i) => generateSecret(3, seeded(i))).some((s) =>
      s.startsWith('0'),
    )
    expect(seen).toBe(true)
  })
})

describe('judge', () => {
  it('모두 맞으면 3스트라이크', () => {
    expect(judge('123', '123')).toEqual({ strike: 3, ball: 0 })
  })

  it('숫자만 맞고 자리가 다르면 볼', () => {
    expect(judge('123', '312')).toEqual({ strike: 0, ball: 3 })
    expect(judge('123', '132')).toEqual({ strike: 1, ball: 2 })
  })

  it('하나도 없으면 아웃', () => {
    const result = judge('123', '456')
    expect(result).toEqual({ strike: 0, ball: 0 })
    expect(isOut(result)).toBe(true)
  })

  it('스트라이크와 볼이 섞인다', () => {
    expect(judge('4075', '4750')).toEqual({ strike: 1, ball: 3 })
    expect(judge('4075', '4813')).toEqual({ strike: 1, ball: 0 })
  })

  it('정답 여부를 판단한다', () => {
    expect(isCorrect(judge('1234', '1234'), 4)).toBe(true)
    expect(isCorrect(judge('1234', '1243'), 4)).toBe(false)
  })
})

describe('validateGuess', () => {
  it('올바른 추측은 null', () => {
    expect(validateGuess('027', 3)).toBeNull()
  })

  it('자릿수가 모자라면 length', () => {
    expect(validateGuess('12', 3)).toBe('length')
    expect(validateGuess('', 3)).toBe('length')
  })

  it('중복이 있으면 duplicate', () => {
    expect(validateGuess('112', 3)).toBe('duplicate')
  })

  it('숫자가 아니면 format', () => {
    expect(validateGuess('1a3', 3)).toBe('format')
  })
})

describe('describe', () => {
  it('결과를 말로 바꾼다', () => {
    expect(describeResult({ strike: 0, ball: 0 })).toBe('아웃')
    expect(describeResult({ strike: 1, ball: 0 })).toBe('1스트라이크')
    expect(describeResult({ strike: 0, ball: 2 })).toBe('2볼')
    expect(describeResult({ strike: 1, ball: 2 })).toBe('1스트라이크 2볼')
  })
})
