// 난수원. 테스트에서 setRng로 교체해 굴림을 고정한다.
// 이 모듈의 모든 굴림은 roll()을 경유하므로 주입 지점은 여기 하나다.
let rng = Math.random

// 난수원 교체. 0 이상 1 미만을 반환하는 함수를 넘긴다.
// 테스트 후에는 setRng(Math.random)으로 되돌린다.
export function setRng(fn) {
  rng = fn
}

// 기본 주사위 굴림
export function roll(sides) {
  return Math.floor(rng() * sides) + 1
}

// d100 굴림 (1~100)
export function rollD100() {
  return roll(100)
}

// 3d6×5 (STR, CON, DEX, APP, POW, LUCK 생성)
export function roll3d6x5() {
  return (roll(6) + roll(6) + roll(6)) * 5
}

// (2d6+6)×5 (SIZ, INT, EDU 생성) — game-rules.md "능력치 생성"
export function roll2d6plus6x5() {
  return (roll(6) + roll(6) + 6) * 5
}

// 보너스 주사위: d100 두 번 굴려 낮은 값
export function rollBonus() {
  return Math.min(rollD100(), rollD100())
}

// 패널티 주사위: d100 두 번 굴려 높은 값
export function rollPenalty() {
  return Math.max(rollD100(), rollD100())
}

// 피해 공식 파서: "1d6+2", "1d3", "2d6", "2"(상수) 등
// 대문자 D와 공백을 허용한다. ("1D6", " 1d6 ", "1d6 + 2")
//
// 파싱에 실패하면 throw한다. 조용히 0을 반환하면 피해가 사라져도 아무도 모른다.
// AI가 돌려준 공식은 Game.jsx의 try/catch가 받아 [오류] 로그로 보여준다.
// (시나리오·AI 입력의 사전 검증은 백로그 5-3)
export function rollDamage(formula) {
  const normalized = String(formula).replace(/\s+/g, '').toLowerCase()

  // 주사위 없는 상수식. 음수는 0으로 묶는다. (주사위식과 같은 규칙)
  if (/^[+-]?\d+$/.test(normalized)) {
    return Math.max(0, parseInt(normalized))
  }

  const match = normalized.match(/^(\d+)d(\d+)([+-]\d+)?$/)
  if (!match) {
    throw new Error(`피해 공식을 해석할 수 없습니다: ${JSON.stringify(formula)}`)
  }

  const [, count, sides, mod] = match
  let total = 0
  for (let i = 0; i < parseInt(count); i++) {
    total += roll(parseInt(sides))
  }
  if (mod) total += parseInt(mod)
  return Math.max(0, total)
}

// DB(데미지 보너스) 적용
// DB가 "-2" 같은 문자열일 수도 있고, "1d4", "1d6" 같은 주사위일 수도 있음
//
// game-rules.md는 DB를 항상 문자열로 저장하라고 정하지만, 숫자가 들어와도 깨지지 않게 한다.
// db.includes를 바로 부르면 숫자에서 TypeError가 난다.
export function rollWithDB(baseFormula, db) {
  const base = rollDamage(baseFormula)
  if (db === null || db === undefined || db === '') return base

  // 대문자 D도 주사위로 본다. 소문자만 보면 "1D4"가 parseInt로 떨어져 1이 된다.
  const dbStr = String(db).trim().toLowerCase()
  if (dbStr === '0') return base
  if (dbStr.includes('d')) {
    return Math.max(0, base + rollDamage(dbStr))
  }
  return Math.max(0, base + parseInt(dbStr))
}
