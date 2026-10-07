# 백로그

총 59개 항목, 9단계(0~8). 각 단계가 끝나면 게임이 동작하는 상태를 유지한다.
(2026-10-07 전투 생명주기 4-7 추가로 58 → 59)
위에서부터 순서대로 진행한다. 단계를 건너뛰지 않는다.

한 세션의 작업량은 컨텍스트로 판단한다. 항목 수로 세지 않는다. (`CLAUDE.md` 5번)

- 0~1단계: 문서·테스트 인프라라 묶어서 진행했다.
- 2단계: **파일 단위**로 묶는다. `check.js` / `character.js` / `sanity.js` / `dice.js` / `CharacterCreate.jsx` 5묶음.
- 3단계부터: 한 항목씩.

묶는 건 세션이지 커밋이 아니다. 항목마다 테스트를 해제하고 항목마다 커밋한다.

완료한 항목은 `#` 칸에 ✅를 붙인다. (예: `✅ 0-2`)

## 진행 상황 (2026-10-07, 커밋 `6b8e035`)

**22 / 59 완료 (37.3%)** — 0단계 5개(0-1~0-5), 1단계 3개(1-1~1-3), 2단계 14개(2-1~2-14).
(세는 법: `grep -c '^| ✅' docs/backlog.md`)
테스트 **86개 통과 / 스킵 0개**, 빌드 통과.

**다음 작업: 2-15 ~ 2-17** (`CharacterCreate.jsx` 묶음, 2단계의 마지막).
A안(배분 규칙을 `engine/`으로 추출)으로 결정됐다.
→ 2단계 끝의 **"🔖 인수인계 — 2-15 ~ 2-17"** 블록을 먼저 읽을 것. 재현 경로와 모듈 설계가 들어 있다.

---

## 0단계 · 문서 정비

**목표:** Claude Code가 참조할 정답지를 확정한다. 이후 모든 작업의 전제.

| # | 작업 |
|---|---|
| ✅ 0-1 | `CLAUDE.md`(루트) + `docs/` 문서 5개 배치 (tone, game-rules, architecture, scenario-spec, backlog) |
| ✅ 0-2 | `CoC_PWA_기획안.md`(현 `design.md`)에서 룰 수치 섹션 전체 삭제. 설계 의도와 게임 흐름만 남긴다 |
| ✅ 0-3 | `DEV_LOG.md` 삭제. 코드보다 낡아 정보 가치가 없다 |
| ✅ 0-4 | `README.md` 작성 — 소개, 실행법, 문서 지도 |
| ✅ 0-5 | `.gitignore`에 `.env` 계열 확인 |

---

## 1단계 · 안전망

**목표:** 룰 수정을 안전하게 만든다. 게임 동작은 바뀌지 않는다.
**여기가 전체에서 가장 중요하다.** 이것 없이 2단계를 하면 도박이 된다.

1단계는 테스트 인프라를 세우는 공사다. 따라서 `CLAUDE.md`의 "코드 수정 전 테스트 먼저" 규칙은 1단계에 적용하지 않는다.
1-1(RNG 주입)이 없으면 주사위 결과를 고정할 수 없어 테스트를 쓸 수 없다. 순서는 1-1 → 1-2 → 1-3이 맞다.

| # | 파일 | 작업 |
|---|---|---|
| ✅ 1-1 | `dice.js` | RNG 주입 가능하게 변경. `let rng = Math.random` + `setRng(fn)` export. 모든 굴림이 이를 경유 |
| ✅ 1-2 | — | Vitest 도입. `npm run test` 스크립트 추가 |
| ✅ 1-3 | `engine/*.test.js` | 경계값 테스트 작성. 아래 목록 필수 |

**2단계 버그를 노출하는 테스트는 `it.skip`으로 두고 제목 앞에 담당 항목 번호를 붙였다.**
예: `it.skip('[2-4] DB 표 경계값', ...)`
2단계에서 해당 항목을 고칠 때 `.skip`을 지우면 테스트가 초록이 되어야 한다.
현재 스킵된 19개가 2-1 ~ 2-10, 2-12 ~ 2-14를 덮는다.
2-11(`permanentInsanity` 처리)은 미결정이라 테스트가 없었다. 2026-10-07에 **제거**로 정하고
착수 시점에 테스트를 썼다.
2-15 ~ 2-17은 `CharacterCreate.jsx`라 1-3 시점에 테스트를 쓰지 않았다.
**2026-10-07에 배분 규칙을 `engine/`으로 추출하기로 결정(A안)했으므로 테스트가 가능해진다.**
→ 아래 "🔖 인수인계 — 2-15 ~ 2-17" 블록 참조.

**2026-10-07 현재 스킵 0개.** 2단계 엔진 항목(2-1 ~ 2-14)의 테스트는 모두 해제됐다.
1-3이 미리 깔아둔 테스트 중 **둘은 버그를 구분하지 못해 수치를 고쳐야 했다.**
해제했는데 바로 초록이면 테스트를 의심할 것.
- `[2-9]`: 누적 10이 수정 전(임계값 8)·후(10) 모두 발동 → 누적 8로 조정
- `[2-14]`의 대문자 DB: `parseInt('1D4')`와 최소 굴림 `1d4`가 둘 다 1이라 우연히 통과 → 최대 굴림으로 고정

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
| ✅ 2-1 | `critical = skillValue < 50 ? 1 : ...` — 기술치 50 미만이면 대성공이 roll 1로만 한정됨 | 하한 조건 제거. `Math.floor(skillValue / 5)` |
| ✅ 2-2 | `regular` 판정이 `fumble`보다 먼저 평가됨 — 기술치 100 이상에서 roll 100이 성공 처리 | fumble 체크를 위로 이동 |
| ✅ 2-3 | `useLuck`이 난이도를 무시하고 `skillValue` 기준으로 비용 계산 | `difficulty` 인자 추가. 목표치 기준 계산. 대실패·SAN 굴림 사용 차단 |

### character.js

| # | 현상 | 수정 |
|---|---|---|
| ✅ 2-4 | DB 표가 한 칸씩 밀려 있음. BUILD는 정상 | `game-rules.md` 표로 교체. 205~284 구간 추가 |
| ✅ 2-5 | SIZ·INT·EDU가 3d6×5로 굴려짐 | `(2d6+6)×5`로 변경. `dice.js`에 헬퍼 추가 |
| ✅ 2-6 | MOV 조건이 `\|\|` — 하나만 SIZ 초과해도 9 | `&&`로 변경 |
| ✅ 2-7 | 회피 기본값이 `floor(DEX*2/5)` | `floor(DEX/2)` |
| ✅ 2-8 | `maxSAN: Math.min(99, 99)` — 크툴루신화 반영 안 됨 | `calcDerived`가 skills를 받아 `99 - 크툴루신화` 계산 |

### sanity.js

| # | 현상 | 수정 |
|---|---|---|
| ✅ 2-9 | `Game.jsx handleRollSan`이 `applySanLoss`에 현재 SAN을 넘겨, `checkInsanity`의 `startSAN`이 계속 낮아짐 → 부정기 광기가 매 턴 발동 | store의 `sessionStartSAN`을 전달. **필드는 이미 존재함** |
| ✅ 2-10 | `applySanLoss`가 갱신된 `sessionLoss`를 반환하지 않음 | 반환값에 포함 |
| ✅ 2-11 | `permanentInsanity` 필드가 선언만 되고 설정되지 않음 | **제거**. 영구 광기는 손실 임계값이 아니라 상태라 `checkInsanity` 입력으로 판정 불가. `isSane` → `gameOver('insanity')`로 이미 구현돼 있어 중복 플래그였다 |
| ✅ 2-12 | 새 SAN이 `maxSAN`으로 클램프되지 않음 | 클램프 추가. **생성 시점까지 포함** — `calcDerived`의 `SAN: Math.min(POW, maxSAN)`, `applySanLoss`의 `Math.min(maxSAN, ...)` 두 곳 |

**2-8을 고치면서 드러난 것 → 2-12에서 처리 (2026-10-07):**
`maxSAN = 99 − 크툴루신화`가 실제로 동작하기 시작하자 **SAN이 maxSAN을 넘을 수 있는 경로가 셋** 생겼다.
`game-rules.md`는 "SAN은 maxSAN을 초과할 수 없다"고 정한다.
즉 클램프는 **SAN이 줄 때가 아니라 maxSAN이 줄 때도** 필요하다.

1. ✅ **손실 시점** — `applySanLoss`. 손실 0이어도 maxSAN으로 묶인다.
2. ✅ **생성 시점** — 개인관심 포인트가 `Object.keys(baseSkills)` 전체에 배분되므로 크툴루신화를 올릴 수 있다
   (`CharacterCreate.jsx` 196행). 크툴루신화 80이면 maxSAN은 19인데 SAN은 POW(최대 90)로 시작한다.
   생성은 `buildCharacter` → `calcDerived(abilities, skills)`로 모이므로 `calcDerived` 한 곳에서 묶었다.
3. ⬜ **진행 중** — 5-1로 크툴루신화가 오르면 maxSAN이 내려간다. SAN 손실이 없으면 `applySanLoss`를
   거치지 않으므로 클램프가 걸리지 않는다. **5-1의 요구사항으로 넘겼다.**
   해당 코드가 아직 없어 2-12에서 미리 짜면 검증할 대상이 없는 추측이 된다.

**2-12를 고치면서 남은 것 (미처리):**
maxSAN 계산식이 `character.js calcDerived`와 `sanity.js applySanLoss` **두 곳에 중복**된다.
`applySanLoss`는 `character.skills`만 받고 `abilities`가 없어 `calcDerived`를 호출할 수 없기 때문이다.
식이 바뀌면 두 곳을 같이 고쳐야 한다. 3단계 이후 정리할 때 단일화를 판단한다.

**2-10을 고치면서 드러난 것 (2026-10-07, 미처리):**
`applySanLoss`는 캐릭터 객체를 평평하게 반환하므로(1-3의 테스트가 `.SAN`과 `.sessionLoss`를
같은 객체에서 읽는다) `sessionLoss`가 **캐릭터 필드로 섞여 들어가 persist까지 저장된다.**
게다가 `gameStore.applySanLoss`는 `state.sessionSANLoss + lossAmount`로 누적값을 따로 계산하므로
**누적 손실의 출처가 둘**이다. 지금은 두 값이 같지만 한쪽만 갱신되면 조용히 어긋난다.
반환 모양을 `{ character, sessionLoss }`로 바꾸려면 기존 테스트와 호출부를 모두 고쳐야 해서
2-10 범위를 넘는다. 3단계 이후 store 정리할 때 함께 판단한다.

### dice.js

| # | 현상 | 수정 |
|---|---|---|
| ✅ 2-13 | `rollDamage` 파싱 실패 시 조용히 0 반환 | **throw**로 결정. 대문자 `D`·공백·주사위 없는 상수식 허용 |
| ✅ 2-14 | `rollWithDB`가 `db.includes('d')` — 숫자 입력 시 TypeError | `String(db)`로 강제 + 대문자 `D`도 주사위로 판별. 같은 패턴이 `combat.js` 35행에 남아 있다 → 4-6에서 처리 |

**2-13으로 실제 버그가 고쳐졌다 (2026-10-07):**
상수식을 허용하자 시나리오의 `"loss": { "success": "1", ... }` **4곳**이 살아났다.
(`test_scenario2.json` 25·185·193행, `test_scenario.json` 92행)
구 정규식 `^(\d+)d(\d+)([+-]\d+)?$`는 `"1"`에 매칭되지 않아 조용히 0을 반환했고,
`sanity.js`의 `lossFormula === '0' ? 0 : rollDamage(lossFormula)`는 `"1"`을 걸러내지 않으므로
**SAN 체크를 성공해도 1 손실이 사라지고 있었다.** 조용한 0 반환이 가린 전형적인 사례다.

throw를 고른 이유: AI가 돌려주는 `hp_loss.formula`는 `Game.jsx` 199행에서 호출되는데
이 블록이 159~322행의 `try/catch`에 들어 있어 `[오류]` 로그로 표시되고 턴이 중단된다.
엔진에 `console.warn` 부작용을 넣지 않아도 호출자가 알 수 있다. 사전 검증은 5-3이 담당한다.

### CharacterCreate.jsx

| # | 현상 | 수정 |
|---|---|---|
| 2-15 | `adjustOcc`·`setOcc`의 90% 상한 검사가 `intAlloc`을 무시. 4단계에서 배분 후 3단계로 돌아오면 합계 90 초과 가능 | `getSkillValue` 기준으로 검사 |
| 2-16 | 재굴림 시 `occAlloc`·`intAlloc`이 초기화되지 않음. EDU/INT가 낮아지면 남은 포인트가 음수인 채로 게임 시작 가능 | `handleReroll`에서 배분 초기화 |
| 2-17 | `occPoints`를 `abilities.EDU * 4`로 직접 계산. `OCCUPATIONS.pointsFormula` 미사용 | `pointsFormula` 사용 |

---

## 🔖 인수인계 — 2-15 ~ 2-17 (A안 결정, 2026-10-07)

**이 블록은 다음 세션이 조사를 반복하지 않도록 쓴 것이다. 착수 전에 전부 읽을 것.**
아래 행·수치는 커밋 `6b8e035` 기준으로 확인했다.

### 왜 단순 수정이 아닌가

세 항목이 건드리는 수치가 **전부 룰**이다. `game-rules.md` 61~63행:

```
- 직업 포인트 = EDU × 4 (직업 기술에만)
- 개인관심 포인트 = INT × 2 (전 기술)
- 1% 단위, 상한 90% [하우스룰]
```

이 세 줄이 `CharacterCreate.jsx`에 하드코딩돼 있다. `CLAUDE.md`는 룰 계산을 `engine/`에 두라고 정하므로
**지금 위치 자체가 아키텍처 위반**이다. 그리고 컴포넌트에는 테스트 수단이 없다
(`jsdom`·`@testing-library/react` 미설치, 현재 테스트 86개는 전부 `engine/` 순수 함수).
따라서 제자리에서 고치면 `CLAUDE.md` 3번(테스트 선작성)을 지킬 수 없다.

**검토한 선택지:** A) 배분 규칙을 `engine/`으로 추출 B) 컴포넌트 테스트 인프라 추가 C) 테스트 없이 수정.
**사용자가 A로 결정했다.** B는 룰 테스트가 렌더링에 묶이고, C는 명시적 위반이다.

### 상한 `90`은 3곳이 아니라 6곳이다

| 행 | 코드 | 상태 |
|---|---|---|
| 37 | `(baseSkills[sk] ?? 0) + newExtra > 90` (`adjustOcc`) | ❌ `intAlloc` 누락 |
| 46 | `getSkillValue(sk) + delta > 90` (`adjustInt`) | ✅ |
| 53 | `Math.min(currentAlloc + occLeft, 90 - b)` (`setOcc`) | ❌ `intAlloc` 누락 |
| 61 | `Math.min(currentAlloc + intLeft, 90 - minVal)` (`setInt`) | ✅ |
| 172 | `canPlus={occLeft > 0 && getSkillValue(sk) < 90}` (UI) | ✅ |
| 199 | `canPlus={intLeft > 0 && getSkillValue(sk) < 90}` (UI) | ✅ |

같은 룰이 6곳에 흩어져 **2곳만 틀렸다.** 추출의 목적은 "`getSkillValue` 기준으로 바꾸기"가 아니라
**상한이 한 곳에만 존재하게 만들어 이 종류의 불일치가 다시 생기지 못하게 하는 것**이다.

### 2-15 재현 경로 (UI + 버튼으로는 재현되지 않는다)

172행의 `canPlus`가 `getSkillValue` 기준이라 **＋ 버튼은 이미 막혀 있다.**
살아 있는 경로는 **직접 숫자 입력**이다. `SkillRow`에 `type="number"` 입력이 있고
(299~307행) `commitInput` → `onSet` → `setOcc`(53행)로 들어간다.

1. 직업 `탐정` 선택 (`심리학` 기본값 10, 직업 기술에 포함)
2. 3단계에서 `심리학`에 직업 포인트 50 배분 → 표시값 60
3. 4단계에서 `심리학`에 개인관심 30 배분 → 표시값 90 (여기까지는 정상)
4. 3단계로 돌아가 `심리학` 숫자를 클릭해 `90` 입력
5. `setOcc`: `b=10`, `maxAlloc = min(50+occLeft, 90-10=80)` → `occAlloc = 80`
6. 결과 `getSkillValue = 10 + 80 + 30 = 120` — **상한 90을 30 초과**

추출 후 이 시나리오를 그대로 테스트로 옮길 것.
`setOcc`는 `targetValue - b`를 쓰는데, 입력값은 `intAlloc`이 포함된 **표시 총합**이므로
기준점도 `base + 다른 풀`이어야 한다. 즉 53행은 상한과 기준점 **둘 다** 틀렸다.

### 2-16 재현 경로

3단계 `← 이전`(177행) → 2단계 `← 이전`(151행) → 1단계 `전체 재굴림`(121행).
`handleReroll`(66~71행)은 `abilities`와 `rerollsLeft`만 바꾸고 `occAlloc`·`intAlloc`을 그대로 둔다.
EDU/INT가 낮아지면 `occLeft`·`intLeft`가 **음수**가 되고 그 상태로 게임 시작이 가능하다.

**고칠 패턴이 이미 파일 안에 있다.** `handleOccupationSelect`(73~77행)는 두 배분을 모두 초기화한다.
`handleReroll`에 같은 초기화를 넣으면 된다. 이 항목은 순수 컴포넌트 상태라 **엔진 함수가 필요 없다.**

### 제안 모듈 — `src/engine/skillAllocation.js`

네 호출부(`adjustOcc`·`adjustInt`·`setOcc`·`setInt`)가 **하나의 함수로 전부 환원된다.**
검산해봤다. `setInt`(58~61행)와 수식이 정확히 일치하고, `setOcc`는 이 함수를 쓰면 버그가 사라진다.

```js
export const SKILL_CAP = 90   // game-rules.md 63행 [하우스룰]

// 한 기술에 이 풀로 배분할 양을 계산한다.
//   base        기본 기술치
//   otherAlloc  다른 풀이 이미 넣은 양 (직업 계산 시 intAlloc, 개인관심 계산 시 occAlloc)
//   currentAlloc 이 풀이 지금 넣은 양
//   pointsLeft  이 풀의 남은 포인트
//   targetValue 원하는 최종 표시값
export function allocate({ base, otherAlloc, currentAlloc, pointsLeft, targetValue }) {
  const floor = base + otherAlloc                               // 이 풀로는 더 내릴 수 없는 하한
  const maxAlloc = Math.min(currentAlloc + pointsLeft, SKILL_CAP - floor)
  return Math.max(0, Math.min(targetValue - floor, maxAlloc))
}
```

- `±` 버튼은 `targetValue = 현재표시값 + delta`로 호출하면 그대로 환원된다. (`target - floor = currentAlloc + delta`)
- 직접 입력은 `targetValue = 입력값`.

**검산에서 나온 차이 하나.** 원본 `adjustOcc`·`adjustInt`는 한계를 넘으면 `return`으로 **거절**하는데
제안 함수는 **클램프**한다. `delta`가 `±1`인 한 결과가 같다는 것을 확인했다.

- 상한에 닿은 상태에서 `+1` → `maxAlloc`이 `currentAlloc`이 되어 변화 없음 (거절과 동일)
- 남은 포인트 0에서 `+1` → `min(currentAlloc + 0, …)` = `currentAlloc`, 변화 없음
- `currentAlloc = 0`에서 `-1` → `max(0, -1)` = `0`, 변화 없음

UI는 `±1`만 쓰므로(길게 누르기도 `+1` 반복) 안전하다. **`delta`를 2 이상으로 쓸 일이 생기면
거절과 클램프가 갈린다**는 점만 기억할 것. 그때는 호출부가 어느 쪽을 원하는지 정해야 한다.
- 포인트 공식도 같이 옮긴다: `occupationPoints(occupationKey, EDU)`는
  **`OCCUPATIONS[key].pointsFormula(EDU)`를 사용**해야 한다 (2-17). `interestPoints(INT)`는 `INT * 2`.

### 착수 전 알아둘 함정 셋

1. **`occupation`이 `null`인 구간이 있다.** 23행 `occPoints`는 1·2단계에서도 무조건 계산된다.
   `occupationPoints`가 `null`을 받으면 `0`을 돌려줄지 throw할지 정해야 한다.
   2-13에서 "조용한 0"의 대가를 봤으니 **호출부에서 가드하고 함수는 엄격하게** 가는 쪽을 권한다.
2. **표시 문구에도 공식이 박혀 있다.** 167행 `EDU({abilities.EDU}) × 4 = {occPoints}pt`,
   194행 `INT({abilities.INT}) × 2 = {intPoints}pt`.
   `pointsFormula`는 직업별로 다를 수 있는 설계인데(현재는 6직업 전부 `edu * 4`) 문구는 `× 4`로 고정이다.
   지금은 거짓말이 아니지만 직업별 공식이 갈리는 순간 거짓이 된다. 문구를 유도할지 그대로 둘지 판단할 것.
3. **`calcDerived`가 두 번 다른 인자로 불린다.** 19행은 `calcDerived(abilities)`로 `skills` 없이 호출해
   미리보기를 만든다. 그래서 **미리보기 SAN은 2-12의 maxSAN 클램프를 반영하지 않는다.**
   크툴루신화에 포인트를 배분하면 미리보기 SAN(=POW)과 실제 캐릭터 SAN(=maxSAN)이 어긋난다.
   2-15~2-17 범위는 아니지만 같은 파일이므로 함께 처리할지 판단할 것. 처리하지 않으면 별 항목으로 적을 것.

### 작업 순서 제안

1. `skillAllocation.js` + `skillAllocation.test.js` 작성. 테스트에 위 2-15 재현 시나리오를 넣는다. → 커밋 (2-15)
2. `CharacterCreate.jsx`의 네 함수를 `allocate` 호출로 교체. 90 리터럴은 `SKILL_CAP`만 남긴다. → 같은 2-15 커밋에 포함
3. `handleReroll`에 배분 초기화. → 커밋 (2-16)
4. `occPoints`/`intPoints`를 `occupationPoints`/`interestPoints`로 교체. → 커밋 (2-17)
5. `docs/architecture.md`에 새 모듈 한 줄 추가.

**항목마다 따로 커밋한다**(`CLAUDE.md` 4번). 2-15는 추출과 교체가 한 몸이라 한 커밋이 맞다.

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
| 4-1 | 시나리오 JSON | 적 스탯 스키마 확정. `maxHP`, `DEX`, `skills`, `weapon` 필수. `scenario-spec.md` 준수. 기존 시나리오 갱신. **현재 `test_scenario2.json`의 적은 `maxHp`(소문자 p)·`attack`·`count`만 있다** — 기술치가 없어 코드가 적 공격을 판정할 수 없고, 그래서 적 피해 결정이 AI에게 넘어가 있다(4-2의 원인). `Game.jsx`도 `enemyDef.maxHp`를 읽으므로 키 표기 통일 필요 |
| 4-2 | `combat.js` | `performEnemyAttack()` 추가. 적 무기·기술로 판정하고 피해 계산 |
| 4-3 | `Game.jsx` | 전투 라운드 루프 구현. 플레이어 행동 → 적 행동(코드) → 결과를 AI에 전달. **코드 작성 전 설계를 먼저 설명할 것** |
| 4-4 | `combat.js`, `Game.jsx` | 회피를 실제 방어로 연결. 현재는 굴림만 하고 아무것도 막지 못함 — 막을 적 공격 이벤트가 없기 때문이다(4-2 선행). **양쪽 다 자동 굴림으로 구현한다** (2026-10-07 결정): 공격 결과가 `canDodge`면 코드가 방어자 회피를 즉시 굴려 해소하고, 플레이어 회피 버튼은 **제거**한다. 근거는 하우스룰이 반격을 미지원해 회피를 거절할 이득이 없다는 것 — 선택지가 성립하지 않는다. 함께 수정: `performDodge`(53행)의 회피 기본값이 `defender.DEX * 2`다. `game-rules.md`는 `floor(DEX / 2)` |
| 4-5 | `combat.js` | 중상 판정 수정. 한 번의 피해가 maxHP 절반 이상일 때. CON 판정 기절, maxHP 이상 즉사 추가 |
| 4-6 | `combat.js` | `Math.random()` 직접 호출 4건 제거. `performAttack`(21~24행)은 `rollBonus`/`rollPenalty`/`rollD100`을 삼항식으로 재구현하고 있다 — `dice.js` 함수로 교체. `performDodge`(54행)는 `rollD100()`. **함께 수정: 2-14의 쌍둥이** — 35행 `attacker.DB?.includes('d')`가 DB 판별을 직접 하고 있다. 숫자 DB면 TypeError, 대문자 `"1D4"`면 `parseInt`로 떨어져 1이 된다. `dice.js`의 `rollWithDB`로 넘겨 판별을 한 곳에 모은다 |
| 4-7 | `Game.jsx`, `gameStore.js`, `keeper.js` | **전투 생명주기를 코드가 쥔다.** 현재 종료 권한이 AI에 있다 — `keeper.js`가 "`combat_start: false` 전환 조건은 적 사망·적 도주·탐사자 도주 성공 셋뿐"이라고 지시만 하고, 코드는 그 응답을 따른다. 적을 처치하면 두 경로 다 깨진다. ① AI가 전투를 끝내면 적이 `null`이 되고, 이후 AI가 다시 `combat_start: true`를 주는 순간 `Game.jsx:289`의 `if (!combatEnemyRef.current)`가 `enemyPool[0]`을 **풀 HP로 재스폰** — 같은 적이 부활한다 ② AI가 끝내지 않으면 `hp: 0`인 적을 계속 공격한다(객체가 truthy라 재스폰도 안 된다). 처치 이력이 코드 어디에도 없다. **수정:** 적 HP 0 → 코드가 전투를 종료하고, 처치한 적 id를 store에 기록해 재스폰을 차단한다. AI에는 통보만 한다 |

**4-7은 4-3의 설계 설명에 포함해 함께 판단한다.** 라운드 내부 흐름(4-3)과 전투 전체의 시작·종료·스폰(4-7)은 같은 자리에서 결정돼야 한다.

**4-7 착수 전 `TODO.md` #3(도주 룰) 결정이 필요하다.** 종료 조건을 코드로 옮기는 작업인데, `game-rules.md`에 없는 도주를 `keeper.js`가 종료 조건으로 지시하고 있다. 도주를 지원할지 정해지지 않으면 종료 조건을 확정할 수 없다.

**보류:** 다수 적(`count`) 처리는 4단계 완료 후 별도 판단.
1대1이 안정되기 전에 손대지 않는다. 현재 유일한 적이 `count: 3`이지만 코드가 이 필드를 읽지 않는다 — 4-7로 재스폰을 막으면 1명으로 동작한다.

---

## 5단계 · 끊긴 배선

**목표:** 시나리오에 정의됐지만 동작하지 않는 것들을 연결한다.

| # | 현상 | 수정 |
|---|---|---|
| 5-1 | 크툴루신화가 절대 오르지 않음. `mythos_gains`가 `keeper_notes`에 산문으로만 존재 | clue와 ending에 `mythos_gain` 필드. 코드가 적용. maxSAN 연동 — **아래 2-12 인수인계 참조** |
| 5-2 | `requires_ritual` 조건이 프롬프트로만 전달됨. AI가 무시하면 조건 미충족 엔딩이 발동 | `trigger_ending` 처리 시 코드가 조건 검증. 미충족이면 무시 |
| 5-3 | `hp_loss.formula`가 무검증으로 `rollDamage`에 전달됨 | 허용 주사위 식 화이트리스트 |
| 5-4 | `move_to`가 `connections` 검증 없이 처리됨 | 인접 장소인지 확인 |
| 5-5 | `findUnrevealedClue`가 같은 기술의 첫 단서를 집음 — 종을 조사했는데 바닥 문양이 나옴 | 인터랙션 대상 또는 행동 문맥과 매칭 |
| 5-6 | 엔딩의 `injury`, `san_final`, `mythos_gain` 미처리 | 구조화된 필드로 받아 적용 |
| 5-7 | `sanity.js`의 `rollTempInsanityEffect`(58행)와 `rollIndefInsanityEffect`(73행)가 `Math.random()` 직접 호출 | 둘 다 `dice.js` 경유. 목록 길이가 6이라 `roll(6) - 1`로 인덱스를 뽑을지, `dice.js`에 배열 추출 헬퍼를 둘지 판단 |
| 5-8 | `Game.jsx:481`이 일시적 광기 지속 턴(1d10)을 `Math.random()`으로 직접 굴림. `game-rules.md`에 명시된 룰 수치가 UI 레이어에서 계산되고 있다 | `dice.js`의 `roll(10)` 경유. 지속 턴 계산을 `sanity.js`로 옮길지는 5-7과 함께 판단 |

**2-12에서 5-1로 넘긴 요구사항 (2026-10-07):**
크툴루신화가 오르면 `maxSAN = 99 − 크툴루신화`가 **내려간다.** 그런데 SAN 손실이 없으면
`applySanLoss`를 거치지 않으므로 2-12의 클램프가 걸리지 않는다.
즉 신화가 오른 직후 SAN이 maxSAN을 넘은 상태가 될 수 있다. (`game-rules.md`: "SAN은 maxSAN을 초과할 수 없다")

**5-1에서 신화 상승을 적용할 때 maxSAN 재계산과 SAN 클램프를 같은 자리에서 처리해야 한다.**
2-12 시점에는 신화 상승 코드 자체가 없어 미리 짜면 검증할 대상이 없는 추측이 되므로 넘겼다.
클램프 식은 `calcDerived`(`character.js`)와 `applySanLoss`(`sanity.js`)에 이미 있다. 셋째 중복을 만들지 말고 단일화를 함께 판단한다.
| 5-9 | `dice.test.js`의 `Math.random` 감시 테스트가 `dice.js` 함수만 덮는다. 4-6·5-7·5-8을 고쳐도 재발을 막을 장치가 없다 | 4-6·5-7·5-8 완료 후, `combat.js`·`sanity.js`·광기 지속 턴까지 포함하도록 감시 테스트 확장 |

**`Math.random()` 직접 호출 전수 (2026-10-07 조사)**

`CLAUDE.md`: "주사위는 `dice.js`를 경유한다. `Math.random()` 직접 호출 금지."
현재 위반은 4곳 7건이고, 담당 항목이 흩어져 있어 여기에 모아둔다.

| 위치 | 건수 | 담당 |
|---|---|---|
| `combat.js` `performAttack` 21~24행 | 3 | 4-6 |
| `combat.js` `performDodge` 54행 | 1 | 4-6 |
| `sanity.js` `rollTempInsanityEffect` 58행 | 1 | 5-7 |
| `sanity.js` `rollIndefInsanityEffect` 73행 | 1 | 5-7 |
| `Game.jsx` 481행 | 1 | 5-8 |

`engine/*.test.js`의 `setRng(Math.random)`과 `dice.js`의 `let rng = Math.random`은
주입 지점이거나 복원 코드이므로 위반이 아니다.

넷을 다 고치기 전까지 `combat.js`와 `sanity.js`의 광기 효과 추출은 테스트로 고정할 수 없다.
2단계에서 이 두 파일의 테스트를 쓰지 않은 이유이기도 하다.

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

- `npm run test` 통과 — 단 1-2(Vitest 도입) 완료 전까지는 `npm run build`만으로 판단한다
- `npm run build` 통과
- 룰을 건드렸다면 대응 테스트가 존재
- 항목 단위로 커밋