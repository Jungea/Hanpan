import type { GameProps } from '../types'

export default function DummyGame({ onGameOver }: GameProps) {
  return (
    <div className="flex flex-col items-center gap-4 py-12">
      <p className="text-slate-600">더미 게임입니다.</p>
      <button
        type="button"
        className="rounded-lg bg-slate-900 px-4 py-2 text-white"
        onClick={() => onGameOver({ score: 100 })}
      >
        게임 종료 (100점)
      </button>
    </div>
  )
}
