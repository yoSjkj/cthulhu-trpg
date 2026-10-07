import { describe, it, expect, afterEach } from 'vitest'
import { setRng } from './dice'
import { performSanCheck, checkInsanity, applySanLoss } from './sanity'

// 호출 순서대로 값을 돌려주는 난수원
function seq(values) {
  let i = 0
  return () => values[i++ % values.length]
}

afterEach(() => {
  setRng(Math.random)
})

// game-rules.md: SAN 체크는 d100 <= 현재 SAN이면 성공
describe('performSanCheck — 임계값 경계', () => {
  it('굴림이 현재 SAN과 같으면 성공', () => {
    setRng(() => 0.49) // roll 50
    const r = performSanCheck(50, { success: '0', fail: '1d3' })
    expect(r.roll).toBe(50)
    expect(r.passed).toBe(true)
  })

  it('굴림이 현재 SAN을 1 넘으면 실패', () => {
    setRng(seq([0.5, 0])) // roll 51, 이후 피해 굴림
    const r = performSanCheck(50, { success: '0', fail: '1d3' })
    expect(r.roll).toBe(51)
    expect(r.passed).toBe(false)
  })

  it("성공 손실이 '0'이면 손실량 0", () => {
    setRng(() => 0.49) // roll 50 -> 성공
    const r = performSanCheck(50, { success: '0', fail: '1d3' })
    expect(r.lossFormula).toBe('0')
    expect(r.lossAmount).toBe(0)
  })

  it('실패 시 fail 공식을 굴린다', () => {
    setRng(seq([0.5, 0])) // roll 51 -> 실패, 1d3에서 1
    const r = performSanCheck(50, { success: '0', fail: '1d3' })
    expect(r.lossFormula).toBe('1d3')
    expect(r.lossAmount).toBe(1)
  })
})

// game-rules.md "광기" 절
//   일시적 광기: 한 번의 SAN 체크에서 5 이상 손실
//   부정기 광기: 세션 누적 손실 >= 세션 시작 SAN의 1/5
describe('checkInsanity — 임계값 경계', () => {
  it('한 번에 5 이상 손실하면 일시적 광기', () => {
    expect(checkInsanity(5, 0, 50).temporaryInsanity).toBe(true)
  })

  it('한 번에 4 손실이면 일시적 광기가 아니다', () => {
    expect(checkInsanity(4, 0, 50).temporaryInsanity).toBe(false)
  })

  it('누적 손실이 시작 SAN의 1/5에 도달하면 부정기 광기', () => {
    // startSAN 50 -> floor(50/5) = 10
    expect(checkInsanity(1, 10, 50).indefiniteInsanity).toBe(true)
  })

  it('누적 손실이 1/5 미만이면 부정기 광기가 아니다', () => {
    expect(checkInsanity(1, 9, 50).indefiniteInsanity).toBe(false)
  })

  it('기준은 세션 시작 SAN이다 — 시작 SAN이 높으면 임계값도 높다', () => {
    // 누적 10은 시작 SAN 50에서는 발동하지만 시작 SAN 80에서는 발동하지 않는다
    expect(checkInsanity(1, 10, 50).indefiniteInsanity).toBe(true)
    expect(checkInsanity(1, 10, 80).indefiniteInsanity).toBe(false)
  })
})

// game-rules.md: SAN은 0 미만으로 내려가지 않는다. SAN 0 -> 영구 광기
describe('applySanLoss', () => {
  const base = { SAN: 50, skills: { '크툴루신화': 0 }, temporaryInsanity: null, indefiniteInsanity: null }

  it('손실만큼 SAN이 줄어든다', () => {
    setRng(() => 0)
    expect(applySanLoss(base, 3, 0).SAN).toBe(47)
  })

  it('SAN은 0 미만으로 내려가지 않는다', () => {
    setRng(() => 0)
    expect(applySanLoss(base, 999, 0).SAN).toBe(0)
  })

  it('SAN이 0이면 isSane이 false', () => {
    setRng(() => 0)
    expect(applySanLoss(base, 999, 0).isSane).toBe(false)
  })

  it('SAN이 남아 있으면 isSane이 true', () => {
    setRng(() => 0)
    expect(applySanLoss(base, 3, 0).isSane).toBe(true)
  })
})

describe('applySanLoss — 2단계에서 해제할 케이스', () => {
  const base = { SAN: 50, skills: { '크툴루신화': 0 }, temporaryInsanity: null, indefiniteInsanity: null }

  // 2-10: 갱신된 sessionLoss를 반환하지 않아 호출자가 누적값을 알 수 없다.
  it('[2-10] 갱신된 sessionLoss를 반환한다', () => {
    setRng(() => 0)
    expect(applySanLoss(base, 3, 7).sessionLoss).toBe(10)
  })

  // 2-12: 새 SAN이 maxSAN으로 클램프되지 않는다.
  it.skip('[2-12] SAN은 maxSAN을 초과할 수 없다', () => {
    setRng(() => 0)
    const high = { ...base, SAN: 95, skills: { '크툴루신화': 10 } }
    // maxSAN = 99 - 10 = 89. 손실 0이어도 89로 묶여야 한다.
    expect(applySanLoss(high, 0, 0).SAN).toBe(89)
  })

  // 2-9: Game.jsx가 현재 SAN을 startSAN으로 넘겨 임계값이 매번 낮아진다.
  // applySanLoss가 character.SAN을 startSAN으로 쓰는 것이 원인이다.
  // 수정 후에는 세션 시작 SAN을 인자로 받아야 한다.
  it('[2-9] 부정기 광기 기준은 세션 시작 SAN이어야 한다', () => {
    setRng(() => 0)
    // 시작 SAN 50에서 이미 40까지 떨어진 상태. 누적 손실 7에 1을 더해 8이 된다.
    // 현재 SAN 40을 기준으로 삼으면 임계값이 floor(40/5)=8이라 발동한다. (버그)
    // 세션 시작 SAN 50을 기준으로 삼으면 임계값이 floor(50/5)=10이라 발동하지 않는다.
    const dropped = { ...base, SAN: 40 }
    const r = applySanLoss(dropped, 1, 7, 50)
    expect(r.indefiniteInsanity).toBe(null)

    // 기준이 세션 시작 SAN이라는 것을 반대 방향으로도 확인한다. 누적 10이면 발동한다.
    expect(applySanLoss(dropped, 1, 9, 50).indefiniteInsanity).not.toBe(null)
  })
})

// 2-11: permanentInsanity는 제거하기로 결정했다. (2026-10-07)
// 영구 광기(SAN = 0)는 손실 누적 임계값이 아니라 상태이므로 checkInsanity의
// 입력(singleLoss, sessionLoss, startSAN)만으로는 판정할 수 없다.
// 룰은 isSane -> gameOver('insanity') 경로로 이미 구현되어 있다.
describe('checkInsanity — 영구 광기는 다루지 않는다', () => {
  it('[2-11] 결과에 permanentInsanity 필드가 없다', () => {
    expect(checkInsanity(5, 10, 50)).not.toHaveProperty('permanentInsanity')
  })

  it('[2-11] 영구 광기는 applySanLoss의 isSane이 담당한다', () => {
    setRng(() => 0)
    const base = { SAN: 50, skills: { '크툴루신화': 0 }, temporaryInsanity: null, indefiniteInsanity: null }
    expect(applySanLoss(base, 50, 0, 50).SAN).toBe(0)
    expect(applySanLoss(base, 50, 0, 50).isSane).toBe(false)
  })
})
