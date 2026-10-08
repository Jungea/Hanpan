import DummyGame from './dummy/DummyGame'
import type { GameConfig } from './types'

export const games: GameConfig[] = [
  {
    id: 'dummy',
    name: '더미 게임',
    description: '라우팅 확인용 임시 게임',
    mode: 'single',
    scoreOrder: 'desc',
    thumbnail: '/thumbnails/dummy.svg',
    scoreUnit: '점',
    component: DummyGame,
  },
]

export const getGame = (id: string) => games.find((g) => g.id === id)
