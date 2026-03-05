const MODEL = 'claude-sonnet-4-6'
const API_URL = 'https://api.anthropic.com/v1/messages'
const MAX_HISTORY = 10
const TIMEOUT_MS = 30000

// ── 시스템 프롬프트 ───────────────────────────────────────
function buildSystemPrompt(scenario, character, currentLocation) {
  const insanityStatus = [
    character.temporaryInsanity ? `일시적 광기: ${character.temporaryInsanity.description}` : null,
    character.indefiniteInsanity ? `부정기 광기: ${character.indefiniteInsanity.description}` : null,
  ].filter(Boolean).join('\n')

  const locationInfo = currentLocation
    ? `\n\n## 현재 장소\n이름: ${currentLocation.name}\n묘사: ${currentLocation.description}${
        currentLocation.san_check?.required
          ? `\n[주의: 이 장소는 SAN 체크가 필요한 공간입니다 — ${currentLocation.san_check.reason}]`
          : ''
      }`
    : ''

  return `당신은 Call of Cthulhu TRPG의 키퍼(게임 마스터)입니다.
플레이어는 1920년대 배경에서 솔로 플레이 중입니다.

## 시나리오
제목: ${scenario.title}
배경: ${scenario.setting}${locationInfo}

## 현재 탐사자 상태
이름: ${character.name} (${character.occupation})
HP: ${character.HP}/${character.maxHP}
SAN: ${character.SAN}/${character.maxSAN}
크툴루신화: ${character.skills?.['크툴루신화'] ?? 0}%
${insanityStatus ? `광기 상태:\n${insanityStatus}` : '광기 없음'}

## 역할과 한계
- 오직 묘사, 선택지 제시, 분위기 조성만 담당합니다.
- 수치(HP, SAN, 기술치 등)를 절대 직접 계산하거나 변경하지 않습니다.
- 판정이 필요하다고 판단되면 requires_check로 신호만 보냅니다. 결과는 코드가 계산합니다.
- requires_check.skill에는 반드시 한글 기술명을 사용합니다: 회피, 발견, 도서관사용, 심리학, 은신, 언변, 응급처치, 근접전투, 권총, 소총, 크툴루신화, 법률, 역사, 신용, 언어(외국어), 사진술, 의학
- SAN 체크가 필요한 장면이라면 san_check로 신호만 보냅니다.
- 플레이어를 살리기 위해 임의로 개입하지 않습니다.

## 분위기 지침
1. 모든 것을 설명하지 않는다. 미지의 것은 미지인 채로 묘사한다.
2. 존재의 전체를 드러내지 않는다. 윤곽, 그림자, 잔향만 묘사한다.
3. SAN이 낮을수록 묘사가 이질적이고 해리된 느낌을 준다.
4. 우주적 존재는 인간에게 관심이 없다. 공포의 근원은 무관심과 스케일이다.
5. 해피엔딩을 유도하지 않는다.

## 응답 제약 (반드시 준수)
- narrative 전체 길이 150자 이내
- 2~3문장마다 빈 줄 삽입
- 한 응답 내 동일 단어 반복 금지
- 판정/SAN 체크 결과를 받은 후에는 이전 narrative를 절대 반복하지 말 것. 결과에 따라 스토리를 반드시 앞으로 진행시킬 것

## 응답 형식 (반드시 JSON만 반환)
{
  "narrative": "장면 묘사 (빈 줄 포함, 150자 이내)",
  "choices": ["행동1", "행동2", "행동3"],
  "requires_check": {
    "needed": false,
    "skill": "",
    "difficulty": "normal",
    "reason": ""
  },
  "san_check": {
    "needed": false,
    "loss": { "success": "0", "fail": "1d3" },
    "reason": ""
  },
  "combat_start": false
}

JSON 외 다른 텍스트를 출력하지 마십시오.`
}

// ── API 호출 ─────────────────────────────────────────────
export async function askKeeper({ apiKey, scenario, character, messages, context, currentLocation }) {
  const systemPrompt = buildSystemPrompt(scenario, character, currentLocation)
  const recentMessages = messages.slice(-MAX_HISTORY)
  const contextNote = buildContextNote(context)
  const messagesWithContext = appendContext(recentMessages, contextNote)

  // AbortController로 타임아웃 처리
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS)

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 1024,
        system: systemPrompt,
        messages: messagesWithContext,
      }),
    })

    if (!response.ok) {
      const err = await response.json().catch(() => ({}))
      throw new Error(err.error?.message ?? `API 오류 ${response.status}`)
    }

    const data = await response.json()
    const text = data.content?.[0]?.text ?? ''
    return parseKeeperResponse(text)
  } finally {
    clearTimeout(timeoutId)
  }
}

// ── 컨텍스트 노트 생성 ─────────────────────────────────────
function buildContextNote(context) {
  if (!context) return ''
  const parts = []
  if (context.locationDescription) {
    parts.push(`[현재 장소: ${context.locationDescription}]`)
  }
  if (context.lastCheckResult) {
    const r = context.lastCheckResult
    parts.push(`[판정 결과: ${r.skill} ${r.rolled} → ${r.resultLabel} (${r.success ? '성공' : '실패'})]`)
  }
  if (context.sanCheckResult) {
    const s = context.sanCheckResult
    parts.push(`[SAN 체크: ${s.passed ? '성공' : '실패'} → SAN -${s.lossAmount} (현재 SAN: ${s.currentSAN})]`)
  }
  if (context.revealedClue) {
    parts.push(`[발견한 단서: ${context.revealedClue}]`)
  }
  if (context.combatResult) {
    parts.push(`[전투: ${context.combatResult}]`)
  }
  return parts.join('\n')
}

function appendContext(messages, contextNote) {
  if (!contextNote || messages.length === 0) return messages
  const last = messages[messages.length - 1]
  if (last.role !== 'user') return messages
  const updated = [...messages]
  updated[updated.length - 1] = { ...last, content: `${last.content}\n\n${contextNote}` }
  return updated
}

// ── 응답 파싱 ─────────────────────────────────────────────
export function parseKeeperResponse(text) {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
    const jsonStr = match ? (match[1] ?? match[0]) : text
    return JSON.parse(jsonStr.trim())
  } catch {
    return {
      narrative: text || '(응답을 처리하지 못했습니다.)',
      choices: ['계속한다', '주변을 살핀다', '물러난다'],
      requires_check: { needed: false, skill: '', difficulty: 'normal', reason: '' },
      san_check: { needed: false, loss: { success: '0', fail: '0' }, reason: '' },
      combat_start: false,
    }
  }
}
