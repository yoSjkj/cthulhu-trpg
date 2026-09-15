# 시나리오 JSON 스키마

시나리오는 데이터다. 엔진은 이 스키마만 읽는다.

## 최상위

```json
{
  "id": "고유 id",
  "title": "제목",
  "setting": "배경 설명",
  "intro": "시작 장면",
  "goal_hint": "탐사자의 목표 (탈출 차단 시 근거로 사용)",
  "keeper_notes": {},
  "pressure": {},
  "locations": [],
  "endings": {},
  "ending": {},
  "enemies": []
}
```

## keeper_notes

시나리오별 톤 편차. `docs/tone.md`가 바닥을 깔고 이것이 얹힌다.
`tone.md`의 금지 항목과 충돌하면 `tone.md`가 이긴다.

```json
{
  "tone_variance": "이 시나리오 고유의 어긋남",
  "san_policy": "SAN 체크를 언제 거는가",
  "clue_philosophy": "단서를 어떻게 드러내는가",
  "forbidden": ["이 시나리오에서 특히 하지 말 것"]
}
```

키를 포함해 프롬프트에 전달한다. 값만 이어붙이지 않는다.

## locations[]

```json
{
  "id": "loc_xxx",
  "name": "장소 이름",
  "visible_from_start": true,
  "description": "첫 진입 시 묘사",
  "connections": ["loc_yyy"],
  "clues": [],
  "interactable": [],
  "enemies": ["enemy_id"],
  "npc": [],
  "san_check": { "required": true, "loss": {}, "reason": "" }
}
```

`connections`는 양방향이 아니다. 각 장소에 명시한다.

## clues[]

```json
{
  "id": "clue_xxx",
  "text": "단서 내용",
  "requires_check": true,
  "skill": "발견",
  "difficulty": "normal",
  "mythos_gain": 0,
  "san_check": { "required": false },
  "revealed": false
}
```

- `requires_check: false`면 장소 진입 시 자동 공개
- `mythos_gain`은 코드가 적용한다. 산문으로 쓰지 않는다
- 같은 장소·같은 기술의 단서가 여럿이면 엔진이 순서대로 공개한다

## interactable[]

```json
{
  "id": "interact_xxx",
  "name": "대상 이름",
  "description": "설명",
  "actions": [
    {
      "action": "행동 설명",
      "requires_ritual": ["clue_id"],
      "trigger_ending": "ending_id",
      "result": "no_effect",
      "narrative_hint": "효과 없을 때의 묘사",
      "san_check": { "required": true, "loss": {}, "reason": "" }
    }
  ]
}
```

- `requires_ritual` 조건은 코드가 검증한다. 미충족 시 `trigger_ending`을 무시한다
- 인터랙션 action을 선택지로 먼저 제시하지 않는다. 탐사자가 직접 시도할 때만 발동

## pressure

턴 경과에 따른 압박. 선택 사항.

```json
{
  "stages": [
    {
      "turn": 15,
      "message": "표시할 텍스트",
      "effect": "san_check | san_drain | force_combat",
      "loss": { "success": "1", "fail": "1d4" },
      "amount": 1,
      "enemy_id": "enemy_xxx",
      "result": "ending_id"
    }
  ]
}
```

엔진은 `turn` 이상에 도달하면 발동시키고 중복 발동을 막는다.
정확히 일치할 때만 발동시키지 않는다.

## endings

```json
{
  "ending_id": {
    "id": "ending_id",
    "title": "제목",
    "text": "엔딩 텍스트",
    "san_final": 0,
    "mythos_gain": 8,
    "injury": { "skill": "근접전투", "modifier": -100, "note": "왼손 손실" }
  }
}
```

`injury`는 구조화한다. 산문으로 쓰면 적용되지 않는다.
엔딩 텍스트는 전용 스타일로 출력한다. 시스템 메시지로 표시하지 않는다.

## ending

엔딩 조건. `endings`와 별개다.

```json
{
  "conditions": [
    { "type": "clues_collected", "required": ["clue_id"], "then": "설명" },
    { "type": "turn_limit", "max_turns": 30, "result": "ending_id" }
  ],
  "good": "ending_id",
  "bad": "ending_id"
}
```

## enemies[]

```json
{
  "id": "enemy_xxx",
  "name": "이름",
  "description": "묘사",
  "maxHP": 6,
  "DEX": 50,
  "DB": "0",
  "skills": { "근접전투": 40, "회피": 25 },
  "weapon": { "skill": "근접전투", "damage": "1d3", "maxDmg": 3, "useDB": true },
  "count": 1,
  "san_check_on_sight": { "loss": { "success": "1d3", "fail": "1d6" } }
}
```

필수: `maxHP`, `DEX`, `skills`, `weapon`.
`DEX`가 없으면 행동 순서가 결정되지 않고, `skills`가 없으면 회피 판정이 깨진다.

표기는 캐릭터와 동일하게 대문자 `HP` / `maxHP`를 쓴다.

## 작성 시 주의

- 턴 예산과 콘텐츠 분량을 맞춘다. 볼 것이 떨어진 채 남은 턴은 지루함이 된다
- 핵심 엔딩을 높은 난이도 판정 뒤에 두면 도달률이 크게 떨어진다
- 단서는 순서대로 읽혔을 때 의미가 쌓이도록 배치한다