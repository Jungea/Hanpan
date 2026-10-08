import { Play } from 'lucide-react'
import type { GameConfig } from '../games/types'

type Props = {
  game: GameConfig
  onStart: () => void
}

export default function StartScreen({ game, onStart }: Props) {
  return (
    <div className="mx-auto flex min-h-96 w-full max-w-110 flex-col items-center justify-center gap-6 rounded-2xl border border-slate-200 bg-white p-6 text-center">
      <ul className="list-disc space-y-1 pl-5 text-left text-sm text-slate-600">
        {game.rules.map((rule) => (
          <li key={rule}>{rule}</li>
        ))}
      </ul>
      <button
        type="button"
        autoFocus
        onClick={onStart}
        className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-8 py-3 text-lg font-bold text-white"
      >
        <Play size={20} />
        시작
      </button>
    </div>
  )
}
