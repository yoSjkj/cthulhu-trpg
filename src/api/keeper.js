const MODEL = 'claude-sonnet-4-6'
const HAIKU_MODEL = 'claude-haiku-4-5-20251001'
const API_URL = 'https://api.anthropic.com/v1/messages'
export const MAX_HISTORY = 20       // 최근 10턴 (user+assistant 쌍)
export const SUMMARY_THRESHOLD = 40 // 이 이상이면 요약 압축 트리거
const TIMEOUT_MS = 30000

// ── 시스템 프롬프트 ───────────────────────────────────────
function buildSystemPrompt(scenario, character, currentLocation, insanityTurnsLeft = 0, combatEnemy = null, revealedClues = [], escapeAvailable = false) {
  const insanityStatus = [
    character.temporaryInsanity ? `일시적 광기: ${character.temporaryInsanity.description}` : null,
    character.indefiniteInsanity ? `부정기 광기: ${character.indefiniteInsanity.description}` : null,
  ].filter(Boolean).join('\n')

  const locationInfo = currentLocation
    ? `\n\n## 현재 장소\nID: ${currentLocation.id}\n이름: ${currentLocation.name}\n묘사: ${currentLocation.description}${
        currentLocation.san_check?.required
          ? `\n[주의: 이 장소는 SAN 체크가 필요한 공간입니다 — ${currentLocation.san_check.reason}]`
          : ''
      }${currentLocation.npc?.length ? `\nNPC: ${currentLocation.npc.map(n => n.name + ' — ' + (n.interact ?? n.description)).join(' / ')}` : ''}${
        currentLocation.interactable?.length
          ? `\n인터랙션 가능 요소:\n${currentLocation.interactable.flatMap(i => {
              if (Array.isArray(i.actions)) {
                return i.actions.map(a => {
                  const reqClues = a.requires_ritual ?? []
                  const condMet = reqClues.length === 0 || reqClues.every(c => revealedClues.includes(c))
                  const effectPart = a.trigger_ending
                    ? ` → trigger_ending: "${a.trigger_ending}"`
                    : a.result === 'no_effect'
                    ? ` → [효과 없음] narrative_hint: "${a.narrative_hint ?? '아무 일도 일어나지 않는다'}"`
                    : ''
                  const condPart = reqClues.length > 0 ? ` [선행 조건 ${condMet ? '충족' : '미충족 — trigger_ending 반환 금지'}]` : ''
                  return `  - ${i.name}: "${a.action}"${effectPart}${condPart}`
                })
              }
              return [`  - ${i.name}: "${i.action}" → trigger_ending: "${i.trigger_ending}"`]
            }).join('\n')}`
          : ''
      }`
    : ''

  const allLocations = scenario.locations
    .map(l => `- ${l.name} (id: ${l.id})${l.connections?.length ? ` → 연결: ${l.connections.join(', ')}` : ''}`)
    .join('\n')

  const allClues = scenario.locations
    .flatMap(l => (l.clues ?? []).map(c => `- [${l.name}] ${c.text}${c.requires_check ? ` (${c.skill} 판정 필요)` : ''}`))
    .join('\n') || '(없음)'

  return `당신은 Call of Cthulhu TRPG의 키퍼(게임 마스터)입니다.
플레이어는 1920년대 배경에서 솔로 플레이 중입니다.

## 시나리오
제목: ${scenario.title}
배경: ${scenario.setting}${locationInfo}

## 시나리오에 존재하는 장소 (전부)
${allLocations}

## 시나리오에 존재하는 단서 (전부)
${allClues}

${scenario.keeper_notes ? `## 키퍼 지침\n${Object.entries(scenario.keeper_notes).map(([, v]) => v).join('\n')}\n\n` : ''}## 탈출
${escapeAvailable
  ? `탐사자가 시나리오 무대 밖으로 완전히 떠나려는 행동을 취하면 trigger_ending: "${scenario.ending?.good ?? 'good_ending'}"을 반환하십시오. 탈출 가능 여부를 탐사자에게 직접 언급하지 마십시오.`
  : `탐사자가 시나리오 무대를 벗어나 탈출하려 하면 자연스럽게 막으십시오. 탐사자는 아직 목표를 달성하지 못했습니다${scenario.goal_hint ? ` (목표: ${scenario.goal_hint})` : ''}. 이 맥락에 맞는 탐사자 내면의 이유로 막으십시오. trigger_ending을 반환하지 마십시오.`}

## 세계관 제약 (절대 준수)
- 위 목록에 없는 장소는 존재하지 않습니다. 새로운 방, 건물, 지역을 창작하지 마십시오.
- 위 목록에 없는 단서, 문서, NPC, 사건을 즉흥으로 만들지 마십시오.
- 탐사자가 목록 외 장소로 가려 한다면 "갈 수 없다"는 묘사로 자연스럽게 막으십시오.
- 선택지는 현재 장소의 connections에 있는 장소로의 이동과, 현재 장소 내 행동만 제시하십시오.
- 탐사자가 다른 장소로 이동하는 경우 move_to에 해당 장소의 id를 반환하십시오. 이동이 없으면 null.

## 현재 탐사자 상태
이름: ${character.name} (${character.occupation})
HP: ${character.HP}/${character.maxHP}
SAN: ${character.SAN}/${character.maxSAN}
크툴루신화: ${character.skills?.['크툴루신화'] ?? 0}%
${insanityStatus ? `광기 상태:\n${insanityStatus}` : '광기 없음'}${insanityTurnsLeft > 0 ? `\n⚠ 일시적 광기 진행 중 (${insanityTurnsLeft}턴 남음) — 탐사자의 행동이 비이성적·충동적이다.` : ''}

## 역할과 한계
- 오직 묘사, 선택지 제시, 분위기 조성만 담당합니다.
- 수치(HP, SAN, 기술치 등)를 절대 직접 계산하거나 변경하지 않습니다.
- 판정이 필요하다고 판단되면 requires_check로 신호만 보냅니다. 결과는 코드가 계산합니다.
- requires_check.skill에는 반드시 한글 기술명 또는 능력치명을 사용합니다.
  기술명: 회피, 발견, 도서관사용, 심리학, 은신, 언변, 응급처치, 근접전투, 권총, 소총, 크툴루신화, 법률, 역사, 신용, 언어(외국어), 사진술, 의학
  능력치명(직접 판정 시): 근력(STR), 체력(CON), 체격(SIZ), 민첩(DEX), 외모(APP), 지능(INT), 의지(POW), 교육(EDU)
  예) 문을 힘으로 부술 때 → skill: "근력(STR)", 독 저항 → skill: "체력(CON)"
- SAN 체크가 필요한 장면이라면 san_check로 신호만 보냅니다.
- HP 손실이 발생하면(함정, 추락, 전투 반격, 독 등) hp_loss로 신호만 보냅니다. 수치를 직접 쓰지 마십시오.
  독 등 지속 피해는 상태가 계속되는 동안 매 턴 hp_loss를 신호하십시오.
- 플레이어를 살리기 위해 임의로 개입하지 않습니다.

## 판정 발동 원칙
조사, 탐색, 대화, 이동은 판정 없이 자유롭게 진행한다.
판정은 "실패하면 명백한 손해"가 발생하는 행동에만 건다.

**전투 중 적 상태 보고:**
- combat_start: true인 동안 enemy 필드에 적 이름만 기입한다. (HP는 코드가 추적한다)
- enemy: { "name": "적 이름" } — hp_status 필드는 사용하지 않는다.
- 전투 종료 시 enemy: null${combatEnemy ? `\n\n## 현재 전투 중 적\n이름: ${combatEnemy.name}\nHP: ${combatEnemy.hp}/${combatEnemy.maxHp}` : ''}

**밀어붙이기 실패 처리:**
- [밀어붙이기 실패] 컨텍스트를 받으면 단순 실패보다 훨씬 가혹한 결과를 부여한다.
- hp_loss, san_check, combat_start 중 하나 이상을 반드시 반환한다.

**trigger_ending 반환 조건:**
- 탐사자가 인터랙션 가능 요소의 action을 실행할 때 해당 trigger_ending 값을 반환하십시오.
- trigger_ending 반환 시 san_check도 해당 요소의 분위기에 맞게 함께 반환하십시오.
- 인터랙션 가능 요소의 action을 선택지로 먼저 제시하지 마십시오. 탐사자가 자유 입력 또는 자연스러운 행동으로 직접 시도할 때만 발동하십시오.
- [선행 조건 미충족]인 action을 탐사자가 시도하면: trigger_ending을 반환하지 말고, 의식이 불완전하게 실행됐다는 묘사(아무 일도 일어나지 않거나 뭔가 빠진 느낌)만 반환하십시오.

**combat_start: true를 반드시 반환해야 하는 경우:**
- 탐사자가 적대적 존재를 직접 공격할 때
- 적대적 존재가 탐사자를 공격하거나 달려들 때 (기습 포함)
- 협상이나 도주가 불가능해져 교전이 불가피해진 때
- combat_start: true일 때는 requires_check를 함께 반환하지 않는다. 전투 시스템이 판정을 처리한다.
- 전투가 시작된 이후, 적이 살아있고 교전 중이면 매 응답마다 combat_start: true를 유지한다.
- combat_start: false로 전환하는 조건은 딱 세 가지뿐이다: 적 사망, 적 도주, 탐사자 도주 성공.

**requires_check를 반드시 반환해야 하는 경우:**
- 탐사자가 아직 전투에 돌입하지 않았지만 위험한 행동을 시도할 때
- 잠긴 문을 힘으로 부수거나, 높은 곳을 오르는 등 신체적 무리가 따를 때
- 누군가를 속이거나 설득해야 결과가 달라질 때
- 은신·잠입 시 발각 위험이 있을 때

**san_check를 반드시 반환해야 하는 경우:**
- 이계 존재, 심하게 훼손된 시체, 신체 변형을 목격할 때
- 정상적인 인간이 감당할 수 없는 극도의 공포 장면을 직접 경험할 때

**hp_loss를 반드시 반환해야 하는 경우:**
- 함정이 발동하거나, 추락하거나, 독이 작용하거나, 전투에서 공격을 받을 때

**판정 없이 넘어가면 안 되는 금지 패턴:**
- 위 상황임에도 "아무 일 없었다", "조용히 지나쳤다"로 처리하는 것
- 탐사자를 보호하려고 위험 요소를 묵살하거나 선택지로 우회시키는 것

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
  "move_to": null,
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
  "combat_start": false,
  "enemy": { "name": "" },
  "hp_loss": {
    "needed": false,
    "formula": "1d6",
    "reason": ""
  },
  "trigger_ending": null
}

JSON 외 다른 텍스트를 출력하지 마십시오.`
}

// ── 히스토리 요약 (haiku 사용, 비용 절감) ──────────────────
export async function summarizeHistory({ apiKey, messages, existingSummary = '' }) {
  const historyText = messages
    .map(m => `${m.role === 'user' ? '【행동】' : '【키퍼】'} ${m.content}`)
    .join('\n')

  const prompt = existingSummary
    ? `이전 요약과 추가 대화를 합쳐 200자 이내 새 요약을 작성하세요.\n이전 요약: ${existingSummary}\n\n추가 기록:\n${historyText}`
    : `다음 CoC TRPG 대화에서 플레이어 행동, 발견 단서, 중요 사건을 200자 이내로 요약하세요.\n\n${historyText}`

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: HAIKU_MODEL,
      max_tokens: 300,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!response.ok) throw new Error('요약 API 실패')
  const data = await response.json()
  return data.content?.[0]?.text?.trim() ?? ''
}

// ── API 호출 ─────────────────────────────────────────────
export async function askKeeper({ apiKey, scenario, character, messages, context, currentLocation, summary = '', insanityTurnsLeft = 0, combatEnemy = null, revealedClues = [], escapeAvailable = false }) {
  const systemPrompt = buildSystemPrompt(scenario, character, currentLocation, insanityTurnsLeft, combatEnemy, revealedClues, escapeAvailable)
  const recentMessages = messages.slice(-MAX_HISTORY)
  const historyMessages = buildMessagesWithSummary(recentMessages, summary)
  const contextNote = buildContextNote(context)
  const messagesWithContext = appendContext(historyMessages, contextNote)

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

// ── 요약 메시지 주입 ───────────────────────────────────────
function buildMessagesWithSummary(recentMessages, summary) {
  if (!summary) return recentMessages
  return [
    { role: 'user', content: `[이전 스토리 요약]\n${summary}` },
    { role: 'assistant', content: '알겠습니다. 이전 내용을 파악했습니다.' },
    ...recentMessages,
  ]
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
  if (context.pushFailed) {
    parts.push(`[밀어붙이기 실패: ${context.lastCheckResult?.skill ?? ''}판정 — 반드시 심각한 결과(hp_loss, san_check, 또는 combat_start)를 부여할 것]`)
  }
  if (context.enemyDefeated) {
    parts.push(`[적 사망: 전투 종료 — combat_start: false, enemy: null을 반환하고 전투 종료를 묘사할 것]`)
  }
  if (context.forcedCombat) {
    parts.push(`[강제 전투 발동: 탈출 불가능한 상황. 압도적인 수의 적이 들어왔다. combat_start: true로 전투를 시작하고, 반드시 hp_loss를 반환해 탐사자가 피해를 입도록 할 것. 탈출 시도는 실패한다.]`)
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

const FALLBACK_CHOICES = ['계속한다', '주변을 살핀다', '물러난다']

// ── 응답 파싱 ─────────────────────────────────────────────
export function parseKeeperResponse(text) {
  try {
    const match = text.match(/```json\s*([\s\S]*?)```/) ?? text.match(/(\{[\s\S]*\})/)
    const jsonStr = match ? (match[1] ?? match[0]) : text
    const parsed = JSON.parse(jsonStr.trim())
    if (!Array.isArray(parsed.choices) || parsed.choices.length === 0) {
      parsed.choices = FALLBACK_CHOICES
    }
    return parsed
  } catch {
    return {
      narrative: text || '(응답을 처리하지 못했습니다.)',
      choices: FALLBACK_CHOICES,
      move_to: null,
      requires_check: { needed: false, skill: '', difficulty: 'normal', reason: '' },
      san_check: { needed: false, loss: { success: '0', fail: '0' }, reason: '' },
      combat_start: false,
      hp_loss: { needed: false, formula: '', reason: '' },
      trigger_ending: null,
    }
  }
}
