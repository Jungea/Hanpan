import { Link } from 'react-router-dom'
import { formatScore } from '../lib/formatScore'
import type { GameConfig, GameResult } from '../games/types'

type Props = {
  game: GameConfig
  result: GameResult
  onRestart: () => void
}

export default function GameOverDialog({ game, result, onRestart }: Props) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="게임 결과"
      className="fixed inset-0 z-10 flex items-center justify-center bg-slate-100 p-4"
    >
      <div className="w-full max-w-sm rounded-2xl bg-white px-6 py-10 text-center shadow-lg">
        <p className="text-sm font-semibold tracking-widest text-slate-400">한판</p>
        <h2 className="mt-2 text-xl font-bold">{game.name}</h2>
        {result.variant && <p className="mt-1 text-slate-500">{result.variant}</p>}
        <p className="my-8 text-6xl font-extrabold tabular-nums">
          {formatScore(result.score, game.scoreUnit)}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onRestart}
            className="flex-1 rounded-lg bg-slate-900 py-3 font-semibold text-white"
          >
            다시하기
          </button>
          <Link
            to="/"
            className="flex-1 rounded-lg border border-slate-300 py-3 font-semibold"
          >
            메인으로
          </Link>
        </div>
      </div>
    </div>
  )
}
