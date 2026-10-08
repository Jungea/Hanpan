import { Link } from 'react-router-dom'
import type { GameConfig } from '../games/types'

export default function GameCard({ game }: { game: GameConfig }) {
  return (
    <Link
      to={`/games/${game.id}`}
      className="group block overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900"
    >
      <div className="relative aspect-square bg-slate-100">
        <img
          src={game.thumbnail}
          alt={`${game.name} 썸네일`}
          className="h-full w-full object-cover"
        />
        {game.mode === 'multi' && (
          <span className="absolute right-2 top-2 rounded bg-indigo-600 px-2 py-0.5 text-xs font-semibold text-white">
            멀티
          </span>
        )}
      </div>
      <div className="p-3">
        <h2 className="font-semibold group-hover:underline">{game.name}</h2>
        <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">{game.description}</p>
      </div>
    </Link>
  )
}
