# CoC AI 키퍼 TRPG — 개발 진행 로그

## 개발 원칙
- 코딩 전 반드시 설계 공유 → 승인 후 구현
- 안정성 > AI 품질 > 확장성
- MVP 범위 초과 기능 추가 금지

---

## 전체 구현 현황

### Phase 1 — engine/ (룰 엔진)
> 순수 JS 로직. UI 없음. 수치 계산 전담.

| 파일 | 상태 | 내용 |
|---|---|---|
| `src/engine/dice.js` | ✅ 완료 | d100, 보너스/패널티 주사위, 피해 공식 파서(`1d6+2` 등), DB 적용 |
| `src/engine/character.js` | ✅ 완료 | 능력치 굴림(3d6×5), 파생수치(HP/MP/SAN/DB/BUILD/MOV), 기술 초기값, 직업 6개, 캐릭터 객체 생성 |
| `src/engine/check.js` | ✅ 완료 | 판정 등급(Critical/Hard/Regular/Fail/Fumble), 난이도별 통과 판정, LUCK 소비 |
| `src/engine/sanity.js` | ✅ 완료 | SAN 체크, 일시적/부정기 광기 판정, 광기 효과 목록, SAN 손실 적용 |
| `src/engine/combat.js` | ✅ 완료 | 무기 4종(주먹/칼/권총/소총), DEX 순서, 공격/회피 판정, 피해 적용, 중상/사망 |

### Phase 2 — store/ + api/
> 게임 상태 관리 + Claude AI 키퍼 연동.

| 파일 | 상태 | 내용 |
|---|---|---|
| `src/store/gameStore.js` | ✅ 완료 | **Zustand + persist** 리팩토링. useGameStore(게임상태) + useSetupStore(API키/시나리오). log 최근 200개 제한 |
| `src/api/keeper.js` | ✅ 완료 | AbortController 30초 타임아웃 추가. 시스템 프롬프트에 현재 장소 + san_check 정보 포함 |

### Phase 3 — pages/ (UI)
> React 화면 구성.

| 파일 | 상태 | 내용 |
|---|---|---|
| `src/pages/ApiSetup.jsx` | ✅ 완료 | API 키 입력 + 시나리오 선택 |
| `src/pages/CharacterCreate.jsx` | ✅ 완료 | Step1~5 (능력치 굴림/직업/직업포인트/관심포인트/확인), SkillRow 컴포넌트 |
| `src/pages/Game.jsx` | ✅ 완료 | Zustand 직접 구독. stale closure 해결(getState). LogEntry memo + key 수정. 전투 UI 구현. 장소 진입 시 JSON san_check 자동 발동 |
| `src/pages/GameOver.jsx` | ✅ 완료 | 결과 화면 (생존 턴, 최저 SAN, 발견 단서, 크툴루신화 수치) |

### 시나리오 데이터
| 파일 | 상태 | 내용 |
|---|---|---|
| `src/data/scenarios/test_scenario.json` | ✅ 완료 | 테스트용 더미 (장소 3개, 단서 2개, SAN 체크 1개) |
| `src/data/scenarios/poisoned_soup.json` | ⏳ 예정 | "독이 든 스프" — 오빠 작성 예정 |

---

## 확정된 설계

### 직업 목록
| 직업 | 기술 풀 |
|---|---|
| 탐정 | 발견, 심리학, 언변, 도서관사용, 은신, 법률 |
| 교수 | 도서관사용, 언어(외국어), 역사, 신용, 심리학 |
| 기자 | 언변, 심리학, 도서관사용, 은신, 사진술 |
| 의사 | 의학, 응급처치, 심리학, 언변, 도서관사용 |
| 목사 | 언변, 심리학, 역사, 도서관사용, 신용 |
| 군인 | 근접전투, 권총, 소총, 응급처치, 은신 |

### 캐릭터 생성 흐름
1. 능력치 굴림 — 전체 재굴림 **3회 제한**
2. 직업 선택
3. 직업 포인트 배분 (EDU×4, 직업 기술만, **1% 단위**, 상한 90%)
4. 개인관심 포인트 배분 (INT×2, 전 기술, 1% 단위)
5. 확인 & 시작

### 판정 시스템 (CoC 7판 d100)
| 등급 | 조건 |
|---|---|
| 대성공 | roll = 1, 또는 roll ≤ floor(기술치/5) |
| 어려운 성공 | roll ≤ floor(기술치/2) |
| 보통 성공 | roll ≤ 기술치 |
| 대실패 | 기술치 < 50 → roll ≥ 96 / 기술치 ≥ 50 → roll = 100 |
| 실패 | 그 외 |

### 광기 시스템
| 종류 | 발동 조건 |
|---|---|
| 일시적 광기 | 한 번 SAN 체크에서 5 이상 손실 |
| 부정기 광기 | 세션 누적 손실 ≥ 세션 시작 SAN의 1/5 |
| 영구 광기 | SAN = 0 → 게임오버 |

---

## 빌드 기록
| 일자 | 결과 | 비고 |
|---|---|---|
| 2026-03-05 | ✅ 성공 | 프로젝트 초기화 (Vite + React + Tailwind v4 + PWA) |
| 2026-03-05 | ✅ 성공 | Phase 1 engine/ 전체 완료 후 빌드 확인 |
| 2026-03-05 | ✅ 성공 | Phase 2 store/ + api/ + 더미 시나리오 완료 후 빌드 확인 |
| 2026-03-05 | ✅ 성공 | Phase 3 pages/ 전체 완료 후 빌드 확인 |
| 2026-03-05 | ✅ 성공 | Zustand 리팩토링 + 5개 버그 수정 완료 후 빌드 확인 |
