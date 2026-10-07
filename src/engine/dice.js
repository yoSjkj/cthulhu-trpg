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

// 3d6×5 (능력치 생성)
export function roll3d6x5() {
  return (roll(6) + roll(6) + roll(6)) * 5
}

// 보너스 주사위: d100 두 번 굴려 낮은 값
export function rollBonus() {
  return Math.min(rollD100(), rollD100())
}

// 패널티 주사위: d100 두 번 굴려 높은 값
export function rollPenalty() {
  return Math.max(rollD100(), rollD100())
}

// 피해 공식 파서: "1d6+2", "1d3", "2d6" 등
export function rollDamage(formula) {
  const match = formula.match(/^(\d+)d(\d+)([+-]\d+)?$/)
  if (!match) return 0
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
export function rollWithDB(baseFormula, db) {
  let base = rollDamage(baseFormula)
  if (!db || db === '0') return base
  if (db.includes('d')) {
    return Math.max(0, base + rollDamage(db))
  }
  return Math.max(0, base + parseInt(db))
}
