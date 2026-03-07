import { useState } from 'react'
import { useSetupStore, loadHistory } from '../store/gameStore'
import testScenario from '../data/scenarios/test_scenario.json'
import testScenario2 from '../data/scenarios/test_scenario2.json'

const SCENARIOS = [testScenario, testScenario2]

// API 키 유효성 검증 (최소 호출)
async function verifyApiKey(key) {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), 10000)
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 1,
        messages: [{ role: 'user', content: '.' }],
      }),
    })
    if (res.ok) return { ok: true }
    const err = await res.json().catch(() => ({}))
    const msg = err.error?.message ?? ''
    if (res.status === 401) return { ok: false, msg: '잘못된 API 키입니다.' }
    if (res.status === 429) return { ok: false, msg: '요청 한도 초과. 잠시 후 다시 시도하세요.' }
    return { ok: false, msg: msg || `오류 ${res.status}` }
  } catch (e) {
    if (e.name === 'AbortError') return { ok: false, msg: '응답 시간 초과. 다시 시도하세요.' }
    return { ok: false, msg: '네트워크 오류. 연결을 확인하세요.' }
  } finally {
    clearTimeout(timeoutId)
  }
}

export default function ApiSetup({ hasSave }) {
  const { setApiKey, setSelectedScenario } = useSetupStore()
  const [inputKey, setInputKey]     = useState('')
  const [selected, setSelected]     = useState(null)
  const [verifyState, setVerifyState] = useState('idle') // 'idle' | 'loading' | 'ok' | 'error'
  const [verifyMsg, setVerifyMsg]   = useState('')
  const [history]                   = useState(() => loadHistory())

  const canVerify = inputKey.trim().length > 0 && verifyState !== 'loading'
  const canStart  = verifyState === 'ok' && selected

  const handleKeyChange = (val) => {
    setInputKey(val)
    // 키 바뀌면 검증 상태 리셋
    if (verifyState !== 'idle') setVerifyState('idle')
  }

  const handleVerify = async () => {
    if (!canVerify) return
    setVerifyState('loading')
    setVerifyMsg('')
    const result = await verifyApiKey(inputKey.trim())
    if (result.ok) {
      setVerifyState('ok')
    } else {
      setVerifyState('error')
      setVerifyMsg(result.msg)
    }
  }

  const handleStart = () => {
    if (!canStart) return
    setApiKey(inputKey.trim())
    setSelectedScenario(selected)
  }

  return (
    <div className="min-h-screen bg-void flex items-center justify-center p-6">
      <div className="w-full max-w-md space-y-8">

        <div className="text-center space-y-1">
          <h1 className="text-2xl text-parchment tracking-widest uppercase">Call of Cthulhu</h1>
          <p className="text-dust text-sm">AI 키퍼 솔로 플레이</p>
        </div>

        {/* API 키 입력 + 검증 */}
        <div className="space-y-2">
          <label className="block text-dust text-xs tracking-widest uppercase">Anthropic API Key</label>
          <div className="flex gap-2">
            <input
              type="password"
              value={inputKey}
              onChange={e => handleKeyChange(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleVerify()}
              placeholder="sk-ant-..."
              className="flex-1 bg-surface border border-border text-parchment text-sm px-4 py-3 outline-none focus:border-blood placeholder:text-dust/40"
            />
            <button
              onClick={handleVerify}
              disabled={!canVerify}
              className="border border-border text-dust text-sm px-4 py-3 hover:text-parchment hover:border-parchment/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors whitespace-nowrap"
            >
              {verifyState === 'loading' ? '확인 중...' : '키 확인'}
            </button>
          </div>

          {/* 검증 결과 */}
          {verifyState === 'ok' && (
            <p className="text-sm text-parchment/70">✓ API 키가 확인되었습니다.</p>
          )}
          {verifyState === 'error' && (
            <p className="text-sm text-blood">{verifyMsg}</p>
          )}
        </div>

        {/* 시나리오 선택 */}
        <div className="space-y-2">
          <label className="block text-dust text-xs tracking-widest uppercase">시나리오 선택</label>
          <div className="space-y-2">
            {SCENARIOS.map(s => (
              <button
                key={s.id}
                onClick={() => setSelected(s)}
                className={`w-full text-left px-4 py-3 border text-sm transition-colors ${
                  selected?.id === s.id
                    ? 'border-blood text-parchment bg-blood/10'
                    : 'border-border text-dust hover:border-parchment/30 hover:text-parchment'
                }`}
              >
                <div className="text-parchment">{s.title}</div>
                <div className="text-dust text-xs mt-0.5">{s.setting}</div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleStart}
          disabled={!canStart}
          className="w-full py-3 text-sm tracking-widest uppercase transition-colors disabled:opacity-30 disabled:cursor-not-allowed border border-blood text-blood hover:bg-blood hover:text-parchment"
        >
          {hasSave ? '새 게임 시작' : '시작'}
        </button>

        {/* 플레이 기록 */}
        {history.length > 0 && (
          <div className="space-y-2 pt-4 border-t border-border">
            <p className="text-dust text-xs tracking-widest uppercase">지난 기록</p>
            <div className="space-y-1 max-h-48 overflow-y-auto">
              {history.map((h, i) => (
                <div key={i} className="px-3 py-2 border border-border text-xs space-y-0.5">
                  <div className="flex justify-between items-baseline">
                    <span className="text-parchment">{h.characterName} <span className="text-dust">({h.occupation})</span></span>
                    <span className="text-dust">{new Date(h.date).toLocaleDateString('ko-KR')}</span>
                  </div>
                  <div className="flex gap-3 text-dust">
                    <span className={h.cause === 'death' ? 'text-blood' : 'text-dust'}>{h.endingTitle ?? h.cause}</span>
                    <span>{h.turnsPlayed}턴</span>
                    <span>SAN {h.finalSAN}</span>
                    <span>단서 {h.cluesFound}개</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}
