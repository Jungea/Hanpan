import MinesweeperGame from './minesweeper/MinesweeperGame'
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
  {
    id: 'minesweeper',
    name: '지뢰찾기',
    description: '지뢰를 피해 모든 칸 열기',
    rules: [
      '왼쪽 클릭으로 칸 열기, 오른쪽 클릭으로 깃발',
      '숫자 주변 깃발 수가 숫자와 같으면 숫자 칸을 더블클릭해 주변을 한 번에 열기',
      '모바일은 길게 눌러 깃발, 열기/깃발 전환 버튼 사용, 숫자 칸 탭으로 주변 열기',
      '첫 클릭은 항상 안전하고, 지뢰를 피해 모든 칸을 열면 클리어',
      '클리어 시간이 짧을수록 좋은 기록',
    ],
    mode: 'single',
    scoreOrder: 'asc',
    thumbnail: '/thumbnails/minesweeper.svg',
    scoreUnit: '초',
    component: MinesweeperGame,
  },
]

export const getGame = (id: string) => games.find((g) => g.id === id)
