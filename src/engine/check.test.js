import { describe, it, expect, afterEach } from 'vitest'
import { setRng } from './dice'
import { getCheckResult, isSuccess, performCheck, useLuck } from './check'

// 호출 순서대로 값을 돌려주는 난수원
function seq(values) {
  let i = 0
  return () => values[i++ % values.length]
}

afterEach(() => {
  setRng(Math.random)
})

// game-rules.md "판정" 절 기준
//   대성공       roll = 1, 또는 roll <= floor(기술치/5)
//   어려운 성공  roll <= floor(기술치/2)
//   보통 성공    roll <= 기술치
//   대실패       기술치 < 50 -> roll >= 96 / 기술치 >= 50 -> roll = 100
//   실패         그 외
describe('getCheckResult — 백로그 1-3 필수 매트릭스', () => {
  it('roll 1은 기술치와 무관하게 대성공', () => {
    expect(getCheckResult(1, 49)).toBe('critical')
    expect(getCheckResult(1, 50)).toBe('critical')
    expect(getCheckResult(1, 99)).toBe('critical')
    expect(getCheckResult(1, 100)).toBe('critical')
  })

  it('기술치 49 — 50 미만이라 roll 96 이상이 대실패', () => {
    expect(getCheckResult(96, 49)).toBe('fumble')
    expect(getCheckResult(100, 49)).toBe('fumble')
  })

  it('기술치 50 — 50 이상이라 roll 100만 대실패, 96은 단순 실패', () => {
    expect(getCheckResult(96, 50)).toBe('fail')
    expect(getCheckResult(100, 50)).toBe('fumble')
  })

  it('기술치 99 — roll 96은 보통 성공, roll 100은 대실패', () => {
    expect(getCheckResult(96, 99)).toBe('regular')
    expect(getCheckResult(100, 99)).toBe('fumble')
  })

  it('기술치 100 — roll 96은 보통 성공', () => {
    expect(getCheckResult(96, 100)).toBe('regular')
  })

  it('어려운 성공 경계 — roll <= floor(기술치/2)', () => {
    expect(getCheckResult(24, 49)).toBe('hard')
    expect(getCheckResult(25, 50)).toBe('hard')
  })

  it('어려운 성공 경계를 1 넘으면 보통 성공으로 내려간다', () => {
    // 기술치 49: hard 경계 24, 보통 성공 경계 49
    expect(getCheckResult(25, 49)).toBe('regular')
    // 기술치 50: hard 경계 25, 보통 성공 경계 50
    expect(getCheckResult(26, 50)).toBe('regular')
  })

  it('보통 성공 경계 — roll <= 기술치', () => {
    expect(getCheckResult(50, 50)).toBe('regular')
    expect(getCheckResult(51, 50)).toBe('fail')
  })
})

describe('getCheckResult — 2단계에서 해제할 케이스', () => {
  // game-rules.md: "판정 순서 주의: 대실패를 먼저 확인한다.
  //   기술치 100 이상일 때 roll 100이 성공으로 처리되면 안 된다."
  it('[2-2] 기술치 100에서 roll 100은 대실패여야 한다', () => {
    expect(getCheckResult(100, 100)).toBe('fumble')
  })

  // game-rules.md: "대성공 조건 주의: floor(기술치/5)에 기술치 하한을 걸지 않는다.
  //   기술치 40이면 roll 8 이하가 대성공이다."
  it('[2-1] 기술치 50 미만에서도 floor(기술치/5)까지 대성공', () => {
    expect(getCheckResult(8, 40)).toBe('critical')
    expect(getCheckResult(9, 49)).toBe('critical')
  })
})

describe('isSuccess', () => {
  it('보통 성공 이상만 성공으로 본다', () => {
    expect(isSuccess('critical')).toBe(true)
    expect(isSuccess('hard')).toBe(true)
    expect(isSuccess('regular')).toBe(true)
    expect(isSuccess('fail')).toBe(false)
    expect(isSuccess('fumble')).toBe(false)
  })
})

// game-rules.md "난이도" 절
//   normal  보통 성공 이상
//   hard    어려운 성공 이상
//   extreme 대성공만
describe('performCheck — 난이도별 통과 조건', () => {
  it('normal은 보통 성공으로 통과한다', () => {
    setRng(() => 0.49) // roll 50
    const r = performCheck(50, 'normal')
    expect(r.rolled).toBe(50)
    expect(r.result).toBe('regular')
    expect(r.success).toBe(true)
  })

  it('hard는 보통 성공으로 통과하지 못한다', () => {
    setRng(() => 0.49) // roll 50
    expect(performCheck(50, 'hard').success).toBe(false)
  })

  it('hard는 어려운 성공으로 통과한다', () => {
    setRng(() => 0.24) // roll 25 = floor(50/2)
    const r = performCheck(50, 'hard')
    expect(r.result).toBe('hard')
    expect(r.success).toBe(true)
  })

  it('extreme은 어려운 성공으로 통과하지 못한다', () => {
    setRng(() => 0.24) // roll 25
    expect(performCheck(50, 'extreme').success).toBe(false)
  })

  it('extreme은 대성공으로만 통과한다', () => {
    setRng(() => 0) // roll 1
    const r = performCheck(50, 'extreme')
    expect(r.result).toBe('critical')
    expect(r.success).toBe(true)
  })

  it('보너스 주사위는 두 번 굴려 낮은 값을 쓴다', () => {
    setRng(seq([0.5, 0.0])) // 51, 1
    expect(performCheck(50, 'normal', 1).rolled).toBe(1)
  })

  it('패널티 주사위는 두 번 굴려 높은 값을 쓴다', () => {
    setRng(seq([0.5, 0.0])) // 51, 1
    expect(performCheck(50, 'normal', -1).rolled).toBe(51)
  })
})

// game-rules.md "LUCK 소비" 절
//   비용 = 굴림값 - 해당 난이도의 목표치
//   normal -> 기술치 / hard -> floor(기술치/2) / extreme -> floor(기술치/5)
//   대실패에는 사용할 수 없다
describe('useLuck', () => {
  it('normal 난이도 비용 = 굴림값 - 기술치', () => {
    expect(useLuck(60, 50, 99).cost).toBe(10)
  })

  it('LUCK이 비용보다 적으면 사용할 수 없다', () => {
    expect(useLuck(60, 50, 9).canUse).toBe(false)
    expect(useLuck(60, 50, 10).canUse).toBe(true)
  })
})

describe('useLuck — 2단계에서 해제할 케이스', () => {
  // 2-3: 현재 useLuck은 difficulty 인자를 받지 않고 항상 기술치를 목표치로 쓴다.
  // 수정 후 시그니처는 useLuck(rolled, skillValue, currentLuck, difficulty) 형태가 된다.
  it.skip('[2-3] hard 난이도 비용 = 굴림값 - floor(기술치/2)', () => {
    expect(useLuck(60, 50, 99, 'hard').cost).toBe(35)
  })

  it.skip('[2-3] extreme 난이도 비용 = 굴림값 - floor(기술치/5)', () => {
    expect(useLuck(60, 50, 99, 'extreme').cost).toBe(50)
  })

  it.skip('[2-3] 대실패에는 LUCK을 쓸 수 없다', () => {
    // 기술치 40, roll 96 -> 대실패
    expect(useLuck(96, 40, 99, 'normal').canUse).toBe(false)
  })
})
