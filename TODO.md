# TODO — 결정 대기

2026-09-15 문서 점검에서 나온, 사용자 결정이 필요한 항목.
결정이 나면 해당 문서에 반영하고 이 파일에서 지운다.

남은 항목은 원래 번호를 유지한다. 2·6·8은 2026-10-07에 처리 완료 (파일 맨 아래 기록).

---

## 1. 같은 기술 단서의 공개 방식

**충돌**
- `docs/scenario-spec.md`: 같은 장소·같은 기술의 단서가 여럿이면 엔진이 **순서대로** 공개
- `docs/backlog.md` 5-5: 순서대로 집는 게 버그(종을 조사했는데 바닥 문양이 나옴) → **행동 문맥과 매칭**

**선택지**
- [ ] A. 문맥 매칭 → `scenario-spec.md` 문구 수정
- [ ] B. 순서대로 유지 → 5-5 삭제 또는 재정의
- [ ] C. 문맥 매칭, 매칭 실패 시 순서대로 폴백 → `scenario-spec.md` 문구 수정

**영향:** `docs/scenario-spec.md`, `docs/backlog.md`
**필요 시점:** 5단계 (5-5)

---

## 3. 도주 룰

**현황**
- 이전 `design.md` 전투 흐름에 "공격/회피/도주"가 있었음 → `game-rules.md` 기준으로 이번에 **도주를 뺐음**
- `src/api/keeper.js`는 "탐사자 도주 성공"을 전투 종료 조건으로 AI에 지시 중
- `docs/game-rules.md`에 도주 규칙 없음. 추격은 "미구현(의도적)"

**선택지**
- [ ] A. `game-rules.md`에 도주 규칙 추가 (사용자 직접 수정) → `design.md` 전투 흐름에 도주 복원
- [ ] B. 도주 미지원 → `keeper.js` 프롬프트에서 도주 조건 정리하는 백로그 항목 추가

**영향:** `docs/game-rules.md`, `design.md`, `docs/backlog.md`
**필요 시점:** 4단계 — **백로그 4-7(전투 생명주기) 착수 전까지.** 전투 종료 권한을 AI에서 코드로 가져오는 작업이라, 도주가 종료 조건인지 정해져야 코드를 쓸 수 있다

---

## 4. 시나리오 JSON과 스펙 불일치

**`test_scenario2.json`**
- `keeper_notes` 키: `tone`, `san_policy`, `clue_philosophy`, `mythos_gains`
- 스펙 키: `tone_variance`, `san_policy`, `clue_philosophy`, `forbidden`
- `mythos_gains`는 백로그 5-1에서 처리. `tone` → `tone_variance` 변경과 `forbidden` 추가는 **백로그에 없음**

**`test_scenario.json`**
- `keeper_notes`, `endings` 없음
- 스펙에 없는 최상위 `turn_limit` 있음 (스펙은 `ending.conditions`의 `turn_limit` 타입으로 표현)

**선택지**
- [ ] 백로그에 "기존 시나리오를 스펙에 맞춤" 항목 추가 → 몇 단계에?
- [ ] 또는 4-1("기존 시나리오 갱신")의 범위를 적 스탯 외 전체로 넓힘
- [ ] `test_scenario.json`은 갱신? 폐기?

**영향:** `docs/backlog.md`, `src/data/scenarios/*.json`
**필요 시점:** 4단계 (4-1)

---

## 5. Alone Against the Flames 시나리오

- `design.md` 로드맵 1차 목표에 "Alone Against the Flames 시나리오 JSON 작성 (레퍼런스용)"이 있음
- `docs/backlog.md`에는 해당 항목 없음
- [ ] 백로그에 추가 (몇 단계에?) / `design.md`에서 제거

**영향:** `docs/backlog.md`, `design.md`
**필요 시점:** 미정 (로드맵 성격)

---

## 7. 밀어붙이기 실패 결과를 누가 정하나

**현황**
- `docs/game-rules.md`: 재실패 시 단순 실패보다 가혹한 결과 (HP 손실, SAN 체크, 전투 발생 중 하나 이상)
- `src/api/keeper.js`: `pushFailed` 컨텍스트를 받으면 AI가 `hp_loss` / `san_check` / `combat_start` 중 무엇을 줄지 고름
- `docs/backlog.md`에 관련 항목 없음

**선택지**
- [ ] A. 결과 종류와 수치를 코드가 결정 → 백로그 항목 추가 (몇 단계에?)
- [ ] B. 종류는 AI가 고르고 수치·검증은 코드 (5-3 `hp_loss.formula` 화이트리스트로 충분) → 현행 유지를 문서에 명시

**영향:** `docs/backlog.md`, 필요 시 `docs/architecture.md`
**필요 시점:** 5단계 (5-3)

---

## 처리 완료 기록

### 2026-10-07

**2. 작업 규칙의 적용 범위**
- 한 세션 한 작업: 0~1단계는 묶어서 진행 가능으로 명시 → `CLAUDE.md`, `docs/backlog.md`
- 테스트 먼저: 순서 교체 대신 **1단계를 예외로 명시**. 1-1(RNG 주입) 없이는 주사위 테스트를 쓸 수 없으므로 1-1 → 1-2 → 1-3이 맞다 → `CLAUDE.md`, `docs/backlog.md`
- 완료 조건: 1-2 완료 전까지는 `npm run build`만으로 판단 → `CLAUDE.md`, `docs/backlog.md`

**6. tone.md 문구**
- "시나리오 JSON(`keeper_notes`, `endings`, `ending`)에서 받는다"로 수정 → `docs/tone.md` 2곳(상단 요약, "시나리오별 편차" 절)

**8. 백로그 완료 표시 규칙**
- A안 채택: `#` 칸에 ✅ 표시 → `docs/backlog.md`
- 0단계 현황 반영: 0-1·0-2·0-3·0-5 완료, **0-4(README.md) 남음**

**9. 적 회피 처리** (신규 — 원래 목록에 없던 항목)
- **양쪽 다 자동 굴림 채택.** 공격 결과가 `canDodge`면 코드가 방어자 회피를 즉시 굴린다.
  플레이어 회피 버튼은 제거 → `docs/backlog.md` 4-4
- 근거: 하우스룰이 반격을 미지원하므로 회피를 거절해서 얻는 게 없다.
  비용 없는 선택은 선택이 아니라 버튼 하나가 늘어나는 것일 뿐이다.
  `game-rules.md`는 "회피 가능/불가"만 정하고 누가 선택하는지는 정하지 않으므로 룰 수정이 아니다
- 전투를 선택형으로 키우고 싶어지면 그때 UI를 얹는다. 자동 → 선택형이 역방향보다 쉽다

**전투 코드 점검에서 나온 발견** (결정 아님, 기록용)
- 전투가 절반만 배선돼 있다. 플레이어→적 피해는 코드가, 적→플레이어 피해는 AI가 `hp_loss`로 정한다.
  원인은 적 데이터에 기술치가 없어서다(`maxHp`·`attack`·`count`만 존재) → `docs/backlog.md` 4-1에 기록
- 회피가 아무것도 막지 못하는 건 막을 적 공격 이벤트가 없기 때문이다 → 4-4에 기록
- `getCombatOrder`(DEX 순서)가 작성돼 있으나 아무도 호출하지 않는다. 라운드 구조가 없어 쓸 자리가 없다 → 4-3
- 적 처치 후 같은 적이 풀 HP로 재스폰된다. 전투 종료 권한이 AI에 있고 처치 이력이 없다 → **신규 4-7**
