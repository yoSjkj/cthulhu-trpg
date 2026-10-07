import { describe, it, expect, afterEach } from 'vitest'
import { setRng } from './dice'
import { calcDerived, getBaseSkills, rollAbilities } from './character'

afterEach(() => {
  setRng(Math.random)
})

// calcDBAndBuild는 export되지 않으므로 공개 API인 calcDerived로 검증한다.
// STR+SIZ만 DB/BUILD에 영향을 주므로 나머지 능력치는 고정값을 쓴다.
function derivedFor(str, siz) {
  return calcDerived({ STR: str, SIZ: siz, CON: 50, POW: 50, DEX: 50, EDU: 50 })
}

// game-rules.md "DB / BUILD" 표
//   2~64 -2/-2 | 65~84 -1/-1 | 85~124 0/0
//   125~164 1d4/1 | 165~204 1d6/2 | 205~284 2d6/3
describe('BUILD — 백로그 1-3 필수 경계값', () => {
  it.each([
    [64, -2],
    [65, -1],
    [84, -1],
    [85, 0],
    [124, 0],
    [125, 1],
    [164, 1],
    [165, 2],
    [204, 2],
  ])('STR+SIZ %i -> BUILD %i', (total, expected) => {
    expect(derivedFor(total - 50, 50).BUILD).toBe(expected)
  })
})

describe('DB / BUILD — 2단계에서 해제할 케이스', () => {
  // 2-4: DB 표가 한 칸씩 밀려 있다. 65~84가 '0', 85~124가 '1d4'를 반환한다.
  it('[2-4] DB 표 경계값', () => {
    expect(derivedFor(14, 50).DB).toBe('-2')  // 64
    expect(derivedFor(15, 50).DB).toBe('-1')  // 65
    expect(derivedFor(34, 50).DB).toBe('-1')  // 84
    expect(derivedFor(35, 50).DB).toBe('0')   // 85
    expect(derivedFor(74, 50).DB).toBe('0')   // 124
    expect(derivedFor(75, 50).DB).toBe('1d4') // 125
    expect(derivedFor(114, 50).DB).toBe('1d4') // 164
    expect(derivedFor(115, 50).DB).toBe('1d6') // 165
    expect(derivedFor(154, 50).DB).toBe('1d6') // 204
    expect(derivedFor(155, 50).DB).toBe('2d6') // 205
  })

  // 2-4: 205~284 구간이 없어 BUILD가 2에 머문다.
  it('[2-4] STR+SIZ 205 이상은 BUILD 3', () => {
    expect(derivedFor(155, 50).BUILD).toBe(3) // 205
    expect(derivedFor(184, 100).BUILD).toBe(3) // 284
  })

  // 2-8: calcDerived가 skills를 받지 않아 maxSAN이 항상 99다.
  it.skip('[2-8] maxSAN = 99 - 크툴루신화', () => {
    const d = calcDerived(
      { STR: 50, SIZ: 50, CON: 50, POW: 50, DEX: 50, EDU: 50 },
      { '크툴루신화': 10 },
    )
    expect(d.maxSAN).toBe(89)
  })
})

// game-rules.md "파생수치" 절
describe('calcDerived — HP / MP / SAN', () => {
  it('HP = floor((CON + SIZ) / 10)', () => {
    expect(calcDerived({ CON: 50, SIZ: 50, POW: 50, STR: 50, DEX: 50, EDU: 50 }).HP).toBe(10)
    expect(calcDerived({ CON: 55, SIZ: 54, POW: 50, STR: 50, DEX: 50, EDU: 50 }).HP).toBe(10)
    expect(calcDerived({ CON: 55, SIZ: 55, POW: 50, STR: 50, DEX: 50, EDU: 50 }).HP).toBe(11)
  })

  it('MP = floor(POW / 5)', () => {
    expect(calcDerived({ CON: 50, SIZ: 50, POW: 50, STR: 50, DEX: 50, EDU: 50 }).MP).toBe(10)
    expect(calcDerived({ CON: 50, SIZ: 50, POW: 54, STR: 50, DEX: 50, EDU: 50 }).MP).toBe(10)
    expect(calcDerived({ CON: 50, SIZ: 50, POW: 55, STR: 50, DEX: 50, EDU: 50 }).MP).toBe(11)
  })

  it('SAN 시작값 = POW (×5 하지 않는다)', () => {
    expect(calcDerived({ CON: 50, SIZ: 50, POW: 65, STR: 50, DEX: 50, EDU: 50 }).SAN).toBe(65)
  })

  it('크툴루신화가 0이면 maxSAN은 99', () => {
    expect(calcDerived({ CON: 50, SIZ: 50, POW: 50, STR: 50, DEX: 50, EDU: 50 }).maxSAN).toBe(99)
  })
})

// game-rules.md MOV 세 분기
//   STR과 DEX가 둘 다 SIZ 미만 -> 7
//   하나가 SIZ 이상이거나 셋이 같음 -> 8
//   STR과 DEX가 둘 다 SIZ 초과 -> 9
describe('calcDerived — MOV 세 분기', () => {
  function movFor(str, dex, siz) {
    return calcDerived({ STR: str, DEX: dex, SIZ: siz, CON: 50, POW: 50, EDU: 50 }).MOV
  }

  it('STR과 DEX가 둘 다 SIZ 미만이면 7', () => {
    expect(movFor(50, 50, 60)).toBe(7)
  })

  it('STR과 DEX가 둘 다 SIZ 초과면 9', () => {
    expect(movFor(70, 70, 60)).toBe(9)
  })

  it('셋이 같으면 8', () => {
    expect(movFor(60, 60, 60)).toBe(8)
  })
})

describe('MOV — 2단계에서 해제할 케이스', () => {
  // 2-6: 조건이 ||라서 하나만 SIZ를 초과해도 9가 된다.
  it('[2-6] 하나만 SIZ 이상이면 8', () => {
    const movFor = (str, dex, siz) =>
      calcDerived({ STR: str, DEX: dex, SIZ: siz, CON: 50, POW: 50, EDU: 50 }).MOV
    expect(movFor(70, 50, 60)).toBe(8)
    expect(movFor(50, 70, 60)).toBe(8)
  })
})

describe('getBaseSkills', () => {
  it('기술 기본값이 game-rules.md 표와 같다', () => {
    const s = getBaseSkills({ DEX: 60 })
    expect(s['발견']).toBe(25)
    expect(s['도서관사용']).toBe(20)
    expect(s['심리학']).toBe(10)
    expect(s['은신']).toBe(20)
    expect(s['언변']).toBe(15)
    expect(s['응급처치']).toBe(30)
    expect(s['근접전투']).toBe(25)
    expect(s['권총']).toBe(20)
    expect(s['소총']).toBe(25)
    expect(s['크툴루신화']).toBe(0)
    expect(s['법률']).toBe(5)
    expect(s['역사']).toBe(5)
    expect(s['신용']).toBe(15)
    expect(s['언어(외국어)']).toBe(1)
    expect(s['사진술']).toBe(5)
    expect(s['의학']).toBe(1)
  })
})

describe('getBaseSkills — 2단계에서 해제할 케이스', () => {
  // 2-7: 회피가 floor(DEX*2/5)로 계산된다. 룰은 floor(DEX/2).
  it.skip('[2-7] 회피 = floor(DEX / 2)', () => {
    expect(getBaseSkills({ DEX: 60 })['회피']).toBe(30)
    expect(getBaseSkills({ DEX: 55 })['회피']).toBe(27)
  })
})

describe('rollAbilities — 2단계에서 해제할 케이스', () => {
  // 2-5: SIZ, INT, EDU는 (2d6+6)×5로 굴려야 한다. 현재는 전부 3d6×5다.
  // 난수원을 최소로 고정하면 3d6×5는 15, (2d6+6)×5는 40이 된다.
  it('[2-5] SIZ / INT / EDU는 (2d6+6)×5', () => {
    setRng(() => 0)
    const a = rollAbilities()
    expect(a.STR).toBe(15)
    expect(a.SIZ).toBe(40)
    expect(a.INT).toBe(40)
    expect(a.EDU).toBe(40)
  })
})
