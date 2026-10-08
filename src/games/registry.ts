import MinesweeperGame from './minesweeper/MinesweeperGame'
import SnakeGame from './snake/SnakeGame'
import SolitaireGame from './solitaire/SolitaireGame'
import SpiderGame from './spider/SpiderGame'
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
  {
    id: 'solitaire',
    name: '클론다이크 솔리테어',
    description: '카드를 순서대로 쌓는 클론다이크',
    rules: [
      '카드를 끌어서 옮기기, 카드를 더블클릭(더블탭)하면 자동으로 위 칸에 쌓기',
      '아래 줄에는 색이 번갈아가며 숫자가 1씩 줄도록 쌓고, 빈 줄에는 K만 놓기',
      '위 칸에 A부터 K까지 같은 무늬로 쌓으면 클리어',
      '왼쪽 위 더미를 누르면 한 장씩 뒤집기, 더미가 비면 다시 누르면 처음부터 (-100점)',
      '점수: 위 칸 +10, 더미에서 아래 줄 +5, 카드 뒤집기 +5, 위 칸에서 내리기 -15, 클리어 시간 보너스',
      '되돌리기로 직전 동작을 취소할 수 있음',
    ],
    mode: 'single',
    scoreOrder: 'desc',
    thumbnail: '/thumbnails/solitaire.svg',
    scoreUnit: '점',
    component: SolitaireGame,
  },
  {
    id: 'spider',
    name: '스파이더 솔리테어',
    description: '같은 무늬 K에서 A까지 이어 붙이기',
    rules: [
      '카드를 끌어서 옮기기, 숫자가 1 큰 카드 위에는 무늬와 상관없이 놓을 수 있고 빈 줄에는 아무 카드나 놓기',
      '같은 무늬로 숫자가 이어진 카드들만 한 번에 옮길 수 있음',
      '한 줄에 같은 무늬 K에서 A까지 13장이 이어지면 자동으로 치워지고, 8벌을 모두 치우면 클리어',
      '오른쪽 위 더미를 누르면 모든 줄에 한 장씩 나눠 줌 (빈 줄이 있으면 불가)',
      '카드를 더블클릭(더블탭)하면 알맞은 줄로 자동 이동',
      '점수: 500점에서 시작, 이동과 나눠 주기마다 -1, 한 벌 완성마다 +100',
      '무늬 수가 적을수록 쉬운 난이도 (1무늬, 2무늬, 4무늬)',
    ],
    mode: 'single',
    scoreOrder: 'desc',
    thumbnail: '/thumbnails/spider.svg',
    scoreUnit: '점',
    component: SpiderGame,
  },
]

export const getGame = (id: string) => games.find((g) => g.id === id)
