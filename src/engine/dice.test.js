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
