// 기본 주사위 굴림
export function roll(sides) {
  return Math.floor(Math.random() * sides) + 1
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
