> 요약: 브레인덤프 입력 → /api/braindump 후보 추출(≤10, 실제 LLM) → 오늘 할 일 1~3개 선택·확정 — 데모 1단계(정하기)의 UI와 API를 구현할 때 읽는다.

# 브레인덤프와 오늘 할 일 선택

## 1. 목적

- PRD 5.1 Today-todo를 데모로 재현한다: 정리되지 않은 생각을 쏟아내면 AI가 실행 가능한 후보를 추출하고, 사용자가 오늘 할 일 1~3개를 직접 선택·확정한다.
- 확정 순간이 후보 → **TODO Card 승격**의 순간 — "기록 항목이 아니라 실행을 담는 카드"(PRD 4)를 시각적으로 각인한다.

## 2. 사용자 스토리

- '지우'는 문장을 다듬지 않고 머릿속을 그대로 쏟아낸다. 잠시 후 할 일 모양의 후보들이 나타나고, 그중 오늘 진짜 할 것 1~3개만 고른다.
- 무엇을 쓸지 막막하면 예시 칩을 눌러 시작한다.
- 잡담만 입력하면 AI가 구체적 예시를 보여주며 다시 입력하도록 돕는다.

## 3. 화면·인터랙션 명세

### 3.1 브레인덤프 입력 (`phase: braindump`)

- 전체 화면 Co-Planner 채팅(기존 `ChatBubble` 시각 언어 재사용). 웰컴 1문장: "요즘 머릿속에 있는 일들을 편하게 쏟아내 보세요. 문장이 아니어도 괜찮아요."
- 멀티라인 입력. placeholder: "예: 과제 마감이 목요일인데 손도 못 댔고, 방도 치워야 하고, 운동도 다시 시작하고 싶어…"
- **예시 칩 3개**(원탭으로 입력창에 채워지고 수정 가능): "과제 2개랑 빨래가 밀렸어" / "자소서 써야 하는데 손이 안 가" / "시험공부 뭐부터 할지 모르겠어". 빈 화면 공포가 최대 이탈 요인이므로 필수.
- IME 조합 중 Enter 미전송(기존 `SplitChat` 패턴).
- **대기 연출(전 LLM 대기 공통 패턴 — 05 §4.2가 횡단 방침)**: 정적 스피너 금지. 마이크로카피 순환(2.5초 간격): "머릿속을 펼쳐보는 중…" → "할 일 모양으로 빚는 중…" → "거의 다 됐어요". 8초 초과 시 "조금만 더 걸려요. 그대로 있어 주세요". 같은 패턴이 쪼개기의 advance·resplit 대기에도 적용된다(03 §3.2).
- **retry 응답 시**: AI 말풍선으로 안내 + 예시 2~3개 표시, `braindump` phase 잔류, 재입력 유도(PRD 5.1 — 되묻지 않고 예시로 돕는다).

### 3.2 후보 표시와 선택 (`phase: candidates`)

- 후보는 같은 채팅 안에서 **제목 한 줄짜리 경량 카드** 리스트로 표시. 설명·태그·시간 등 부가 정보 없음. `big`도 이 화면에는 표시하지 않는다(00 결정 7).
- 순차 등장(스태거) 애니메이션 — 10개가 한꺼번에 보여 압도되지 않게.
- 안내 카피: "다 고르지 않아도 돼요. 오늘은 1개면 충분해요."
- 탭 = 선택 토글. 1개 선택 즉시 확정 버튼 활성. **4번째 선택 시도**: 부드러운 안내 "오늘은 3개까지만 — 대신 꼭 끝내요." (선택은 반영하지 않음)
- 확정 버튼: **"이대로 확정 (n개)"** (n ≥ 1에서 활성). "3개 채우세요" 류 카피 금지.
- 보조 동선: "다시 쏟아내기" 텍스트 버튼 → `braindump`로 복귀(기존 입력 프리필). 후보가 마음에 안 들 때의 되돌리기 부담 제거.
- **확정 연출**: 선택 항목이 카드 형태로 변형되는 짧은 전환 — TODO Card 승격의 시각화. 확정 전까지 어떤 목록에도 반영하지 않는다(원칙 3).
- 확정 후 `split` phase로 전이(03 문서 — 쪼갤 카드 고르기 화면은 로컬 렌더라 여기엔 LLM 대기가 없다).

## 4. API 계약 — `POST /api/braindump` (신규)

- `app/api/braindump/route.ts` 신설. `/api/split` 패턴 준용: `runtime = "nodejs"`, provider 이중 지원(Claude 기본), stateless, 한국어 에러 매핑.

```ts
// components/demo/types.ts
export type BraindumpRequest = { provider?: Provider; braindump: string }; // 단일 액션 — action 필드 없음

export type Candidate = { title: string; big: boolean };
export type BraindumpResult =
  | { status: "ok"; message: string; candidates: Candidate[] }   // 1~10개
  | { status: "retry"; message: string; examples: string[] };    // PRD 5.1: 빈약한 입력 → 예시 제시
export type BraindumpResponse = BraindumpResult | { error: string };
```

- **시스템 프롬프트 요지** (`origin/feat/daily-top3`의 `EXTRACT_SYSTEM` 개작 — 원본은 "정확히 3개 확정"이므로 그대로 쓰지 않는다):
  - 브레인덤프에서 "실행 가능한 할 일 후보"를 **최대 10개** 추출. 확정이 아니라 **후보 제시** — 선택·확정은 사용자 몫(원칙 3).
  - 각 title은 오늘 손댈 수 있는 구체적 행동 한 줄. `big`은 시작이 막막한 큰 일 여부.
  - 순수 감정 토로·고민은 후보로 승격하지 않되, 실행형으로 바꿀 수 있으면 변환한다(예: "운동 다시 시작하고 싶다" → "오늘 20분 산책하기").
  - 후보를 만들기 어려운 입력(잡담·너무 짧음)이면 `status: "retry"` + 구체적 브레인덤프 예시 2~3개.
  - 따뜻하고 담백한 해요체, message는 한두 문장.
  - 출력은 JSON only — Claude `output_config: { format: { type: "json_schema", schema } }`, GPT `response_format: json_object` (기존 `callLLM` 패턴. `lib/llm.ts`로 공용 추출은 선택 — 1차엔 복제 허용).
- **서버 방어** (`asTasks`/`asStep` 관례 준용): `candidates.slice(0, 10)`, title 문자열 필터, `retry`인데 examples가 비면 폴백 문구, `braindump` 길이 상한(2,000자) 초과 시 400, 빈 입력 400. (길이 상한 검사는 이 API 전용 — `/api/split`은 현행 유지, 05 §4.1)

## 5. 상태·데이터

- 전이: `braindump --(ok)--> candidates`(retry면 잔류), `candidates --(확정)--> split`. 확정 시 선택 후보를 `DemoCard`로 승격(`id` 부여, `subtasks: []`, `firstStep: null`, `splitAnswers: []`), `candidates`는 상태에 보존(다시 쏟아내기·복원용).
- 저장: 상태 전이마다 `untangle:demo:v1` 갱신(01 문서).

## 6. 엣지 케이스

- 빈 입력·공백만: 전송 버튼 비활성.
- 너무 긴 입력: 클라이언트 2,000자 제한 + 서버 400.
- 후보가 1개만 추출됨: 그대로 진행(1개면 충분 — 원칙 3).
- API 에러·네트워크 오류: 에러 배너 + "다시 시도"(마지막 요청 재실행). 연속 실패해도 스크립트 폴백 없음(00 결정 6) — 배너 유지.
- 20초 무응답: 타임아웃 처리 후 에러 배너.
- 키 미설정: 제출 시점 에러 배너(진입은 허용).

## 7. 구현 범위

- **포함**: `app/api/braindump/route.ts`, `components/demo/types.ts`, 브레인덤프 채팅 화면(예시 칩·대기 연출·retry UI), 후보 리스트·선택·확정 UI, 카드 승격 연출.
- **제외**: 후보 편집·직접 추가(부가 기능), `big` 배지 표시(03에서 추천 문구로만 사용), 쪼개기 이후 단계(03·04).

## 8. 의존 관계

- 01(셸)과 병렬 착수 가능(API·타입은 독립). 화면 통합은 01의 `DemoFlow` 골격 위에서.
- 03이 이 문서의 `cards`·`braindump` 원문을 소비한다(원문은 쪼개기 advance의 `context`로 항상 전달 — 03 §4 필수 확장).