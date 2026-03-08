import { useState, useMemo, useRef } from 'react'
import { rollAbilities, calcDerived, getBaseSkills, OCCUPATIONS, buildCharacter } from '../engine/character'
import { useGameStore, useSetupStore } from '../store/gameStore'

const STAT_LABELS = { STR:'근력', CON:'체질', SIZ:'크기', DEX:'민첩', APP:'외모', INT:'지능', POW:'권력', EDU:'교육' }

export default function CharacterCreate() {
  const startGame = useGameStore(s => s.startGame)
  const selectedScenario = useSetupStore(s => s.selectedScenario)

  const [step, setStep] = useState(1)
  const [rerollsLeft, setRerollsLeft] = useState(3)
  const [abilities, setAbilities] = useState(() => rollAbilities())
  const [occupation, setOccupation] = useState(null)
  const [occAlloc, setOccAlloc] = useState({})
  const [intAlloc, setIntAlloc] = useState({})
  const [name, setName] = useState('')

  const derived = useMemo(() => calcDerived(abilities), [abilities])
  const baseSkills = useMemo(() => getBaseSkills(abilities), [abilities])
  const occSkillNames = occupation ? OCCUPATIONS[occupation].skills : []

  const occPoints = abilities.EDU * 4
  const intPoints = abilities.INT * 2
  const totalOccUsed = occSkillNames.reduce((s, sk) => s + (occAlloc[sk] ?? 0), 0)
  const totalIntUsed = Object.values(intAlloc).reduce((s, v) => s + v, 0)
  const occLeft = occPoints - totalOccUsed
  const intLeft = intPoints - totalIntUsed

  const getSkillValue = (sk) => (baseSkills[sk] ?? 0) + (occAlloc[sk] ?? 0) + (intAlloc[sk] ?? 0)

  const adjustOcc = (sk, delta) => {
    const current = occAlloc[sk] ?? 0
    const newExtra = current + delta
    if (newExtra < 0) return
    if (delta > 0 && occLeft < delta) return
    if ((baseSkills[sk] ?? 0) + newExtra > 90) return
    setOccAlloc(a => ({ ...a, [sk]: newExtra }))
  }

  const adjustInt = (sk, delta) => {
    const current = intAlloc[sk] ?? 0
    const newExtra = current + delta
    if (newExtra < 0) return
    if (delta > 0 && intLeft < delta) return
    if (getSkillValue(sk) + delta > 90) return
    setIntAlloc(a => ({ ...a, [sk]: newExtra }))
  }

  const setOcc = (sk, targetValue) => {
    const b = baseSkills[sk] ?? 0
    const currentAlloc = occAlloc[sk] ?? 0
    const maxAlloc = Math.min(currentAlloc + occLeft, 90 - b)
    const newAlloc = Math.max(0, Math.min(targetValue - b, maxAlloc))
    setOccAlloc(a => ({ ...a, [sk]: newAlloc }))
  }

  const setInt = (sk, targetValue) => {
    const minVal = (baseSkills[sk] ?? 0) + (occAlloc[sk] ?? 0)
    const currentAlloc = intAlloc[sk] ?? 0
    const maxAlloc = Math.min(currentAlloc + intLeft, 90 - minVal)
    const newAlloc = Math.max(0, Math.min(targetValue - minVal, maxAlloc))
    setIntAlloc(a => ({ ...a, [sk]: newAlloc }))
  }

  const handleReroll = () => {
    if (rerollsLeft <= 0) return
    const next = rollAbilities()
    setAbilities(next)
    setRerollsLeft(r => r - 1)
  }

  const handleOccupationSelect = (occ) => {
    setOccupation(occ)
    setOccAlloc({})
    setIntAlloc({})
  }

  const handleStart = () => {
    if (!name.trim()) return
    const finalSkills = {}
    Object.keys(baseSkills).forEach(sk => { finalSkills[sk] = getSkillValue(sk) })
    const character = buildCharacter({ name: name.trim(), abilities, occupation, skills: finalSkills })
    startGame(selectedScenario, character)
  }

  return (
    <div className="min-h-screen bg-void text-parchment">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-6">

        <div className="flex items-center justify-between">
          <h2 className="text-xs text-dust tracking-widest uppercase">탐사자 생성</h2>
          <div className="flex gap-2">
            {[1,2,3,4,5].map(n => (
              <div key={n} className={`w-1.5 h-1.5 rounded-full ${n <= step ? 'bg-blood' : 'bg-border'}`} />
            ))}
          </div>
        </div>

        {/* Step 1: 능력치 */}
        {step === 1 && (
          <div className="space-y-5">
            <h3 className="text-lg">능력치 굴림</h3>
            <div className="grid grid-cols-4 gap-2">
              {Object.entries(STAT_LABELS).map(([key, label]) => (
                <div key={key} className="bg-surface border border-border p-2 text-center">
                  <div className="text-dust text-xs">{label}</div>
                  <div className="text-parchment text-lg font-bold mt-0.5">{abilities[key]}</div>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {[['HP', derived.HP], ['MP', derived.MP], ['SAN', derived.SAN], ['LUCK', abilities.LUCK], ['DB', derived.DB], ['MOV', derived.MOV]].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-border py-1">
                  <span className="text-dust">{k}</span>
                  <span className="font-mono text-parchment">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between">
              <button onClick={handleReroll} disabled={rerollsLeft <= 0}
                className="text-sm border border-border px-4 py-2 text-dust hover:text-parchment hover:border-parchment/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                전체 재굴림 ({rerollsLeft}회 남음)
              </button>
              <button onClick={() => setStep(2)}
                className="text-sm border border-blood px-6 py-2 text-blood hover:bg-blood hover:text-parchment transition-colors">
                확정 →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: 직업 */}
        {step === 2 && (
          <div className="space-y-5">
            <h3 className="text-lg">직업 선택</h3>
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(OCCUPATIONS).map(([key, occ]) => (
                <button key={key} onClick={() => handleOccupationSelect(key)}
                  className={`text-left p-3 border transition-colors ${
                    occupation === key
                      ? 'border-blood bg-blood/10 text-parchment'
                      : 'border-border text-dust hover:border-parchment/30 hover:text-parchment'
                  }`}>
                  <div className="text-parchment font-medium text-sm">{occ.label}</div>
                  <div className="text-xs text-dust mt-1 leading-relaxed">{occ.skills.join(' · ')}</div>
                </button>
              ))}
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(1)} className="text-sm text-dust hover:text-parchment px-4 py-2">← 이전</button>
              <button onClick={() => setStep(3)} disabled={!occupation}
                className="text-sm border border-blood px-6 py-2 text-blood hover:bg-blood hover:text-parchment disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                다음 →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: 직업 포인트 */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg">직업 포인트 배분</h3>
              <span className="font-mono text-blood text-sm">{occLeft} / {occPoints}</span>
            </div>
            <p className="text-dust text-xs">EDU({abilities.EDU}) × 4 = {occPoints}pt · 직업 기술에만 배분</p>
            <div className="space-y-2">
              {occSkillNames.map(sk => (
                <SkillRow key={sk} name={sk} value={getSkillValue(sk)} base={baseSkills[sk]}
                  onMinus={() => adjustOcc(sk, -1)} onPlus={() => adjustOcc(sk, 1)}
                  canPlus={occLeft > 0 && getSkillValue(sk) < 90} canMinus={(occAlloc[sk] ?? 0) > 0}
                  onSet={v => setOcc(sk, v)} />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <button onClick={() => setStep(2)} className="text-sm text-dust hover:text-parchment px-4 py-2">← 이전</button>
              {occLeft > 0
                ? <button onClick={() => { if (window.confirm(`직업 포인트 ${occLeft}pt가 남아 있습니다. 그냥 넘어가시겠습니까?`)) setStep(4) }}
                    className="text-sm border border-dust px-6 py-2 text-dust hover:text-parchment hover:border-parchment/30 transition-colors">다음 →</button>
                : <button onClick={() => setStep(4)} className="text-sm border border-blood px-6 py-2 text-blood hover:bg-blood hover:text-parchment transition-colors">다음 →</button>
              }
            </div>
          </div>
        )}

        {/* Step 4: 개인관심 포인트 */}
        {step === 4 && (
          <div className="space-y-5">
            <div className="flex items-baseline justify-between">
              <h3 className="text-lg">개인관심 포인트</h3>
              <span className="font-mono text-blood text-sm">{intLeft} / {intPoints}</span>
            </div>
            <p className="text-dust text-xs">INT({abilities.INT}) × 2 = {intPoints}pt · 모든 기술에 배분 가능</p>
            <div className="space-y-2">
              {Object.keys(baseSkills).map(sk => (
                <SkillRow key={sk} name={sk} value={getSkillValue(sk)} base={baseSkills[sk]}
                  onMinus={() => adjustInt(sk, -1)} onPlus={() => adjustInt(sk, 1)}
                  canPlus={intLeft > 0 && getSkillValue(sk) < 90} canMinus={(intAlloc[sk] ?? 0) > 0}
                  onSet={v => setInt(sk, v)} />
              ))}
            </div>
            <div className="flex justify-between items-center">
              <button onClick={() => setStep(3)} className="text-sm text-dust hover:text-parchment px-4 py-2">← 이전</button>
              {intLeft > 0
                ? <button onClick={() => { if (window.confirm(`개인관심 포인트 ${intLeft}pt가 남아 있습니다. 그냥 넘어가시겠습니까?`)) setStep(5) }}
                    className="text-sm border border-dust px-6 py-2 text-dust hover:text-parchment hover:border-parchment/30 transition-colors">다음 →</button>
                : <button onClick={() => setStep(5)} className="text-sm border border-blood px-6 py-2 text-blood hover:bg-blood hover:text-parchment transition-colors">다음 →</button>
              }
            </div>
          </div>
        )}

        {/* Step 5: 확인 */}
        {step === 5 && (
          <div className="space-y-5">
            <h3 className="text-lg">탐사자 확인</h3>
            <div className="space-y-2">
              <label className="block text-dust text-xs tracking-widest uppercase">이름</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)}
                placeholder="탐사자 이름을 입력하세요" maxLength={20}
                className="w-full bg-surface border border-border text-parchment px-4 py-3 text-sm outline-none focus:border-blood placeholder:text-dust/40" />
            </div>
            <div className="bg-surface border border-border p-4 space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-dust">직업</span><span>{occupation}</span>
              </div>
              <div className="grid grid-cols-4 gap-1 text-xs">
                {Object.entries(STAT_LABELS).map(([k, label]) => (
                  <div key={k} className="text-center">
                    <div className="text-dust">{label}</div>
                    <div className="font-mono">{abilities[k]}</div>
                  </div>
                ))}
              </div>
              <div className="border-t border-border pt-2 space-y-1">
                {Object.keys(baseSkills).map(sk => (
                  <div key={sk} className="flex justify-between text-xs">
                    <span className={occSkillNames.includes(sk) ? 'text-parchment' : 'text-dust'}>{sk}</span>
                    <span className="font-mono">{getSkillValue(sk)}%</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex justify-between">
              <button onClick={() => setStep(4)} className="text-sm text-dust hover:text-parchment px-4 py-2">← 이전</button>
              <button onClick={handleStart} disabled={!name.trim()}
                className="text-sm border border-blood px-8 py-3 text-blood hover:bg-blood hover:text-parchment disabled:opacity-30 disabled:cursor-not-allowed transition-colors tracking-widest uppercase">
                게임 시작
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

function SkillRow({ name, value, base, onMinus, onPlus, canPlus, canMinus, onSet }) {
  const plusTimer = useRef(null)
  const minusTimer = useRef(null)
  const [editing, setEditing] = useState(false)
  const [inputVal, setInputVal] = useState('')

  const startPress = (fn, timerRef) => {
    fn()
    timerRef.current = setTimeout(() => {
      timerRef.current = setInterval(fn, 80)
    }, 400)
  }
  const stopPress = (timerRef) => {
    clearTimeout(timerRef.current)
    clearInterval(timerRef.current)
    timerRef.current = null
  }

  const commitInput = () => {
    const parsed = parseInt(inputVal, 10)
    if (!isNaN(parsed) && onSet) onSet(parsed)
    setEditing(false)
  }

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-dust w-24 shrink-0">{name}</span>
      <div className="flex-1 h-px bg-border" />
      <span className="font-mono text-xs text-dust w-8 text-right">{base}%</span>
      <span className="text-dust/40 text-xs">→</span>
      <button
        onMouseDown={() => { if (canMinus) startPress(onMinus, minusTimer) }}
        onMouseUp={() => stopPress(minusTimer)}
        onMouseLeave={() => stopPress(minusTimer)}
        onTouchStart={e => { e.preventDefault(); if (canMinus) startPress(onMinus, minusTimer) }}
        onTouchEnd={() => stopPress(minusTimer)}
        disabled={!canMinus}
        className="w-6 h-6 text-xs text-dust hover:text-parchment disabled:opacity-20 disabled:cursor-not-allowed border border-border hover:border-parchment/30 transition-colors select-none">−</button>
      {editing ? (
        <input
          type="number"
          value={inputVal}
          onChange={e => setInputVal(e.target.value)}
          onBlur={commitInput}
          onKeyDown={e => { if (e.key === 'Enter') commitInput(); if (e.key === 'Escape') setEditing(false) }}
          autoFocus
          className="font-mono text-sm text-blood w-12 text-center bg-transparent border-b border-blood outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        />
      ) : (
        <span
          onClick={() => { setEditing(true); setInputVal(String(value)) }}
          className="font-mono text-sm text-parchment w-12 text-center cursor-text hover:text-blood transition-colors">
          {value}%
        </span>
      )}
      <button
        onMouseDown={() => { if (canPlus) startPress(onPlus, plusTimer) }}
        onMouseUp={() => stopPress(plusTimer)}
        onMouseLeave={() => stopPress(plusTimer)}
        onTouchStart={e => { e.preventDefault(); if (canPlus) startPress(onPlus, plusTimer) }}
        onTouchEnd={() => stopPress(plusTimer)}
        disabled={!canPlus}
        className="w-6 h-6 text-xs text-dust hover:text-parchment disabled:opacity-20 disabled:cursor-not-allowed border border-border hover:border-parchment/30 transition-colors select-none">+</button>
    </div>
  )
}
