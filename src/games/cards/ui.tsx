import { useDraggable, useDroppable } from '@dnd-kit/core'
import type { CSSProperties, ReactNode } from 'react'
import { isRed, type Card } from '../solitaire/logic'
import { CARD_H, CONTAINER, OFFSET_DOWN, OFFSET_UP, stackHeight } from './layout'

const SUIT_SYMBOL = { S: '♠', H: '♥', D: '♦', C: '♣' } as const
const RANK_LABEL = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

export function CardFace({ card, style }: { card: Card; style?: CSSProperties }) {
  if (!card.faceUp) {
    return (
      <div
        style={{
          ...style,
          height: `${CARD_H}cqw`,
          backgroundImage:
            'repeating-linear-gradient(45deg, rgba(255,255,255,0.18) 0 6cqw, transparent 6cqw 12cqw)',
        }}
        className="absolute left-0 w-full rounded-[8cqw] border border-blue-900 bg-blue-700 shadow-sm"
      />
    )
  }
  return (
    <div
      style={{ ...style, height: `${CARD_H}cqw` }}
      className={`absolute left-0 w-full select-none rounded-[8cqw] border border-slate-400 bg-white shadow-sm ${
        isRed(card) ? 'text-red-600' : 'text-slate-900'
      }`}
    >
      <span
        className="absolute left-[8cqw] top-[4cqw] font-bold leading-none"
        style={{ fontSize: '26cqw' }}
      >
        {RANK_LABEL[card.rank]}
        {SUIT_SYMBOL[card.suit]}
      </span>
      <span
        className="absolute bottom-[8cqw] right-[10cqw] leading-none"
        style={{ fontSize: '56cqw' }}
      >
        {SUIT_SYMBOL[card.suit]}
      </span>
    </div>
  )
}

export function InvalidMark() {
  return <div className="pointer-events-none absolute inset-0 rounded-[8cqw] bg-red-500/25" />
}

type DraggableProps<F> = {
  card: Card
  from: F
  style: CSSProperties
  hidden: boolean
  draggable?: boolean
  onTap: (card: Card, from: F) => void
}

export function DraggableCard<F>({
  card,
  from,
  style,
  hidden,
  draggable = card.faceUp,
  onTap,
}: DraggableProps<F>) {
  const { attributes, listeners, setNodeRef } = useDraggable({
    id: `card-${card.id}`,
    data: { from },
    disabled: !draggable,
  })
  return (
    <div
      ref={setNodeRef}
      data-card-id={card.id}
      {...(draggable ? listeners : {})}
      {...attributes}
      tabIndex={-1}
      onClick={() => onTap(card, from)}
      style={{ ...style, height: `${CARD_H}cqw`, opacity: hidden ? 0 : 1 }}
      className={`absolute left-0 w-full ${draggable ? 'touch-none' : ''}`}
    >
      <CardFace card={card} style={{ top: 0 }} />
    </div>
  )
}

type SlotProps = {
  id: string
  target?: unknown
  label?: string
  children?: ReactNode
  onClick?: () => void
  previewCard?: Card
  invalid?: boolean
}

// 카드 한 장 크기의 칸 (더미, 버린 더미, 위 칸 등). target이 있으면 카드를 놓을 수 있다.
export function Slot({ id, target, label, children, onClick, previewCard, invalid }: SlotProps) {
  const { setNodeRef } = useDroppable({ id, data: { target }, disabled: !target })
  return (
    <div ref={setNodeRef} className={`relative ${CONTAINER}`} onClick={onClick}>
      <div
        style={{ height: `${CARD_H}cqw` }}
        className="relative rounded-[8cqw] border-2 border-dashed border-slate-300"
      >
        {label && (
          <span
            className="absolute inset-0 flex items-center justify-center font-bold text-slate-300"
            style={{ fontSize: '40cqw' }}
          >
            {label}
          </span>
        )}
        {children}
        {previewCard && <CardFace card={previewCard} style={{ top: 0, opacity: 0.55 }} />}
        {invalid && <InvalidMark />}
      </div>
    </div>
  )
}

type ColumnProps<F> = {
  id: string
  target: unknown
  pile: Card[]
  hiddenIds: Set<number>
  makeFrom: (index: number) => F
  isDraggable?: (index: number) => boolean
  onTap: (card: Card, from: F) => void
  previewCards?: Card[]
  previewValid: boolean
}

// 아래로 카드가 겹쳐 쌓이는 줄. 카드를 놓을 수 있는 덱이다.
export function TableauColumn<F>({
  id,
  target,
  pile,
  hiddenIds,
  makeFrom,
  isDraggable,
  onTap,
  previewCards,
  previewValid,
}: ColumnProps<F>) {
  const { setNodeRef } = useDroppable({ id, data: { target } })
  // 각 카드의 세로 위치(cqw)를 앞 카드들의 간격을 누적해 미리 계산한다
  const landingTop = pile.length === 0 ? 0 : stackHeight(pile) - CARD_H + OFFSET_UP
  const tops = pile.map((_, i) =>
    pile.slice(0, i).reduce((sum, c) => sum + (c.faceUp ? OFFSET_UP : OFFSET_DOWN), 0),
  )
  return (
    <div ref={setNodeRef} className={CONTAINER}>
      <div
        className="relative"
        style={{ height: `${Math.max(stackHeight(pile), CARD_H) + 40}cqw` }}
      >
        {pile.length === 0 && (
          <div
            style={{ height: `${CARD_H}cqw` }}
            className="rounded-[8cqw] border-2 border-dashed border-slate-300"
          />
        )}
        {pile.map((card, index) => {
          const style = { top: `${tops[index]}cqw` }
          return card.faceUp ? (
            <DraggableCard
              key={card.id}
              card={card}
              from={makeFrom(index)}
              style={style}
              hidden={hiddenIds.has(card.id)}
              draggable={isDraggable ? isDraggable(index) : true}
              onTap={onTap}
            />
          ) : (
            <CardFace key={card.id} card={card} style={style} />
          )
        })}
        {previewCards && previewValid && (
          // 다음 카드가 놓일 자리부터 반투명으로 미리 보여 준다
          <>
            {previewCards.map((card, i) => (
              <CardFace
                key={`preview-${card.id}`}
                card={card}
                style={{ top: `${landingTop + i * OFFSET_UP}cqw`, opacity: 0.55 }}
              />
            ))}
          </>
        )}
        {previewCards && !previewValid && <InvalidMark />}
      </div>
    </div>
  )
}
