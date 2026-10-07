import { describe, it, expect, afterEach, vi } from 'vitest'
import {
  setRng,
  roll,
  rollD100,
  roll3d6x5,
  rollBonus,
  rollPenalty,
  rollDamage,
  rollWithDB,
} from './dice'

// 호출 순서대로 값을 돌려주는 난수원. 끝나면 처음으로 되돌아간다.
function seq(values) {
  let i = 0
  return () => values[i++ % values.length]
}

afterEach(() => {
  setRng(Math.random)
})

describe('setRng', () => {
  it('주입한 난수원이 roll에 반영된다', () => {
    setRng(() => 0)
    expect(roll(6)).toBe(1)
    expect(roll(100)).toBe(1)
  })

  it('난수원의 상한에서 주사위 최대값이 나온다', () => {
    setRng(() => 0.999999)
    expect(roll(6)).toBe(6)
    expect(roll(100)).toBe(100)
  })

  it('setRng(Math.random)으로 되돌릴 수 있다', () => {
    setRng(() => 0)
    expect(roll(6)).toBe(1)
    setRng(Math.random)
    const results = new Set(Array.from({ length: 50 }, () => roll(6)))
    expect(results.size).toBeGreaterThan(1)
  })

  it('모든 굴림이 주입된 난수원을 경유한다 — Math.random을 직접 쓰지 않는다', () => {
    const spy = vi.spyOn(Math, 'random')
    setRng(() => 0)

    roll(6)
    rollD100()
    roll3d6x5()
    rollBonus()
    rollPenalty()
    rollDamage('1d6+2')
    rollWithDB('1d6', '1d4')

    expect(spy).not.toHaveBeenCalled()
    spy.mockRestore()
  })
})

describe('주입된 난수원으로 결과가 고정된다', () => {
  it('rollD100', () => {
    setRng(seq([0.5]))
    expect(rollD100()).toBe(51)
  })

  it('roll3d6x5 — 최소 15, 최대 90', () => {
    setRng(() => 0)
    expect(roll3d6x5()).toBe(15)
    setRng(() => 0.999999)
    expect(roll3d6x5()).toBe(90)
  })

  it('rollBonus는 두 번 굴려 낮은 값을 쓴다', () => {
    setRng(seq([0.5, 0.0]))
    expect(rollBonus()).toBe(1)
  })

  it('rollPenalty는 두 번 굴려 높은 값을 쓴다', () => {
    setRng(seq([0.5, 0.0]))
    expect(rollPenalty()).toBe(51)
  })

  it('rollDamage — 주사위 수와 보정치를 더한다', () => {
    setRng(() => 0)
    expect(rollDamage('1d6')).toBe(1)
    expect(rollDamage('2d6')).toBe(2)
    expect(rollDamage('1d6+2')).toBe(3)
  })

  it('rollWithDB — DB가 주사위식이면 굴려서 더한다', () => {
    setRng(() => 0)
    expect(rollWithDB('1d6', '1d4')).toBe(2)
  })

  it('rollWithDB — DB가 상수면 그대로 더한다', () => {
    setRng(() => 0)
    expect(rollWithDB('1d6', '2')).toBe(3)
  })

  it('rollWithDB — DB가 없거나 0이면 기본 피해만', () => {
    setRng(() => 0)
    expect(rollWithDB('1d6', '0')).toBe(1)
    expect(rollWithDB('1d6', null)).toBe(1)
  })

  it('rollWithDB — 음수 DB로 0 미만이 되지 않는다', () => {
    setRng(() => 0)
    expect(rollWithDB('1d6', '-2')).toBe(0)
  })
})

describe('rollDamage — 2단계에서 해제할 케이스', () => {
  // 2-13: 정규식이 소문자 d, 앞뒤 공백 없는 형태만 받는다.
  // 매칭 실패 시 조용히 0을 반환해 피해가 사라진다.
  it('[2-13] 대문자 D를 허용한다', () => {
    setRng(() => 0)
    expect(rollDamage('1D6')).toBe(1)
    expect(rollDamage('2D6+1')).toBe(3)
  })

  it('[2-13] 앞뒤 공백을 허용한다', () => {
    setRng(() => 0)
    expect(rollDamage(' 1d6 ')).toBe(1)
    expect(rollDamage('1d6 + 2')).toBe(3)
  })

  it('[2-13] 주사위 없는 상수식을 허용한다', () => {
    expect(rollDamage('2')).toBe(2)
    expect(rollDamage('0')).toBe(0)
  })

  it('[2-13] 파싱 실패는 조용히 0을 반환하지 않는다', () => {
    // throw 또는 경고 로그 중 어느 쪽으로 갈지는 2-13에서 결정한다.
    expect(() => rollDamage('abc')).toThrow()
  })
})

describe('rollWithDB — 2단계에서 해제할 케이스', () => {
  // 2-14: db.includes('d')를 호출해 숫자를 넘기면 TypeError가 난다.
  it('[2-14] DB가 숫자여도 처리한다', () => {
    setRng(() => 0)
    expect(rollWithDB('1d6', 2)).toBe(3)
    expect(rollWithDB('1d6', 0)).toBe(1)
    expect(rollWithDB('1d6', -2)).toBe(0)
  })

  // game-rules.md는 DB를 항상 문자열로 저장하라고 정한다. 숫자 처리는 방어 장치다.
  it('[2-14] 대문자 D 주사위 DB도 주사위로 본다', () => {
    // 최대 굴림으로 고정해 두 경로를 구분한다.
    //   주사위로 보면 1d6(6) + 1D4(4) = 10
    //   includes('d')가 false라 상수로 보면 parseInt('1D4') = 1 -> 7
    setRng(() => 0.999999)
    expect(rollWithDB('1d6', '1D4')).toBe(10)
  })
})
