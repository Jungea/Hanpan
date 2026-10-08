import { Delete } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { GameProps } from '../types'
import {
  LEVELS,
  describe,
  generateSecret,
  isCorrect,
  isOut,
  judge,
  validateGuess,
  type GuessError,
  type Judgement,
  type Level,
} from './logic'

type Guess = { value: string; result: Judgement }

const OUT_DIGIT_MESSAGE = '아웃이 나온 숫자예요'

const ERROR_MESSAGE: Record<GuessError, string> = {
  length: '숫자를 모두 입력하세요',
  duplicate: '같은 숫자는 한 번만 쓸 수 있어요',
  format: '숫자만 입력할 수 있어요',
}

export default function BaseballGame({ onGameOver }: GameProps) {
  const [level, setLevel] = useState<Level | null>(null)
  const [round, setRound] = useState(0)

  if (!level) {
    return (
      <div className="mx-auto flex w-full max-w-110 flex-col gap-3">
        <p className="text-center font-medium">자릿수를 선택하세요</p>
        {LEVELS.map((l) => (
          <button
            key={l.name}
            type="button"
            onClick={() => setLevel(l)}
            className="rounded-xl border border-slate-300 bg-white px-4 py-4 text-left hover:bg-slate-100"
          >
            <span className="text-lg font-bold">{l.name}</span>
            <span className="ml-3 text-sm text-slate-500">{l.maxTries}번 안에 맞히기</span>
          </button>
        ))}
      </div>
    )
  }

  return (
    <Field
      key={`${level.name}-${round}`}
      level={level}
      onGameOver={onGameOver}
      onRetry={() => setRound((r) => r + 1)}
      onChangeLevel={() => setLevel(null)}
    />
  )
}

type FieldProps = {
  level: Level
  onGameOver: GameProps['onGameOver']
  onRetry: () => void
  onChangeLevel: () => void
}

function Field({ level, onGameOver, onRetry, onChangeLevel }: FieldProps) {
  const { digits, maxTries, name } = level
  const [secret] = useState(() => generateSecret(digits))
  const [guesses, setGuesses] = useState<Guess[]>([])
  const [input, setInput] = useState('')
  const [notice, setNotice] = useState('')
  const [lockOut, setLockOut] = useState(true)
  const listRef = useRef<HTMLOListElement>(null)

  const won = guesses.some((g) => isCorrect(g.result, digits))
  const lost = !won && guesses.length >= maxTries
  const finished = won || lost

  // 아웃이 나온 추측의 숫자는 정답에 없다는 게 확실하다
  const outDigits = new Set(guesses.filter((g) => isOut(g.result)).flatMap((g) => [...g.value]))
  const isLocked = (d: string) => lockOut && outDigits.has(d)

  useEffect(() => {
    if (!notice) return
    const id = window.setTimeout(() => setNotice(''), 2000)
    return () => window.clearTimeout(id)
  }, [notice])

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight })
  }, [guesses.length])

  const addDigit = (d: string) => {
    if (finished || input.length >= digits) return
    if (isLocked(d)) return setNotice(OUT_DIGIT_MESSAGE)
    if (input.includes(d)) return setNotice(ERROR_MESSAGE.duplicate)
    setInput(input + d)
  }

  const removeDigit = () => setInput(input.slice(0, -1))

  const submit = () => {
    if (finished) return
    const error = validateGuess(input, digits)
    if (error) return setNotice(ERROR_MESSAGE[error])
    const result = judge(secret, input)
    setGuesses([...guesses, { value: input, result }])
    setInput('')
    if (isCorrect(result, digits)) onGameOver({ score: guesses.length + 1, variant: name })
  }

  // 키보드: 숫자 입력, Backspace 지우기, Enter 확인
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (/^\d$/.test(e.key)) addDigit(e.key)
      else if (e.key === 'Backspace') removeDigit()
      else if (e.key === 'Enter') submit()
      else return
      e.preventDefault()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  })

  return (
    <div className="mx-auto flex w-full max-w-110 flex-col gap-3">
      <div className="flex items-center justify-between text-lg font-semibold tabular-nums">
        <span>
          {guesses.length} / {maxTries}번
        </span>
        <span className="text-sm font-normal text-slate-500">중복 없는 {digits}자리 숫자</span>
      </div>

      <ol
        ref={listRef}
        aria-label="지금까지의 추측"
        className="flex h-64 flex-col gap-1.5 overflow-y-auto rounded-xl border border-slate-200 bg-white p-3"
      >
        {guesses.length === 0 && (
          <li className="m-auto text-sm text-slate-400">숫자를 입력해서 맞혀 보세요</li>
        )}
        {guesses.map((g, i) => (
          <li key={i} className="flex items-center gap-3">
            <span className="w-6 text-right text-sm text-slate-400 tabular-nums">{i + 1}</span>
            <span className="flex gap-1">
              {[...g.value].map((d, k) => (
                <span
                  key={k}
                  className="flex h-9 w-9 items-center justify-center rounded-lg bg-slate-100 text-lg font-bold"
                >
                  {d}
                </span>
              ))}
            </span>
            <span
              className={`ml-auto rounded-full px-3 py-1 text-sm font-semibold ${
                isOut(g.result)
                  ? 'bg-slate-200 text-slate-600'
                  : isCorrect(g.result, digits)
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-100 text-amber-800'
              }`}
            >
              {describe(g.result)}
            </span>
          </li>
        ))}
      </ol>

      {finished ? (
        <div className="flex flex-col items-center gap-3 py-2">
          {lost && (
            <p className="text-center font-semibold text-red-600">
              기회를 모두 썼어요. 정답은{' '}
              <span className="tabular-nums tracking-widest">{secret}</span>
            </p>
          )}
          {lost && (
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onRetry}
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white"
              >
                다시하기
              </button>
              <button
                type="button"
                onClick={onChangeLevel}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"
              >
                자릿수 변경
              </button>
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="flex justify-center gap-2" aria-label="입력한 숫자">
            {Array.from({ length: digits }, (_, i) => (
              <span
                key={i}
                className={`flex h-12 w-12 items-center justify-center rounded-xl border-2 text-2xl font-bold ${
                  i === input.length ? 'border-slate-900' : 'border-slate-300'
                } bg-white`}
              >
                {input[i] ?? ''}
              </span>
            ))}
          </div>
          <p className="min-h-5 text-center text-sm text-red-600" role="status">
            {notice}
          </p>
          <label className="flex cursor-pointer items-center justify-end gap-2 text-sm text-slate-600">
            아웃 숫자 비활성화
            <button
              type="button"
              role="switch"
              aria-checked={lockOut}
              onClick={() => setLockOut(!lockOut)}
              className={`relative h-6 w-11 rounded-full transition-colors ${
                lockOut ? 'bg-slate-900' : 'bg-slate-300'
              }`}
            >
              <span
                className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
                  lockOut ? 'translate-x-5' : ''
                }`}
              />
            </button>
          </label>
          <div className="grid grid-cols-3 gap-2">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((d) => (
              <KeyButton
                key={d}
                onClick={() => addDigit(d)}
                dim={input.includes(d)}
                locked={isLocked(d)}
              >
                {d}
              </KeyButton>
            ))}
            <KeyButton onClick={removeDigit} label="지우기">
              <Delete size={22} />
            </KeyButton>
            <KeyButton
              onClick={() => addDigit('0')}
              dim={input.includes('0')}
              locked={isLocked('0')}
            >
              0
            </KeyButton>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={submit}
              className="rounded-xl bg-slate-900 py-3 text-lg font-bold text-white"
            >
              확인
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function KeyButton({
  children,
  onClick,
  dim,
  locked,
  label,
}: {
  children: React.ReactNode
  onClick: () => void
  dim?: boolean
  locked?: boolean
  label?: string
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-label={label}
      disabled={locked}
      className={`flex touch-manipulation items-center justify-center rounded-xl border py-3 text-xl font-bold ${
        locked
          ? 'border-slate-400 bg-slate-400 text-slate-500'
          : `border-slate-300 bg-white active:bg-slate-200 ${dim ? 'opacity-40' : ''}`
      }`}
    >
      {children}
    </button>
  )
}
