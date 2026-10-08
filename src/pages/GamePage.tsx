import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import GameOverDialog from '../components/GameOverDialog'
import StartScreen from '../components/StartScreen'
import { getGame } from '../games/registry'
import type { GameResult } from '../games/types'

export default function GamePage() {
  const { id = '' } = useParams()
  const game = getGame(id)
  const [result, setResult] = useState<GameResult | null>(null)
  const [round, setRound] = useState(0)
  const [started, setStarted] = useState(false)

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
    setStarted(false)
    setRound((r) => r + 1)
  }

  return (
    <div>
      <header className="mb-4 flex items-center gap-3">
        <Link to="/">
          <img src="/logo-wide.png" alt="한판 HANPAN, 메인으로" className="h-10 w-auto" />
        </Link>
        <span className="h-6 w-px bg-slate-300" aria-hidden="true" />
        <h1 className="text-2xl font-bold">{game.name}</h1>
      </header>
      {started ? (
        <Game key={round} onGameOver={setResult} />
      ) : (
        <StartScreen game={game} onStart={() => setStarted(true)} />
      )}
      {started && (
        <details className="mt-4 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm">
          <summary className="cursor-pointer font-medium">규칙 보기</summary>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-slate-600">
            {game.rules.map((rule) => (
              <li key={rule}>{rule}</li>
            ))}
          </ul>
        </details>
      )}
      {result && <GameOverDialog game={game} result={result} onRestart={restart} />}
    </div>
  )
}
