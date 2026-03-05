import { rollD100, rollBonus, rollPenalty } from './dice.js'

// 판정 등급 계산
export function getCheckResult(roll, skillValue) {
  const critical = skillValue < 50 ? 1 : Math.floor(skillValue / 5)
  const hard     = Math.floor(skillValue / 2)
  const fumble   = skillValue < 50 ? 96 : 100

  if (roll === 1 || roll <= critical) return 'critical'
  if (roll <= hard)                   return 'hard'
  if (roll <= skillValue)             return 'regular'
  if (roll >= fumble)                 return 'fumble'
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

// LUCK 소비: LUCK 수치만큼 d100 굴려 성공하면 결과 변경
// 반환: { success: boolean, luckUsed: number }
// luckUsed = 소비된 LUCK 포인트 (성공 시 사용한 LUCK 값, 실패 시 0)
export function useLuck(currentLuck) {
  if (currentLuck <= 0) return { success: false, luckUsed: 0 }
  const roll = rollD100()
  if (roll <= currentLuck) {
    return { success: true, luckUsed: currentLuck }
  }
  return { success: false, luckUsed: 0 }
}

// 판정 결과 한국어 라벨
export const CHECK_LABELS = {
  critical: '대성공',
  hard:     '어려운 성공',
  regular:  '보통 성공',
  fail:     '실패',
  fumble:   '대실패',
}
