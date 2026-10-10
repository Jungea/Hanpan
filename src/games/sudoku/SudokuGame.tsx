import { Clock, Eraser, NotebookPen, Undo2 } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import {
  DIFFICULTIES,
  clearNotesAt,
  conflictSet,
  generatePuzzle,
  isSolved,
  toggleNote,
  type Difficulty,
} from './logic'

const now = () => Date.now()

const formatTime = (sec: number) =>
  `${String(Math.floor(sec / 60)).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`

export default function SudokuGame({ onGameOver }: GameProps) {
  const [difficulty, setDifficulty] = useState<Difficulty | null>(null)
  const [round, setRound] = useState(0)

  if (!difficulty) {
    return (
      <div className="mx-auto flex w-full max-w-110 flex-col gap-3">
        <p className="text-center font-medium">난이도를 선택하세요</p>
        {DIFFICULTIES.map((d) => (
          <button
            key={d.name}
            type="button"
            onClick={() => setDifficulty(d)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-left hover:bg-slate-100"
          >
            <span className="text-lg font-bold">{d.name}</span>
            <span className="ml-3 text-sm text-slate-500">단서 {d.clues}칸</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <Board
      key={`${difficulty.name}-${round}`}
      difficulty={difficulty}
      onGameOver={onGameOver}
      onRetry={() => setRound((r) => r + 1)}
      onChangeDifficulty={() => setDifficulty(null)}
    />
  )
}

type BoardProps = {
  difficulty: Difficulty
  onGameOver: GameProps['onGameOver']
  onRetry: () => void
  onChangeDifficulty: () => void
}

type Snapshot = { values: number[]; notes: Set<number>[] }

function Board({ difficulty, onGameOver, onRetry, onChangeDifficulty }: BoardProps) {
  const [puzzle] = useState<number[]>(() => generatePuzzle(difficulty))
  const [values, setValues] = useState<number[]>(() => [...puzzle])
  const [notes, setNotes] = useState<Set<number>[]>(() =>
    Array.from({ length: 81 }, () => new Set<number>()),
  )
  const [selected, setSelected] = useState<number | null>(null)
  const [noteMode, setNoteMode] = useState(false)
  const [elapsed, setElapsed] = useState(0)
  const startedAt = useRef<number | null>(null)
  const history = useRef<Snapshot[]>([])
  const wonRef = useRef(false)

  useEffect(() => {
    if (wonRef.current) return
    const id = window.setInterval(() => {
      if (startedAt.current !== null) setElapsed(Math.floor((now() - startedAt.current) / 1000))
    }, 500)
    return () => window.clearInterval(id)
  }, [])

  const pushHistory = () => {
    if (startedAt.current === null) startedAt.current = now()
    history.current.push({ values: [...values], notes: notes.map((s) => new Set(s)) })
  }

  const undo = () => {
    const last = history.current.pop()
    if (!last) return
    setValues(last.values)
    setNotes(last.notes)
  }

  const finish = (nextValues: number[]) => {
    if (!isSolved(nextValues) || wonRef.current) return
    wonRef.current = true
    const sec = Math.max(1, Math.floor((now() - (startedAt.current ?? now())) / 1000))
    setElapsed(sec)
    onGameOver({ score: sec, variant: difficulty.name })
  }

  const inputDigit = (digit: number) => {
    if (selected === null || puzzle[selected] !== 0 || wonRef.current) return
    pushHistory()
    if (noteMode) {
      setNotes((ns) => toggleNote(ns, selected, digit))
      return
    }
    const next = [...values]
    next[selected] = digit
    setValues(next)
    setNotes((ns) => clearNotesAt(ns, selected))
    finish(next)
  }

  const erase = () => {
    if (selected === null || puzzle[selected] !== 0) return
    pushHistory()
    setValues((vs) => {
      const next = [...vs]
      next[selected] = 0
      return next
    })
    setNotes((ns) => clearNotesAt(ns, selected))
  }

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '1' && e.key <= '9') inputDigit(Number(e.key))
      else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') erase()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  const conflicts = conflictSet(values)
  const selRow = selected === null ? -1 : Math.floor(selected / 9)
  const selCol = selected === null ? -1 : selected % 9
  const selBox = selected === null ? -1 : Math.floor(selRow / 3) * 3 + Math.floor(selCol / 3)

  return (
    <div className="mx-auto flex w-full max-w-110 flex-col items-center gap-3">
      <div className="flex w-full items-center justify-between text-lg font-semibold tabular-nums">
        <span>{difficulty.name}</span>
        <span className="inline-flex items-center gap-1">
          <Clock size={18} />
          {formatTime(elapsed)}
        </span>
      </div>

      <div className="grid w-full grid-cols-9 gap-0 border-2 border-slate-700 bg-slate-700">
        {values.map((value, i) => {
          const r = Math.floor(i / 9)
          const c = i % 9
          const b = Math.floor(r / 3) * 3 + Math.floor(c / 3)
          const isGiven = puzzle[i] !== 0
          const isSelected = i === selected
          const isPeer = r === selRow || c === selCol || b === selBox
          const hasConflict = conflicts.has(i)

          return (
            <button
              key={i}
              type="button"
              onClick={() => setSelected(i)}
              aria-label={`${r + 1}행 ${c + 1}열${value ? `, ${value}` : ''}`}
              style={{
                borderRight: c % 3 === 2 && c !== 8 ? '2px solid #334155' : undefined,
                borderBottom: r % 3 === 2 && r !== 8 ? '2px solid #334155' : undefined,
              }}
              className={`relative flex aspect-square items-center justify-center text-lg font-semibold ${
                isSelected
                  ? 'bg-sky-200'
                  : isPeer
                    ? 'bg-sky-50'
                    : 'bg-white'
              } ${hasConflict ? 'text-red-600' : isGiven ? 'text-slate-900' : 'text-sky-700'}`}
            >
              {value !== 0 ? (
                value
              ) : notes[i].size > 0 ? (
                <span className="grid h-full w-full grid-cols-3 grid-rows-3 p-0.5 text-[0.55rem] font-normal text-slate-400">
                  {Array.from({ length: 9 }, (_, d) => (
                    <span key={d} className="flex items-center justify-center">
                      {notes[i].has(d + 1) ? d + 1 : ''}
                    </span>
                  ))}
                </span>
              ) : null}
            </button>
          )
        })}
      </div>

      <div className="grid w-full grid-cols-9 gap-1">
        {Array.from({ length: 9 }, (_, i) => i + 1).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => inputDigit(d)}
            className="rounded-lg border border-slate-300 bg-white py-2 text-lg font-semibold"
          >
            {d}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setNoteMode((v) => !v)}
          aria-pressed={noteMode}
          className={`inline-flex items-center gap-1 rounded-lg border px-4 py-2 text-sm font-semibold ${
            noteMode ? 'border-sky-500 bg-sky-100 text-sky-700' : 'border-slate-300 bg-white'
          }`}
        >
          <NotebookPen size={16} />
          메모
        </button>
        <button
          type="button"
          onClick={erase}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          <Eraser size={16} />
          지우기
        </button>
        <button
          type="button"
          onClick={undo}
          className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          <Undo2 size={16} />
          되돌리기
        </button>
      </div>

      <div className="flex gap-2 pt-1">
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
        >
          다시하기
        </button>
        <button
          type="button"
          onClick={onChangeDifficulty}
          className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
        >
          난이도 변경
        </button>
      </div>
    </div>
  )
}
