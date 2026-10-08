import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GameOverDialog from '../components/GameOverDialog'
import { getGame } from '../games/registry'
import type { GameResult } from '../games/types'

export default function GamePage() {
  const { id = '' } = useParams()
  const game = getGame(id)
  const [result, setResult] = useState<GameResult | null>(null)
  const [round, setRound] = useState(0)

  if (!game) {
    return (
      <div>
        <p>게임을 찾을 수 없습니다.</p>
        <Link to="/" className="underline">
          메인으로
        </Link>
      </div>
    )
  }

  const Game = game.component

  const restart = () => {
    setResult(null)
    setRound((r) => r + 1)
  }

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{game.name}</h1>
      <Game key={round} onGameOver={setResult} />
      {result && <GameOverDialog game={game} result={result} onRestart={restart} />}
    </div>
  )
}
