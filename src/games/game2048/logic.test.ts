import { describe, expect, it } from 'vitest'
import { SIZE, fromBoard, isOver, move, newGame, toBoard } from './logic'

// 첫 칸과 값 2를 고르는 난수 (새 타일이 항상 맨 앞 빈 칸에 2로 생긴다)
const first = () => 0

// 새 타일을 빼고 비교하기 위해, 이동 결과에서 새로 생긴 타일을 제거한 판을 돌려준다
function boardWithoutNew(state: ReturnType<typeof move>) {
  return toBoard(state.tiles.filter((t) => !t.isNew))
}

describe('newGame', () => {
  it('2나 4가 적힌 타일 2개로 시작한다', () => {
    const g = newGame(first)
    expect(g.tiles).toHaveLength(2)
    expect(g.tiles.every((t) => t.value === 2 || t.value === 4)).toBe(true)
    expect(new Set(g.tiles.map((t) => `${t.row},${t.col}`)).size).toBe(2)
    expect(g.score).toBe(0)
    expect(g.over).toBe(false)
  })
})

describe('move: 슬라이드와 합치기', () => {
  it('왼쪽으로 밀면 빈 칸을 메운다', () => {
    const g = fromBoard([
      [0, 0, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 4],
    ])
    expect(boardWithoutNew(move(g, 'left', first))[0]).toEqual([2, 0, 0, 0])
    expect(boardWithoutNew(move(g, 'left', first))[3]).toEqual([4, 0, 0, 0])
  })

  it('같은 숫자 두 개가 만나면 합쳐지고 합친 값만큼 점수를 얻는다', () => {
    const g = fromBoard([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const next = move(g, 'left', first)
    expect(boardWithoutNew(next)[0]).toEqual([4, 0, 0, 0])
    expect(next.score).toBe(4)
  })

  it('한 번의 이동에서 이미 합쳐진 타일은 다시 합치지 않는다', () => {
    const g = fromBoard([
      [2, 2, 2, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const next = move(g, 'left', first)
    expect(boardWithoutNew(next)[0]).toEqual([4, 4, 0, 0])
    expect(next.score).toBe(8)
  })

  it('앞쪽부터 합친다 (2,2,4 → 4,4)', () => {
    const g = fromBoard([
      [2, 2, 4, 0],
      [4, 2, 2, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const next = move(g, 'left', first)
    expect(boardWithoutNew(next)[0]).toEqual([4, 4, 0, 0])
    expect(boardWithoutNew(next)[1]).toEqual([4, 4, 0, 0])
  })

  it('오른쪽, 위, 아래 방향도 같은 규칙으로 움직인다', () => {
    const g = fromBoard([
      [2, 0, 0, 2],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [2, 0, 0, 2],
    ])
    expect(boardWithoutNew(move(g, 'right', first))[0]).toEqual([0, 0, 0, 4])
    expect(boardWithoutNew(move(g, 'up', first))[0]).toEqual([4, 0, 0, 4])
    expect(boardWithoutNew(move(g, 'down', first))[3]).toEqual([4, 0, 0, 4])
  })

  it('합쳐져 사라지는 타일은 consumed로 표시되고 판에는 한 번만 센다', () => {
    const g = fromBoard([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const next = move(g, 'left', first)
    expect(next.tiles.filter((t) => t.consumed)).toHaveLength(1)
    expect(next.tiles.filter((t) => t.merged)).toHaveLength(1)
    // 다음 이동에서는 사라진 타일이 정리된다
    const after = move(next, 'right', first)
    expect(after.tiles.some((t) => t.consumed)).toBe(false)
  })
})

describe('move: 새 타일', () => {
  it('판이 바뀌면 빈 칸에 새 타일이 하나 생긴다', () => {
    const g = fromBoard([
      [0, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const next = move(g, 'left', first)
    expect(next.tiles.filter((t) => t.isNew)).toHaveLength(1)
    expect(next.tiles).toHaveLength(2)
  })

  it('새 타일은 90%는 2, 10%는 4다', () => {
    const g = fromBoard([[0, 2, 0, 0], ...Array.from({ length: 3 }, () => [0, 0, 0, 0])])
    const two = move(g, 'left', () => 0.5).tiles.find((t) => t.isNew)!
    const four = move(g, 'left', () => 0.95).tiles.find((t) => t.isNew)!
    expect(two.value).toBe(2)
    expect(four.value).toBe(4)
  })

  it('움직일 수 없는 방향이면 상태가 그대로이고 새 타일도 안 생긴다', () => {
    const g = fromBoard([
      [2, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    expect(move(g, 'left', first)).toBe(g)
    expect(move(g, 'up', first)).toBe(g)
  })

  it('원본 상태는 바뀌지 않는다', () => {
    const g = fromBoard([
      [2, 2, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    move(g, 'left', first)
    expect(toBoard(g.tiles)[0]).toEqual([2, 2, 0, 0])
    expect(g.score).toBe(0)
  })
})

describe('게임 종료', () => {
  const full = [
    [2, 4, 2, 4],
    [4, 2, 4, 2],
    [2, 4, 2, 4],
    [4, 2, 4, 2],
  ]

  it('칸이 가득 차고 합칠 수 있는 이웃이 없으면 종료다', () => {
    expect(isOver(fromBoard(full).tiles)).toBe(true)
    expect(fromBoard(full).over).toBe(true)
  })

  it('가득 차도 이웃한 같은 숫자가 있으면 계속할 수 있다', () => {
    const board = full.map((r) => [...r])
    board[0][1] = 2
    expect(isOver(fromBoard(board).tiles)).toBe(false)
  })

  it('빈 칸이 있으면 종료가 아니다', () => {
    const board = full.map((r) => [...r])
    board[3][3] = 0
    expect(fromBoard(board).over).toBe(false)
  })

  it('이동 직후 새 타일로 판이 가득 차 더 못 움직이면 종료로 표시된다', () => {
    const g = fromBoard([
      [4, 2, 4, 2],
      [2, 4, 2, 4],
      [4, 2, 4, 2],
      [4, 2, 4, 0],
    ])
    const next = move(g, 'right', first) // 마지막 줄이 밀리고 맨 앞 빈 칸에 2가 생김
    expect(toBoard(next.tiles)[3]).toEqual([2, 4, 2, 4])
    expect(next.over).toBe(true)
  })

  it('종료된 판에서는 움직이지 않는다', () => {
    const g = fromBoard(full)
    expect(move(g, 'left', first)).toBe(g)
  })
})

describe('2048 달성', () => {
  it('1024 두 개를 합치면 달성 표시가 켜지지만 게임은 계속된다', () => {
    const g = fromBoard([
      [1024, 1024, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ])
    const next = move(g, 'left', first)
    expect(next.reached).toBe(true)
    expect(next.over).toBe(false)
    expect(next.score).toBe(2048)
  })

  it('판 크기는 4x4다', () => {
    expect(SIZE).toBe(4)
  })
})
