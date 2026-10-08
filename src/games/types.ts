import type { ComponentType } from 'react'

export type GameResult = { score: number; variant?: string }

export type GameProps = {
  onGameOver: (result: GameResult) => void
}

export type GameConfig = {
  id: string
  name: string
  description: string
  rules: string[]
  mode: 'single' | 'multi'
  maxPlayers?: number
  scoreOrder: 'asc' | 'desc'
  thumbnail: string
  scoreUnit?: string
  component: ComponentType<GameProps>
}
