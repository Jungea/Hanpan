import SnakeGame from './snake/SnakeGame'
import type { GameConfig } from './types'

export const games: GameConfig[] = [
  {
    id: 'snake',
    name: '스네이크',
    description: '먹이를 먹고 길어지는 뱀 게임',
    rules: [
      '방향키/WASD, 스와이프 또는 화면 방향 버튼으로 이동',
      '먹이를 먹으면 +10점, 점점 빨라짐',
      '벽이나 자기 몸에 닿으면 종료',
      '화면 탭 또는 Space로 일시정지',
    ],
    mode: 'single',
    scoreOrder: 'desc',
    thumbnail: '/thumbnails/snake.svg',
    scoreUnit: '점',
    component: SnakeGame,
  },
]

export const getGame = (id: string) => games.find((g) => g.id === id)
