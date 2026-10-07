# CoC AI 키퍼 TRPG

Call of Cthulhu 7판 룰 기반 솔로 플레이 TRPG. 플레이어 1인 + AI 키퍼 구성.

룰 판정과 수치 계산은 전부 코드가 한다. AI 키퍼는 묘사만 담당한다.

## 기술 구성

- React 19 + Vite 7
- Tailwind CSS 4
- Zustand — localStorage `coc_save` 키에 저장
- PWA (`vite-plugin-pwa`)

LLM은 현재 Anthropic API를 브라우저에서 직접 호출한다.
본문은 `claude-sonnet-4-6`, 히스토리 요약은 `claude-haiku-4-5`를 쓴다.
프로바이더 교체(OpenRouter 이관)는 백로그 8단계 예정이다.

## 실행

```bash
npm install
npm run dev
```

| 명령 | 내용 |
|---|---|
| `npm run dev` | 개발 서버 |
| `npm run build` | `dist/` 생성 |
| `npm run preview` | 빌드 결과 확인 |

API 키는 저장소에 두지 않는다. 앱 첫 화면에서 `sk-ant-...` 키를 입력하면 브라우저에만 저장된다.

## 배포

`Dockerfile`은 nginx로 `dist/`를 서빙한다.

```bash
npm run build
docker build -t coc-trpg .
docker run -p 8080:80 coc-trpg
```

## 구조

```
src/
├── engine/              순수 함수. 룰 계산 전담
│   ├── dice.js            주사위. 모든 난수는 여기를 경유한다
│   ├── check.js           기술 판정
│   ├── character.js       능력치·파생값
│   ├── combat.js          전투
│   └── sanity.js          SAN·광기
├── api/keeper.js        AI 키퍼 프롬프트 구성, 응답 검증
├── pages/               화면 (ApiSetup, CharacterCreate, Game, GameOver)
├── store/gameStore.js   상태 + 저장
└── data/scenarios/      시나리오 JSON
```

`src/engine/`은 React·API·localStorage에 의존하지 않는다.
시나리오는 데이터다. 엔진에 시나리오 내용을 하드코딩하지 않는다.

## 문서 지도

| 파일 | 내용 | 비고 |
|---|---|---|
| `CLAUDE.md` | 작업 규칙, 아키텍처 원칙 | |
| `design.md` | 기획 의도, 게임 흐름 | 룰 수치 없음 |
| `docs/game-rules.md` | 룰 정답표 | **수정 금지** |
| `docs/tone.md` | 키퍼 문체 기준 | |
| `docs/architecture.md` | 데이터 흐름, 역할 분리 | |
| `docs/scenario-spec.md` | 시나리오 JSON 스키마 | |
| `docs/backlog.md` | 작업 목록과 순서 | 완료 항목은 ✅ |
| `TODO.md` | 사용자 결정 대기 항목 | 다 비면 삭제 |

룰 수치의 근거는 `docs/game-rules.md`뿐이다.
다른 문서와 어긋나면 `game-rules.md`가 맞다.

## 진행 상황

0단계(문서 정비) 완료. 다음은 1단계(안전망) — RNG 주입, Vitest 도입, 경계값 테스트.
상세는 `docs/backlog.md`를 본다.
