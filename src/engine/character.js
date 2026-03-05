import { roll3d6x5, roll } from './dice.js'

// DB/BUILD 계산표 (CoC 7판)
function calcDBAndBuild(str, siz) {
  const total = str + siz
  if (total <= 64)  return { db: '-2',  build: -2 }
  if (total <= 84)  return { db: '0',   build: -1 }
  if (total <= 124) return { db: '1d4', build: 0  }
  if (total <= 164) return { db: '1d6', build: 1  }
  return              { db: '2d6', build: 2  }
}

// 8개 능력치 + LUCK 굴림
export function rollAbilities() {
  return {
    STR: roll3d6x5(),
    CON: roll3d6x5(),
    SIZ: roll3d6x5(),
    DEX: roll3d6x5(),
    APP: roll3d6x5(),
    INT: roll3d6x5(),
    POW: roll3d6x5(),
    EDU: roll3d6x5(),
    LUCK: roll3d6x5(),
  }
}

// 파생수치 계산
export function calcDerived(abilities) {
  const { CON, SIZ, POW, STR, DEX, EDU } = abilities
  const { db, build } = calcDBAndBuild(STR, SIZ)
  return {
    HP: Math.floor((CON + SIZ) / 10),
    MP: Math.floor(POW / 5),
    SAN: POW,
    maxSAN: Math.min(99, 99), // 크툴루신화 기술 오르면 감소
    DB: db,
    BUILD: build,
    MOV: DEX < SIZ && STR < SIZ ? 7
        : DEX > SIZ || STR > SIZ ? 9
        : 8,
  }
}

// 전체 기술 목록 및 기본값
export function getBaseSkills(abilities) {
  const { DEX } = abilities
  return {
    '회피':       Math.floor(DEX * 2 / 5),
    '발견':       25,
    '도서관사용': 20,
    '심리학':     10,
    '은신':       20,
    '언변':       15,
    '응급처치':   30,
    '근접전투':   25,
    '권총':       20,
    '소총':       25,
    '크툴루신화': 0,
    '법률':       5,
    '역사':       5,
    '신용':       15,
    '언어(외국어)': 1,
    '사진술':     5,
    '의학':       1,
  }
}

// 직업 정의
export const OCCUPATIONS = {
  탐정: {
    label: '탐정',
    skills: ['발견', '심리학', '언변', '도서관사용', '은신', '법률'],
    pointsFormula: (edu) => edu * 4,
  },
  교수: {
    label: '교수',
    skills: ['도서관사용', '언어(외국어)', '역사', '신용', '심리학'],
    pointsFormula: (edu) => edu * 4,
  },
  기자: {
    label: '기자',
    skills: ['언변', '심리학', '도서관사용', '은신', '사진술'],
    pointsFormula: (edu) => edu * 4,
  },
  의사: {
    label: '의사',
    skills: ['의학', '응급처치', '심리학', '언변', '도서관사용'],
    pointsFormula: (edu) => edu * 4,
  },
  목사: {
    label: '목사',
    skills: ['언변', '심리학', '역사', '도서관사용', '신용'],
    pointsFormula: (edu) => edu * 4,
  },
  군인: {
    label: '군인',
    skills: ['근접전투', '권총', '소총', '응급처치', '은신'],
    pointsFormula: (edu) => edu * 4,
  },
}

// 완성된 캐릭터 객체 생성
export function buildCharacter({ name, abilities, occupation, skills }) {
  const derived = calcDerived(abilities)
  return {
    name,
    occupation,
    abilities,
    skills,
    HP: derived.HP,
    maxHP: derived.HP,
    MP: derived.MP,
    maxMP: derived.MP,
    SAN: derived.SAN,
    maxSAN: derived.maxSAN,
    LUCK: abilities.LUCK,
    DB: derived.DB,
    BUILD: derived.BUILD,
    MOV: derived.MOV,
    // 광기 상태
    temporaryInsanity: null,  // { description, endsAt }
    indefiniteInsanity: null, // { description }
    // 게임 진행용
    isAlive: true,
    isSane: true,
  }
}
