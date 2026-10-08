import type { CollisionDetection } from '@dnd-kit/core'
import type { Card } from '../solitaire/logic'

// 카드 폭(컨테이너 폭)을 100으로 보는 cqw 단위로 크기를 맞춘다. 솔리테어 계열 게임이 함께 쓴다.
export const CARD_H = 140 // 카드 폭 100 기준 높이
export const OFFSET_DOWN = 16
export const OFFSET_UP = 34
export const DOUBLE_TAP_MS = 300
export const MAX_HISTORY = 200
export const CONTAINER = '[container-type:inline-size]'

export const now = () => Date.now()

export const formatTime = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

// 끌고 있는 카드에서 가장 가까운 덱 하나를 고른다 (카드 한 장 폭보다 멀면 없음)
export const nearestDeck: CollisionDetection = ({
  collisionRect,
  droppableRects,
  droppableContainers,
}) => {
  const px = collisionRect.left + collisionRect.width / 2
  const py = collisionRect.top + collisionRect.width * (CARD_H / 200)
  let best: { id: (typeof droppableContainers)[number]['id']; dist: number } | null = null
  for (const container of droppableContainers) {
    const r = droppableRects.get(container.id)
    if (!r) continue
    const dx = Math.max(r.left - px, 0, px - r.right)
    const dy = Math.max(r.top - py, 0, py - r.bottom)
    const dist = Math.hypot(dx, dy)
    if (!best || dist < best.dist) best = { id: container.id, dist }
  }
  return best && best.dist <= collisionRect.width ? [{ id: best.id }] : []
}

export function stackHeight(cards: Card[]): number {
  if (cards.length === 0) return CARD_H
  const offsets = cards
    .slice(0, -1)
    .reduce((sum, c) => sum + (c.faceUp ? OFFSET_UP : OFFSET_DOWN), 0)
  return CARD_H + offsets
}
