import { useState, useEffect, useRef, memo } from 'react'
import { useGameStore, useSetupStore, clearSave } from '../store/gameStore'
import { askKeeper } from '../api/keeper'
import { performCheck, CHECK_LABELS } from '../engine/check'
import { performSanCheck, applySanLoss } from '../engine/sanity'
import { performAttack, performDodge, WEAPONS } from '../engine/combat'

const UI = { IDLE: 'idle', LOADING: 'loading', CHECK: 'check', SAN: 'san', COMBAT: 'combat' }

// AI가 영어 기술명을 반환할 때 한글로 정규화
const SKILL_NAME_MAP = {
  'spot hidden': '발견', 'library use': '도서관사용', 'psychology': '심리학',
  'stealth': '은신', 'fast talk': '언변', 'persuade': '언변',
  'first aid': '응급처치', 'fighting': '근접전투', 'fighting (brawl)': '근접전투',
  'brawl': '근접전투', 'firearms (handgun)': '권총', 'handgun': '권총',
  'firearms (rifle)': '소총', 'rifle': '소총', 'cthulhu mythos': '크툴루신화',
  'law': '법률', 'history': '역사', 'credit rating': '신용',
  'language (other)': '언어(외국어)', 'photography': '사진술',
  'medicine': '의학', 'dodge': '회피',
}
const normalizeSkill = (name) => SKILL_NAME_MAP[name?.toLowerCase()] ?? name

export default function Game() {
  const {
    character, scenario, currentLocationId, revealedClues, log,
    sessionSANLoss, turnsPlayed, addLog, revealClue, applySanLoss: storeSanLoss, gameOver, moveLocation,
    escapeAvailable, setEscapeAvailable, reset,
  } = useGameStore()
  const apiKey = useSetupStore(s => s.apiKey)

  const [ui, setUi] = useState(UI.LOADING)
  const [messages, setMessages] = useState([])
  const [choices, setChoices] = useState([])
  const [pendingCheck, setPendingCheck] = useState(null)
  const [pendingSan, setPendingSan] = useState(null)
  const [freeInput, setFreeInput] = useState('')
  const [showSheet, setShowSheet] = useState(false)
  // 장소별 SAN 체크 발동 여부 추적 (JSON san_check.required 처리)
  const [checkedLocations, setCheckedLocations] = useState(new Set())
  // 직전 실패 기술 추적 (패널티 주사위 적용용)
  const [lastFailedSkill, setLastFailedSkill] = useState(null)

  const initialized = useRef(false)
  const logEndRef = useRef(null)

  const currentLocation = scenario.locations.find(l => l.id === currentLocationId)

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [log])

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true
    if (log.length <= 1) {
      callKeeper([{
        role: 'user',
        content: `[시작] 탐사자 ${character.name}(${character.occupation})이 ${currentLocation.name}에 도착했다.`,
      }])
    } else {
      setUi(UI.IDLE)
    }
  }, [])

  // ── 장소 진입 시 requires_check:false 단서 자동 공개 ───
  const autoRevealClues = (locationId) => {
    const loc = scenario.locations.find(l => l.id === locationId)
    const { revealedClues: current } = useGameStore.getState()
    const autoClues = loc?.clues?.filter(cl => !cl.requires_check && !current.includes(cl.id)) ?? []
    autoClues.forEach(cl => {
      revealClue(cl.id)
      addLog('system', `[발견] ${cl.text}`)
    })
  }

  // ── 장소 진입 시 JSON san_check 자동 발동 ──────────────
  const triggerLocationSanCheck = (locationId) => {
    if (checkedLocations.has(locationId)) return false
    const loc = scenario.locations.find(l => l.id === locationId)
    if (!loc?.san_check?.required) return false
    setCheckedLocations(prev => new Set([...prev, locationId]))
    setPendingSan({ loss: loc.san_check.loss, reason: loc.san_check.reason })
    return true
  }

  // ── 엔딩 조건 체크 ─────────────────────────────────────
  const checkEndings = (overrideLocationId = null) => {
    const { revealedClues: clues, turnsPlayed: turns, currentLocationId: locId, escapeAvailable: canEscape } = useGameStore.getState()
    const locToCheck = overrideLocationId ?? locId
    const conditions = scenario.ending?.conditions ?? []

    // 턴 제한
    const turnCond = conditions.find(c => c.type === 'turn_limit')
    if (turnCond && turns >= turnCond.max_turns) {
      addLog('system', scenario.ending.bad)
      gameOver('bad_ending')
      return true
    }

    // 단서 수집 → 탈출 가능 상태
    let currentEscape = canEscape
    if (!currentEscape) {
      const cluesCond = conditions.find(c => c.type === 'clues_collected')
      if (cluesCond?.required.every(id => clues.includes(id))) {
        setEscapeAvailable(true)
        currentEscape = true
        addLog('system', '[단서 확보] 충분한 단서를 손에 쥐었다. 이제 빠져나갈 수 있다.')
      }
    }

    // 탈출 가능 상태에서 출구 장소 도달 → 굿엔딩
    if (currentEscape) {
      const locCond = conditions.find(c => c.type === 'location_reached' && c.requires_state === 'escape_available')
      if (locCond && locToCheck === locCond.location_id) {
        addLog('system', scenario.ending.good)
        gameOver('good_ending')
        return true
      }
    }

    return false
  }

  // ── 키퍼 호출 (항상 최신 character를 가져옴) ──────────
  const callKeeper = async (nextMessages, context = null) => {
    setUi(UI.LOADING)
    // Zustand getState()로 stale closure 방지
    const freshCharacter = useGameStore.getState().character

    try {
      const response = await askKeeper({
        apiKey,
        scenario,
        character: freshCharacter,
        messages: nextMessages,
        context,
        currentLocation,
      })

      setMessages([...nextMessages, { role: 'assistant', content: response.narrative }])
      addLog('narrative', response.narrative)

      // 게임오버 체크 (최신 상태로)
      const { character: latestChar } = useGameStore.getState()
      if (!latestChar?.isAlive) { gameOver('death'); return }
      if (!latestChar?.isSane)  { gameOver('insanity'); return }

      // 장소 이동 처리
      let movedToId = null
      if (response.move_to) {
        const validLoc = scenario.locations.find(l => l.id === response.move_to)
        if (validLoc) {
          moveLocation(response.move_to)
          movedToId = response.move_to
          addLog('system', `[이동] ${validLoc.name}`)
          autoRevealClues(response.move_to)
          if (checkEndings(response.move_to)) return
        }
      }

      // 턴 제한 엔딩 체크 (이동 없을 때도)
      if (!movedToId && checkEndings()) return

      // 우선순위: 장소 JSON san_check → AI san_check → AI requires_check → 전투
      const activeLocationId = movedToId ?? currentLocationId
      if (triggerLocationSanCheck(activeLocationId)) {
        setChoices([])
        setUi(UI.SAN)
      } else if (response.san_check?.needed) {
        setPendingSan(response.san_check)
        setChoices([])
        setUi(UI.SAN)
      } else if (response.requires_check?.needed) {
        setPendingCheck({ ...response.requires_check, skill: normalizeSkill(response.requires_check.skill) })
        setChoices([])
        setUi(UI.CHECK)
      } else if (response.combat_start) {
        setChoices(response.choices ?? [])
        setUi(UI.COMBAT)
      } else {
        setChoices(response.choices ?? [])
        setUi(UI.IDLE)
      }
    } catch (e) {
      const msg = e.name === 'AbortError'
        ? '[타임아웃] 30초 안에 응답이 없었습니다. 다시 시도하세요.'
        : `[오류] ${e.message}`
      addLog('system', msg)
      setUi(UI.IDLE)
    }
  }

  const handleChoice = (choice) => {
    addLog('action', `> ${choice}`)
    const next = [...messages, { role: 'user', content: choice }]
    setMessages(next)
    callKeeper(next)
  }

  const handleFreeInput = () => {
    const text = freeInput.trim()
    if (!text) return
    setFreeInput('')
    handleChoice(text)
  }

  const handleRollCheck = () => {
    if (!pendingCheck) return
    const { character: c } = useGameStore.getState()
    const skillValue = c.skills?.[pendingCheck.skill] ?? 0
    const hasPenalty = lastFailedSkill === pendingCheck.skill
    const result = performCheck(skillValue, pendingCheck.difficulty, hasPenalty ? -1 : 0)
    const resultLabel = CHECK_LABELS[result.result]

    const penaltyTag = hasPenalty ? ' | 패널티' : ''
    const resultText = `[판정: ${pendingCheck.skill} ${skillValue}%${penaltyTag} | 굴림 ${result.rolled} → ${resultLabel}]`
    addLog('check', resultText)

    // 패널티 상태 업데이트: 실패 시 해당 기술 기록, 성공 시 초기화
    setLastFailedSkill(result.success ? null : pendingCheck.skill)

    let clueText = null
    if (result.success) {
      const loc = scenario.locations.find(l => l.id === currentLocationId)
      const unrevealed = loc?.clues?.filter(
        cl => !revealedClues.includes(cl.id) && cl.requires_check && cl.skill === pendingCheck.skill
      )
      if (unrevealed?.length > 0) {
        const clue = unrevealed[0]
        revealClue(clue.id)
        clueText = clue.text
        addLog('system', `[단서 발견] ${clue.text}`)
        if (clue.san_check?.required) {
          setPendingSan({ loss: clue.san_check.loss, reason: clue.san_check.reason })
        }
      }
    }

    const next = [...messages, {
      role: 'user',
      content: `${resultText}${clueText ? `\n[발견: ${clueText}]` : ''}`,
    }]
    setMessages(next)
    setPendingCheck(null)
    checkEndings()
    callKeeper(next, { lastCheckResult: { ...result, skill: pendingCheck.skill, resultLabel }, revealedClue: clueText })
  }

  const handleRollSan = () => {
    if (!pendingSan) return
    setLastFailedSkill(null)
    const { character: c, sessionSANLoss: sanLoss } = useGameStore.getState()
    const result = performSanCheck(c.SAN, pendingSan.loss)
    const updatedChar = applySanLoss(c, result.lossAmount, sanLoss)
    storeSanLoss(result.lossAmount, updatedChar)

    const sanText = `[SAN 체크: ${result.passed ? '성공' : '실패'} (${result.roll}) | SAN -${result.lossAmount} → ${updatedChar.SAN}]`
    addLog('san', sanText)

    if (!updatedChar.isSane) { gameOver('insanity'); return }
    if (updatedChar.temporaryInsanity && !c.temporaryInsanity) {
      addLog('system', `[일시적 광기] ${updatedChar.temporaryInsanity.description}`)
    }
    if (updatedChar.indefiniteInsanity && !c.indefiniteInsanity) {
      addLog('system', `[부정기 광기] ${updatedChar.indefiniteInsanity.description}`)
    }

    const next = [...messages, { role: 'user', content: sanText }]
    setMessages(next)
    setPendingSan(null)
    callKeeper(next, { sanCheckResult: { passed: result.passed, lossAmount: result.lossAmount, currentSAN: updatedChar.SAN } })
  }

  // ── 전투 액션 ────────────────────────────────────────────
  const handleCombatAttack = (weaponName) => {
    const { character: c } = useGameStore.getState()
    const weapon = WEAPONS[weaponName]
    const result = performAttack(c, weapon)
    const resultText = `[공격: ${weaponName} | ${CHECK_LABELS[result.result]} (${result.roll}) | 피해 ${result.damage}]`
    addLog('combat', resultText)
    const next = [...messages, { role: 'user', content: resultText }]
    setMessages(next)
    callKeeper(next, { combatResult: resultText })
  }

  const handleCombatDodge = () => {
    const { character: c } = useGameStore.getState()
    const result = performDodge(c)
    const resultText = `[회피 | ${CHECK_LABELS[result.result]} (${result.roll})]`
    addLog('combat', resultText)
    const next = [...messages, { role: 'user', content: resultText }]
    setMessages(next)
    callKeeper(next, { combatResult: resultText })
  }

  const hpPct  = Math.max(0, character.HP / character.maxHP * 100)
  const sanPct = Math.max(0, character.SAN / character.maxSAN * 100)

  return (
    <div className="min-h-screen bg-void flex flex-col max-w-lg mx-auto">

      {/* 상단 상태바 */}
      <div className="sticky top-0 z-10 bg-void border-b border-border px-4 py-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-dust">{character.name} · {character.occupation}</span>
          <div className="flex gap-2">
            <button onClick={() => { if (confirm('처음부터 시작하시겠습니까?')) { clearSave(); reset() } }}
              className="text-xs text-dust hover:text-blood transition-colors border border-border px-2 py-0.5">처음부터</button>
            <button onClick={() => setShowSheet(true)}
              className="text-xs text-dust hover:text-parchment transition-colors border border-border px-2 py-0.5">시트</button>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <StatBar label="HP" value={character.HP} max={character.maxHP} pct={hpPct} />
          <StatBar label="SAN" value={character.SAN} max={character.maxSAN} pct={sanPct} warn={sanPct < 30} />
        </div>
        <div className="flex gap-4 text-xs text-dust">
          <span>TURN <span className={`font-mono ${turnsPlayed >= (scenario.ending?.conditions?.find(c => c.type === 'turn_limit')?.max_turns ?? 999) * 0.8 ? 'text-blood' : 'text-parchment'}`}>{turnsPlayed}{scenario.ending?.conditions?.find(c => c.type === 'turn_limit')?.max_turns ? `/${scenario.ending?.conditions?.find(c => c.type === 'turn_limit')?.max_turns}` : ''}</span></span>
          <span>LUCK <span className="font-mono text-parchment">{character.LUCK}</span></span>
          <span>MP <span className="font-mono text-parchment">{character.MP}/{character.maxMP}</span></span>
          {character.indefiniteInsanity && (
            <span className="text-blood">⚠ {character.indefiniteInsanity.description.split('—')[0].trim()}</span>
          )}
        </div>
      </div>

      {/* 스토리 로그 — key를 timestamp로 고정, LogEntry는 memo */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {log.map((entry, i) => <LogEntry key={`${entry.timestamp}-${i}`} entry={entry} />)}
        {ui === UI.LOADING && <div className="text-dust text-sm animate-pulse">...</div>}
        <div ref={logEndRef} />
      </div>

      {/* 하단 액션 패널 */}
      <div className="sticky bottom-0 bg-void border-t border-border px-4 py-4 space-y-3">

        {ui === UI.IDLE && (
          <>
            {choices.length > 0 && (
              <div className="space-y-2">
                {choices.map((c, i) => (
                  <button key={i} onClick={() => handleChoice(c)}
                    className="w-full text-left text-sm border border-border px-4 py-2 text-dust hover:text-parchment hover:border-parchment/30 transition-colors">
                    {c}
                  </button>
                ))}
              </div>
            )}
            <FreeInput value={freeInput} onChange={setFreeInput} onSubmit={handleFreeInput} />
          </>
        )}

        {ui === UI.CHECK && pendingCheck && (
          <div className="space-y-3">
            <p className="text-sm text-dust">{pendingCheck.reason}</p>
            <div className="flex items-center justify-between bg-surface border border-border px-4 py-3">
              <div>
                <div className="text-xs text-dust tracking-widest uppercase flex items-center gap-2">
                  판정
                  {lastFailedSkill === pendingCheck.skill && (
                    <span className="text-blood">⚠ 패널티 주사위</span>
                  )}
                </div>
                <div className="text-parchment font-medium">{pendingCheck.skill}</div>
                <div className="font-mono text-blood text-sm">
                  {useGameStore.getState().character?.skills?.[pendingCheck.skill] ?? 0}%
                </div>
              </div>
              <button onClick={handleRollCheck}
                className="border border-blood text-blood px-6 py-2 text-sm hover:bg-blood hover:text-parchment transition-colors">
                주사위 굴리기
              </button>
            </div>
          </div>
        )}

        {ui === UI.SAN && pendingSan && (
          <div className="space-y-3">
            <p className="text-sm text-dust">{pendingSan.reason}</p>
            <div className="flex items-center justify-between bg-surface border border-border px-4 py-3">
              <div>
                <div className="text-xs text-dust tracking-widest uppercase">SAN 체크</div>
                <div className="font-mono text-blood">현재 SAN: {character.SAN}</div>
                <div className="text-xs text-dust">실패 시 {pendingSan.loss.fail} 손실</div>
              </div>
              <button onClick={handleRollSan}
                className="border border-blood text-blood px-6 py-2 text-sm hover:bg-blood hover:text-parchment transition-colors">
                굴리기
              </button>
            </div>
          </div>
        )}

        {ui === UI.COMBAT && (
          <div className="space-y-3">
            <div className="text-xs text-dust tracking-widest uppercase text-center">— 전투 —</div>
            <div className="grid grid-cols-2 gap-2">
              {Object.keys(WEAPONS).map(w => (
                <button key={w} onClick={() => handleCombatAttack(w)}
                  className="border border-border text-dust text-sm px-3 py-2 hover:border-parchment/30 hover:text-parchment transition-colors text-left">
                  ⚔ {w}
                </button>
              ))}
              <button onClick={handleCombatDodge}
                className="border border-border text-dust text-sm px-3 py-2 hover:border-parchment/30 hover:text-parchment transition-colors">
                회피
              </button>
              <button onClick={() => handleChoice('도주를 시도한다')}
                className="border border-border text-dust text-sm px-3 py-2 hover:border-parchment/30 hover:text-parchment transition-colors">
                도주
              </button>
            </div>
            <FreeInput value={freeInput} onChange={setFreeInput} onSubmit={handleFreeInput} placeholder="전투 중 행동..." />
          </div>
        )}

        {ui === UI.LOADING && (
          <div className="text-center text-dust text-sm py-2 tracking-widest">키퍼가 응답하고 있습니다...</div>
        )}

      </div>

      {showSheet && (
        <CharacterSheet character={character} revealedClues={revealedClues} scenario={scenario} onClose={() => setShowSheet(false)} />
      )}
    </div>
  )
}

// ── 서브 컴포넌트 ──────────────────────────────────────────

function FreeInput({ value, onChange, onSubmit, placeholder = '행동을 직접 입력...' }) {
  return (
    <div className="flex gap-2">
      <input type="text" value={value} onChange={e => onChange(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && onSubmit()} placeholder={placeholder}
        className="flex-1 bg-surface border border-border text-parchment text-sm px-3 py-2 outline-none focus:border-blood/60 placeholder:text-dust/30" />
      <button onClick={onSubmit} disabled={!value.trim()}
        className="border border-blood text-blood px-4 text-sm hover:bg-blood hover:text-parchment disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
        ↵
      </button>
    </div>
  )
}

function StatBar({ label, value, max, pct, warn }) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between text-xs">
        <span className="text-dust">{label}</span>
        <span className={`font-mono ${warn ? 'text-blood' : 'text-parchment'}`}>{value}/{max}</span>
      </div>
      <div className="h-1 bg-border rounded-full overflow-hidden">
        <div className={`h-full transition-all ${warn ? 'bg-blood' : 'bg-parchment/60'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// memo로 감싸서 부모 리렌더 시 불필요한 재렌더 방지
const LogEntry = memo(function LogEntry({ entry }) {
  const styles = {
    narrative: 'text-parchment text-sm leading-relaxed',
    action:    'text-dust text-sm italic',
    check:     'font-mono text-xs text-blood/80 bg-surface border-l-2 border-blood/40 px-3 py-1',
    san:       'font-mono text-xs text-blood bg-surface border-l-2 border-blood px-3 py-1',
    system:    'text-dust text-xs italic bg-surface border border-border/60 px-3 py-2 rounded-sm',
    combat:    'font-mono text-xs text-parchment/70 bg-surface border-l-2 border-parchment/20 px-3 py-1',
  }
  return <div className={styles[entry.type] ?? styles.narrative}>{entry.text}</div>
})

function CharacterSheet({ character, revealedClues, scenario, onClose }) {
  return (
    <div className="fixed inset-0 z-20 bg-void/95 overflow-y-auto">
      <div className="max-w-lg mx-auto px-4 py-6 space-y-5">
        <div className="flex items-center justify-between">
          <h2 className="text-parchment text-lg">{character.name}</h2>
          <button onClick={onClose} className="text-dust hover:text-parchment text-sm border border-border px-3 py-1">닫기</button>
        </div>
        <div className="text-dust text-xs">{character.occupation}</div>

        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          {Object.entries({ STR:'근력', CON:'체질', SIZ:'크기', DEX:'민첩', APP:'외모', INT:'지능', POW:'권력', EDU:'교육' }).map(([k, label]) => (
            <div key={k} className="bg-surface border border-border p-2">
              <div className="text-dust">{label}</div>
              <div className="font-mono text-parchment mt-0.5">{character.abilities[k]}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2 text-xs">
          {[['HP',`${character.HP}/${character.maxHP}`],['SAN',`${character.SAN}/${character.maxSAN}`],
            ['LUCK',character.LUCK],['MP',`${character.MP}/${character.maxMP}`],['DB',character.DB],['MOV',character.MOV]
          ].map(([k,v]) => (
            <div key={k} className="flex justify-between border-b border-border py-1 px-1">
              <span className="text-dust">{k}</span>
              <span className="font-mono text-parchment">{v}</span>
            </div>
          ))}
        </div>

        <div>
          <div className="text-dust text-xs tracking-widest uppercase mb-2">기술</div>
          <div className="space-y-1">
            {Object.entries(character.skills).map(([sk, val]) => (
              <div key={sk} className="flex justify-between text-xs">
                <span className="text-dust">{sk}</span>
                <span className="font-mono text-parchment">{val}%</span>
              </div>
            ))}
          </div>
        </div>

        {(character.temporaryInsanity || character.indefiniteInsanity) && (
          <div>
            <div className="text-blood text-xs tracking-widest uppercase mb-2">광기</div>
            {character.temporaryInsanity && <p className="text-sm text-parchment/80 mb-1">일시적: {character.temporaryInsanity.description}</p>}
            {character.indefiniteInsanity && <p className="text-sm text-parchment/80">부정기: {character.indefiniteInsanity.description}</p>}
          </div>
        )}

        {revealedClues.length > 0 && (
          <div>
            <div className="text-dust text-xs tracking-widest uppercase mb-2">발견한 단서</div>
            <div className="space-y-1">
              {scenario.locations.flatMap(l => l.clues ?? [])
                .filter(cl => revealedClues.includes(cl.id))
                .map(cl => (
                  <div key={cl.id} className="text-xs text-parchment/70 border-l-2 border-border px-3 py-1">{cl.text}</div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}