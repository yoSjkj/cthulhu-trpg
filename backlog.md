# 백로그

총 48개 항목, 8단계. 각 단계가 끝나면 게임이 동작하는 상태를 유지한다.
위에서부터 순서대로 진행한다. 단계를 건너뛰지 않는다.

2단계부터는 한 세션에 한 항목만 작업한다.

---

## 0단계 · 문서 정비

**목표:** Claude Code가 참조할 정답지를 확정한다. 이후 모든 작업의 전제.

| # | 작업 |
|---|---|
| 0-1 | `CLAUDE.md`(루트) + `docs/` 문서 5개 배치 (tone, game-rules, architecture, scenario-spec, backlog) |
| 0-2 | `CoC_PWA_기획안.md`에서 룰 수치 섹션 전체 삭제. 설계 의도와 게임 흐름만 남긴다 |
| 0-3 | `DEV_LOG.md` 삭제. 코드보다 낡아 정보 가치가 없다 |
| 0-4 | `README.md` 작성 — 소개, 실행법, 문서 지도 |
| 0-5 | `.gitignore`에 `.env` 계열 확인 |

---

## 1단계 · 안전망

**목표:** 룰 수정을 안전하게 만든다. 게임 동작은 바뀌지 않는다.
**여기가 전체에서 가장 중요하다.** 이것 없이 2단계를 하면 도박이 된다.

| # | 파일 | 작업 |
|---|---|---|
| 1-1 | `dice.js` | RNG 주입 가능하게 변경. `let rng = Math.random` + `setRng(fn)` export. 모든 굴림이 이를 경유 |
| 1-2 | — | Vitest 도입. `npm run test` 스크립트 추가 |
| 1-3 | `engine/*.test.js` | 경계값 테스트 작성. 아래 목록 필수 |

**1-3 필수 테스트 케이스**

- `getCheckResult`: roll 1 / 96 / 100, 기술치 49·50·99·100 조합
- `calcDBAndBuild`: STR+SIZ = 64·65·84·85·124·125·164·165·204·205
- `calcDerived`: HP, MP, SAN, MOV 세 분기
- `rollDamage`: 정상 식, 대문자 `1D6`, 상수 `2`, 공백 포함, 파싱 실패
- `performSanCheck` / `checkInsanity`: 임계값 경계
- `useLuck`: normal / hard / extreme 각 난이도의 비용

---

## 2단계 · 룰 버그

**목표:** `docs/game-rules.md`와 코드를 일치시킨다.
각 항목은 테스트를 먼저 작성한 뒤 수정한다.

### check.js

| # | 현상 | 수정 |
|---|---|---|
| 2-1 | `critical = skillValue < 50 ? 1 : ...` — 기술치 50 미만이면 대성공이 roll 1로만 한정됨 | 하한 조건 제거. `Math.floor(skillValue / 5)` |
| 2-2 | `regular` 판정이 `fumble`보다 먼저 평가됨 — 기술치 100 이상에서 roll 100이 성공 처리 | fumble 체크를 위로 이동 |
| 2-3 | `useLuck`이 난이도를 무시하고 `skillValue` 기준으로 비용 계산 | `difficulty` 인자 추가. 목표치 기준 계산. 대실패·SAN 굴림 사용 차단 |

### character.js

| # | 현상 | 수정 |
|---|---|---|
| 2-4 | DB 표가 한 칸씩 밀려 있음. BUILD는 정상 | `game-rules.md` 표로 교체. 205~284 구간 추가 |
| 2-5 | SIZ·INT·EDU가 3d6×5로 굴려짐 | `(2d6+6)×5`로 변경. `dice.js`에 헬퍼 추가 |
| 2-6 | MOV 조건이 `\|\|` — 하나만 SIZ 초과해도 9 | `&&`로 변경 |
| 2-7 | 회피 기본값이 `floor(DEX*2/5)` | `floor(DEX/2)` |
| 2-8 | `maxSAN: Math.min(99, 99)` — 크툴루신화 반영 안 됨 | `calcDerived`가 skills를 받아 `99 - 크툴루신화` 계산 |

### sanity.js

| # | 현상 | 수정 |
|---|---|---|
| 2-9 | `Game.jsx handleRollSan`이 `applySanLoss`에 현재 SAN을 넘겨, `checkInsanity`의 `startSAN`이 계속 낮아짐 → 부정기 광기가 매 턴 발동 | store의 `sessionStartSAN`을 전달. **필드는 이미 존재함** |
| 2-10 | `applySanLoss`가 갱신된 `sessionLoss`를 반환하지 않음 | 반환값에 포함 |
| 2-11 | `permanentInsanity` 필드가 선언만 되고 설정되지 않음 | 채우거나 제거 |
| 2-12 | 새 SAN이 `maxSAN`으로 클램프되지 않음 | 클램프 추가 |

### dice.js

| # | 현상 | 수정 |
|---|---|---|
| 2-13 | `rollDamage` 파싱 실패 시 조용히 0 반환 | 실패 시 throw 또는 경고 로그. 대문자 `D`, 앞뒤 공백 허용 |
| 2-14 | `rollWithDB`가 `db.includes('d')` — 숫자 입력 시 TypeError | 문자열 강제 또는 타입 가드 |

### CharacterCreate.jsx

| # | 현상 | 수정 |
|---|---|---|
| 2-15 | `adjustOcc`·`setOcc`의 90% 상한 검사가 `intAlloc`을 무시. 4단계에서 배분 후 3단계로 돌아오면 합계 90 초과 가능 | `getSkillValue` 기준으로 검사 |
| 2-16 | 재굴림 시 `occAlloc`·`intAlloc`이 초기화되지 않음. EDU/INT가 낮아지면 남은 포인트가 음수인 채로 게임 시작 가능 | `handleReroll`에서 배분 초기화 |
| 2-17 | `occPoints`를 `abilities.EDU * 4`로 직접 계산. `OCCUPATIONS.pointsFormula` 미사용 | `pointsFormula` 사용 |

---

## 3단계 · 톤 즉효 + 진행 차단 버그

**목표:** 체감이 가장 빨리 바뀌는 것과, 게임이 멈추는 버그.

| # | 파일 | 작업 |
|---|---|---|
| 3-1 | `Game.jsx`, `LogEntry` | 엔딩 텍스트가 `addLog('system', ...)`으로 출력돼 작은 회색 이탤릭 박스로 표시됨. `ending` 전용 스타일 추가 |
| 3-2 | `keeper.js` | SAN 비율로 정신 상태 구간(안정/동요/왜곡/해리)을 코드가 계산해 프롬프트에 전달. `game-rules.md` 표 참조 |
| 3-3 | `Game.jsx`, `CharacterCreate.jsx` | 능력치 한글 표기 통일. POW '의지', CON '체력', SIZ '체격'. `ABILITY_MAP`과 일치시킬 것. 두 파일의 `STAT_LABELS`·`CharacterSheet` 모두 |
| 3-4 | `Game.jsx`, `gameStore.js` | **[진행 차단]** `pressure`가 `s.turn === freshTurns`로 매칭. `turnsPlayed`는 `addLog('action')`일 때만 증가하므로, 같은 턴의 모든 `callKeeper`에서 재발동. 15턴 도달 시 SAN 체크 무한 루프. 발동 이력을 store에 저장하고 `>=` + 미발동 조건으로 변경 |

---

## 4단계 · 전투

**목표:** 전투 피해를 코드가 계산하게 한다. 현재는 AI가 결정하고 있어 제1원칙이 뒤집힌 상태다.

| # | 파일 | 작업 |
|---|---|---|
| 4-1 | 시나리오 JSON | 적 스탯 스키마 확정. `maxHP`, `DEX`, `skills`, `weapon` 필수. `scenario-spec.md` 준수. 기존 시나리오 갱신 |
| 4-2 | `combat.js` | `performEnemyAttack()` 추가. 적 무기·기술로 판정하고 피해 계산 |
| 4-3 | `Game.jsx` | 전투 라운드 루프 구현. 플레이어 행동 → 적 행동(코드) → 결과를 AI에 전달. **코드 작성 전 설계를 먼저 설명할 것** |
| 4-4 | `combat.js`, `Game.jsx` | 회피를 실제 방어로 연결. 현재는 굴림만 하고 아무것도 막지 못함 |
| 4-5 | `combat.js` | 중상 판정 수정. 한 번의 피해가 maxHP 절반 이상일 때. CON 판정 기절, maxHP 이상 즉사 추가 |
| 4-6 | `combat.js` | `Math.random()` 직접 호출 제거. `dice.js` 경유 |

**보류:** 다수 적(`count`) 처리는 4단계 완료 후 별도 판단.
1대1이 안정되기 전에 손대지 않는다.

---

## 5단계 · 끊긴 배선

**목표:** 시나리오에 정의됐지만 동작하지 않는 것들을 연결한다.

| # | 현상 | 수정 |
|---|---|---|
| 5-1 | 크툴루신화가 절대 오르지 않음. `mythos_gains`가 `keeper_notes`에 산문으로만 존재 | clue와 ending에 `mythos_gain` 필드. 코드가 적용. maxSAN 연동 |
| 5-2 | `requires_ritual` 조건이 프롬프트로만 전달됨. AI가 무시하면 조건 미충족 엔딩이 발동 | `trigger_ending` 처리 시 코드가 조건 검증. 미충족이면 무시 |
| 5-3 | `hp_loss.formula`가 무검증으로 `rollDamage`에 전달됨 | 허용 주사위 식 화이트리스트 |
| 5-4 | `move_to`가 `connections` 검증 없이 처리됨 | 인접 장소인지 확인 |
| 5-5 | `findUnrevealedClue`가 같은 기술의 첫 단서를 집음 — 종을 조사했는데 바닥 문양이 나옴 | 인터랙션 대상 또는 행동 문맥과 매칭 |
| 5-6 | 엔딩의 `injury`, `san_final`, `mythos_gain` 미처리 | 구조화된 필드로 받아 적용 |
| 5-7 | `sanity.js`의 `rollTempInsanityEffect`가 `Math.random()` 직접 호출 | `dice.js` 경유 |

---

## 6단계 · 점진적 정보 공개

**목표:** 키퍼가 결말을 미리 알지 못하게 한다. 톤에 직결된다.

| # | 파일 | 작업 |
|---|---|---|
| 6-1 | `keeper.js` | 전체 단서 목록 전달 중단. 공개된 단서 + 현재 장소의 미공개 단서만 |
| 6-2 | `keeper.js` | 전체 장소 목록 전달 중단. 현재 장소와 인접 장소만. `visible_from_start` 반영 |
| 6-3 | `keeper.js` | `keeper_notes`를 키 포함해 전달. 현재는 값만 이어붙임. `scenario-spec.md` 스키마 준수 |
| 6-4 | `keeper.js` | 시스템 프롬프트를 정적/동적으로 분리. 정적 부분을 앞에 두어 캐싱 가능하게. **코드 작성 전 설계를 먼저 설명할 것** |

---

## 7단계 · 세션 영속화

**목표:** 새로고침해도 게임이 이어지게 한다. 배포하려면 필수.

| # | 현상 | 수정 |
|---|---|---|
| 7-1 | `messages`, `historySummary`, `insanityTurnsLeft`, `combatEnemy`, `checkedLocations`가 `Game.jsx`의 `useState` — 새로고침하면 AI가 대화 맥락을 전부 잃음 | store로 이동해 persist |
| 7-2 | persist에 `version`/`migrate` 없음 — 스키마 변경 시 기존 세이브가 깨짐 | 추가 |
| 7-3 | `MAX_HISTORY: 20`, `SUMMARY_THRESHOLD: 40` — 메시지 25~39개 구간에서 앞부분이 전달되지도 요약되지도 않음 | 요약이 잘려나가는 구간을 항상 덮도록 값 조정 |
| 7-4 | store의 `combat` 필드가 사용되지 않음 (`Game.jsx`는 로컬 `combatEnemy` 사용) | 7-1 완료 시 정리 |

---

## 8단계 · OpenRouter 이관

**목표:** 프로바이더 교체. 기계적 작업이라 마지막이 안전하다.

| # | 파일 | 작업 |
|---|---|---|
| 8-1 | `api/` | `callLLM({ apiKey, model, system, messages, maxTokens, signal })` 어댑터 추출. 텍스트 반환 |
| 8-2 | `api/`, `ApiSetup.jsx` | 엔드포인트·인증·요청 형식 변경. system을 `messages[0]`으로. 응답은 `choices[0].message.content` |
| 8-3 | `api/` | 모델 슬러그 상수 분리 |
| 8-4 | `keeper.js` | `summarizeHistory`에 타임아웃 추가. 현재 없어서 무한 대기 가능 |
| 8-5 | `keeper.js` | `normalizeKeeperResponse()` — 모든 필드 기본값 채움. 성공·실패 경로 공통. 폴백 객체에 `enemy` 누락됨 |
| 8-6 | `keeper.js` | 429/5xx 지수 백오프 재시도 |

---

## 완료 조건

각 항목 종료 시:

- `npm run test` 통과
- `npm run build` 통과
- 룰을 건드렸다면 대응 테스트가 존재
- 항목 단위로 커밋