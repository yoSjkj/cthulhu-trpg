import { rollD100, rollDamage } from './dice.js'

// SAN 체크 실행
// loss: { success: "0", fail: "1d3" } 형태
export function performSanCheck(currentSAN, loss) {
  const roll = rollD100()
  const passed = roll <= currentSAN

  const lossFormula = passed ? loss.success : loss.fail
  const lossAmount = lossFormula === '0' ? 0 : rollDamage(lossFormula)

  return {
    roll,
    passed,
    lossFormula,
    lossAmount,
  }
}

// 광기 판정
// sessionLoss: 세션 시작 이후 누적 SAN 손실량
// startSAN: 세션 시작 시 SAN 값
//
// 영구 광기(SAN = 0)는 여기서 다루지 않는다. 손실 누적 임계값이 아니라 상태이고,
// 이 함수의 입력만으로는 판정할 수 없다. applySanLoss의 isSane이 담당한다.
export function checkInsanity(singleLoss, sessionLoss, startSAN) {
  const result = {
    temporaryInsanity: false,
    indefiniteInsanity: false,
  }

  // 일시적 광기: 한 번에 5 이상 손실
  if (singleLoss >= 5) {
    result.temporaryInsanity = true
  }

  // 부정기 광기: 세션 시작 SAN의 1/5 이상 누적
  if (sessionLoss >= Math.floor(startSAN / 5)) {
    result.indefiniteInsanity = true
  }

  return result
}

// 일시적 광기 효과 목록 (1d10 굴림)
const TEMP_INSANITY_EFFECTS = [
  '공황 상태 — 무작위 방향으로 도주한다',
  '실신 — 1d10분간 의식을 잃는다',
  '히스테리 — 통제할 수 없이 울거나 웃는다',
  '신체 마비 — 1d10분간 움직일 수 없다',
  '기억 공백 — 직전 수 분의 기억을 잃는다',
  '환각 — 없는 것이 보이거나 들린다',
  '폭력 충동 — 가장 가까운 대상을 공격한다',
  '피해망상 — 모든 것이 자신을 해치려 한다고 확신한다',
  '함구 — 말을 완전히 잃는다',
  '신체 이상 — 구토, 발작, 실신 중 하나가 발생한다',
]

export function rollTempInsanityEffect() {
  const idx = Math.floor(Math.random() * TEMP_INSANITY_EFFECTS.length)
  return TEMP_INSANITY_EFFECTS[idx]
}

// 부정기 광기 효과 목록 (지속적)
const INDEF_INSANITY_EFFECTS = [
  '편집증 — 주변 모든 것을 의심한다',
  '공포증 — 특정 대상이나 상황에 극도의 공포를 느낀다',
  '강박증 — 특정 행동을 반복하지 않으면 불안하다',
  '억압 — 사건과 관련된 기억을 의식적으로 차단한다',
  '다중인격 — 극한 상황에서 다른 인격이 나타난다',
  '자기혐오 — 자신이 더럽혀졌다고 느낀다',
]

export function rollIndefInsanityEffect() {
  const idx = Math.floor(Math.random() * INDEF_INSANITY_EFFECTS.length)
  return INDEF_INSANITY_EFFECTS[idx]
}

// SAN 적용 후 캐릭터 상태 업데이트
// startSAN: 세션 시작 시 SAN. 부정기 광기 임계값의 기준이다.
//   현재 SAN을 기준으로 쓰면 SAN이 깎일수록 임계값이 낮아져 광기가 연쇄한다.
//   생략하면 현재 SAN으로 보정하되, 호출자는 반드시 넘겨야 한다.
export function applySanLoss(character, lossAmount, sessionLoss, startSAN = character.SAN) {
  // game-rules.md: maxSAN = 99 − 크툴루신화 기술치
  // character.js calcDerived와 같은 식이다. 호출에 abilities가 필요해 여기서 다시 계산한다.
  const maxSAN = Math.min(99, 99 - (character.skills?.['크툴루신화'] ?? 0))

  // game-rules.md: "SAN은 maxSAN을 초과할 수 없다"
  // 손실이 0이어도 크툴루신화가 올라 maxSAN이 내려갔으면 여기서 묶인다.
  const newSAN = Math.min(maxSAN, Math.max(0, character.SAN - lossAmount))
  const newSessionLoss = sessionLoss + lossAmount

  const insanity = checkInsanity(lossAmount, newSessionLoss, startSAN)

  let tempInsanity = character.temporaryInsanity
  let indefInsanity = character.indefiniteInsanity

  if (insanity.temporaryInsanity) {
    tempInsanity = { description: rollTempInsanityEffect() }
  }
  if (insanity.indefiniteInsanity) {
    indefInsanity = { description: rollIndefInsanityEffect() }
  }

  return {
    ...character,
    SAN: newSAN,
    isSane: newSAN > 0,
    // 갱신된 누적 손실. 호출자가 다음 호출에 그대로 넘긴다.
    sessionLoss: newSessionLoss,
    temporaryInsanity: tempInsanity,
    indefiniteInsanity: indefInsanity,
    maxSAN,
  }
}
