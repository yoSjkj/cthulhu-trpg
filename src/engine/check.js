import { rollD100, rollBonus, rollPenalty } from './dice.js'

// 판정 등급 계산
export function getCheckResult(roll, skillValue) {
  // 대성공 경계에 기술치 하한을 걸지 않는다. (game-rules.md "대성공 조건 주의")
  // roll 1은 기술치와 무관하게 항상 대성공이므로 아래 판정에서 별도로 다룬다.
  const critical = Math.floor(skillValue / 5)
  const hard     = Math.floor(skillValue / 2)
  const fumble   = skillValue < 50 ? 96 : 100

  // 대실패를 가장 먼저 확인한다. (game-rules.md "판정 순서 주의")
  // regular를 먼저 보면 기술치 100 이상에서 roll 100이 성공으로 처리된다.
  if (roll >= fumble)                 return 'fumble'
  if (roll === 1 || roll <= critical) return 'critical'
  if (roll <= hard)                   return 'hard'
  if (roll <= skillValue)             return 'regular'
  return 'fail'
}

// 성공 여부 (regular 이상이면 성공)
export function isSuccess(result) {
  return ['critical', 'hard', 'regular'].includes(result)
}

// 판정 실행 (difficulty: 'normal' | 'hard' | 'extreme')
// normal → 보통 성공 이상 통과
// hard   → 어려운 성공 이상 통과
// extreme→ 대성공만 통과
export function performCheck(skillValue, difficulty = 'normal', bonusDice = 0) {
  let rolled
  if (bonusDice > 0)      rolled = rollBonus()
  else if (bonusDice < 0) rolled = rollPenalty()
  else                    rolled = rollD100()

  const result = getCheckResult(rolled, skillValue)
  const success = checkPassesDifficulty(result, difficulty)

  return { rolled, result, success, skillValue, difficulty }
}

function checkPassesDifficulty(result, difficulty) {
  if (difficulty === 'normal')  return isSuccess(result)
  if (difficulty === 'hard')    return ['critical', 'hard'].includes(result)
  if (difficulty === 'extreme') return result === 'critical'
  return false
}

// 난이도별 목표치 (game-rules.md "LUCK 소비")
function difficultyTarget(skillValue, difficulty) {
  if (difficulty === 'hard')    return Math.floor(skillValue / 2)
  if (difficulty === 'extreme') return Math.floor(skillValue / 5)
  return skillValue
}

// LUCK 소비: 목표치까지의 차이만큼 LUCK을 써서 확정 성공으로 전환
// 비용 = 굴림값 − 해당 난이도의 목표치. 통과해야 하는 선이 난이도마다 다르다
// 대실패에는 사용할 수 없다
// SAN 굴림·피해 굴림에도 사용할 수 없다 — 두 경로는 이 함수를 호출하지 않는다
// 반환: { canUse: boolean, cost: number }
export function useLuck(rolled, skillValue, currentLuck, difficulty = 'normal') {
  if (getCheckResult(rolled, skillValue) === 'fumble') return { canUse: false, cost: 0 }

  const cost = Math.max(1, rolled - difficultyTarget(skillValue, difficulty))
  return { canUse: currentLuck >= cost, cost }
}

// 판정 결과 한국어 라벨
export const CHECK_LABELS = {
  critical: '대성공',
  hard:     '어려운 성공',
  regular:  '보통 성공',
  fail:     '실패',
  fumble:   '대실패',
}
