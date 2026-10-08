const pad = (n: number) => String(n).padStart(2, '0')

export function formatScore(score: number, unit?: string): string {
  if (unit === '초') {
    return `${pad(Math.floor(score / 60))}:${pad(score % 60)}`
  }
  return `${score.toLocaleString('ko-KR')}${unit ?? ''}`
}
