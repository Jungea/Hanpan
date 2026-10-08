export type Level = { name: string; digits: number; maxTries: number }

export const LEVELS: Level[] = [
  { name: '3자리', digits: 3, maxTries: 10 },
  { name: '4자리', digits: 4, maxTries: 12 },
]

export type Judgement = { strike: number; ball: number }

// 중복 없는 숫자를 digits개 뽑는다 (0도 사용하고, 맨 앞자리에도 올 수 있다)
export function generateSecret(digits: number, rng: () => number = Math.random): string {
  const pool = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9']
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  return pool.slice(0, digits).join('')
}

export type GuessError = 'length' | 'format' | 'duplicate'

// 입력이 올바른 추측인지 검사한다. 올바르면 null
export function validateGuess(guess: string, digits: number): GuessError | null {
  if (!/^\d*$/.test(guess)) return 'format'
  if (new Set(guess).size !== guess.length) return 'duplicate'
  if (guess.length !== digits) return 'length'
  return null
}

// 숫자와 자리가 모두 맞으면 스트라이크, 숫자만 맞으면 볼
export function judge(secret: string, guess: string): Judgement {
  let strike = 0
  let ball = 0
  for (let i = 0; i < guess.length; i++) {
    if (guess[i] === secret[i]) strike++
    else if (secret.includes(guess[i])) ball++
  }
  return { strike, ball }
}

export const isOut = (j: Judgement) => j.strike === 0 && j.ball === 0
export const isCorrect = (j: Judgement, digits: number) => j.strike === digits

export function describe(j: Judgement): string {
  if (isOut(j)) return '아웃'
  return [j.strike > 0 ? `${j.strike}스트라이크` : '', j.ball > 0 ? `${j.ball}볼` : '']
    .filter(Boolean)
    .join(' ')
}
