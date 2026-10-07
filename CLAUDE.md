# CoC AI 키퍼 TRPG

Call of Cthulhu 7판 룰 기반 솔로 플레이 TRPG. React + Vite PWA.
플레이어 1인 + AI 키퍼 구성.

## 최우선 규칙

1. **룰 수치는 `docs/game-rules.md`만 참조한다.**
   `design.md`는 설계 의도만 담는다. 룰 수치·스키마의 근거로 쓰지 않는다.
   문서에 없는 룰은 추측하지 말고 사용자에게 묻는다.
2. **`docs/game-rules.md`를 수정하지 않는다.** 사용자만 수정한다.
3. **코드 수정 전 테스트를 먼저 작성한다.**
   단 백로그 1단계는 테스트 인프라를 세우는 작업이라 예외다.
4. **한 세션에 한 작업만.** 요청 범위를 넘어 리팩터링하지 않는다.
   백로그 0~1단계는 묶어서 진행할 수 있다.

## 아키텍처 원칙

- 모든 수치는 코드가 계산한다. AI 키퍼는 묘사만 한다.
- AI 응답값(`move_to`, `trigger_ending`, `hp_loss.formula`)은 코드가 검증한 뒤 사용한다.
  프롬프트 지시만으로 신뢰하지 않는다.
- `src/engine/`은 순수 함수만. React·API·localStorage 의존 금지.
- 주사위는 `dice.js`를 경유한다. `Math.random()` 직접 호출 금지.
- 시나리오는 데이터다. 엔진에 시나리오 내용을 하드코딩하지 않는다.

## 문서

| 파일 | 내용 |
|---|---|
| `design.md` | 기획 의도, 게임 흐름. 룰 수치 없음 |
| `docs/game-rules.md` | 룰 정답표. 수정 금지 |
| `docs/tone.md` | 키퍼 문체 기준 |
| `docs/architecture.md` | 데이터 흐름, 역할 분리 |
| `docs/scenario-spec.md` | 시나리오 JSON 스키마 |
| `docs/backlog.md` | 작업 목록과 순서 |

## 명령

npm run dev / build / test

## 작업 완료 조건

- `npm run test` 통과 — 단 백로그 1-2(Vitest 도입) 완료 전까지는 `npm run build`만으로 판단한다
- `npm run build` 통과
- 룰을 건드렸다면 해당 테스트가 존재할 것