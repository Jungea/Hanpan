import {
  Anchor,
  Bell,
  Cloud,
  Crown,
  Flame,
  Gem,
  Heart,
  Leaf,
  Moon,
  Music,
  Star,
  Sun,
  type LucideIcon,
} from 'lucide-react'

// 모양과 색이 모두 달라서 색을 구분하기 어려운 사람도 모양으로 찾을 수 있다
export type CardSymbol = { name: string; Icon: LucideIcon; color: string; filled: boolean }

export const SYMBOLS: CardSymbol[] = [
  { name: '하트', Icon: Heart, color: 'text-red-500', filled: true },
  { name: '불꽃', Icon: Flame, color: 'text-orange-500', filled: true },
  { name: '해', Icon: Sun, color: 'text-yellow-400', filled: true },
  { name: '잎', Icon: Leaf, color: 'text-green-500', filled: true },
  { name: '보석', Icon: Gem, color: 'text-cyan-500', filled: true },
  { name: '구름', Icon: Cloud, color: 'text-sky-500', filled: true },
  { name: '닻', Icon: Anchor, color: 'text-blue-600', filled: false },
  { name: '달', Icon: Moon, color: 'text-indigo-500', filled: true },
  { name: '왕관', Icon: Crown, color: 'text-violet-500', filled: true },
  { name: '음표', Icon: Music, color: 'text-fuchsia-500', filled: false },
  { name: '별', Icon: Star, color: 'text-amber-500', filled: true },
  { name: '종', Icon: Bell, color: 'text-pink-500', filled: true },
]
