import { rollD100, rollWithDB, rollDamage } from './dice.js'
import { getCheckResult, isSuccess } from './check.js'

// 기본 무기 정의
export const WEAPONS = {
  주먹: { skill: '근접전투', damage: '1d3',    maxDmg: 3,  useDB: true  },
  칼:   { skill: '근접전투', damage: '1d4+2',  maxDmg: 6,  useDB: true  },
  권총: { skill: '권총',     damage: '1d10',   maxDmg: 10, useDB: false },
  소총: { skill: '소총',     damage: '2d6+4',  maxDmg: 16, useDB: false },
}

// DEX 기준 행동 순서 결정
export function getCombatOrder(combatants) {
  return [...combatants].sort((a, b) => b.DEX - a.DEX)
}

// 공격 판정
export function performAttack(attacker, weapon, bonusDice = 0) {
  const skillValue = attacker.skills?.[weapon.skill] ?? 25
  const roll = bonusDice > 0
    ? Math.min(...Array(2).fill(0).map(() => Math.floor(Math.random() * 100) + 1))
    : bonusDice < 0
    ? Math.max(...Array(2).fill(0).map(() => Math.floor(Math.random() * 100) + 1))
    : Math.floor(Math.random() * 100) + 1

  const result = getCheckResult(roll, skillValue)
  const success = isSuccess(result)

  let damage = 0
  let canDodge = true

  if (result === 'critical') {
    // 대성공: 최대 피해 + DB
    damage = weapon.useDB
      ? weapon.maxDmg + (attacker.DB?.includes('d') ? rollDamage(attacker.DB) : parseInt(attacker.DB || '0'))
      : weapon.maxDmg
    canDodge = false
  } else if (result === 'hard') {
    // 어려운 성공: 피해 굴림 + DB, 회피 불가
    damage = weapon.useDB ? rollWithDB(weapon.damage, attacker.DB) : rollDamage(weapon.damage)
    canDodge = false
  } else if (result === 'regular') {
    // 보통 성공: 피해 굴림 + DB, 회피 가능
    damage = weapon.useDB ? rollWithDB(weapon.damage, attacker.DB) : rollDamage(weapon.damage)
    canDodge = true
  }

  return { roll, result, success, damage, canDodge }
}

// 회피 판정
export function performDodge(defender) {
  const skillValue = defender.skills?.['회피'] ?? (defender.DEX * 2)
  const roll = Math.floor(Math.random() * 100) + 1
  const result = getCheckResult(roll, skillValue)
  const success = isSuccess(result)
  return { roll, result, success }
}

// 피해 적용 + 중상/사망 판정
export function applyDamage(character, damage) {
  const newHP = Math.max(0, character.HP - damage)
  const majorWound = newHP <= Math.floor(character.maxHP / 2)
  const dead = newHP <= 0

  return {
    ...character,
    HP: newHP,
    isAlive: !dead,
    majorWound: majorWound && !dead,
  }
}
