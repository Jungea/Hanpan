import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { getGame } from '../games/registry'
import type { GameResult } from '../games/types'

export default function GamePage() {
  const { id = '' } = useParams()
  const game = getGame(id)
  const [result, setResult] = useState<GameResult | null>(null)

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

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{game.name}</h1>
      <Game onGameOver={setResult} />
      {result && (
        <p className="mt-4 text-center text-slate-600">
          결과: {result.score}
          {game.scoreUnit} (결과 화면은 M2에서 구현)
        </p>
      )}
    </div>
  )
}
