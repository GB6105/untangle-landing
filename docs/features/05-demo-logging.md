> 요약: 데모 퍼널 로깅(demo_* 이벤트)과 공통 에러·대기 연출 방침 — 계측을 붙이거나 에러/대기 UX를 맞출 때 읽는다.

# 로깅과 공통 에러 방침

## 1. 목적

- 데모 퍼널(진입 → 브레인덤프 → 후보 → 확정 → 쪼개기 → 첫 체크 → 소감 CTA)의 단계별 이탈 지점을 측정한다.
- 전 단계에 일관된 에러·대기 UX를 보장한다 — 데모가 API 장애로 막다른 길이 되면 그 방문자는 영구 이탈이다.

## 2. 전제: analytics 인프라 반영

- `origin/feat/split-analytics`(main 미머지 — 확인)의 자산을 **선별 반영**한다:
  - `lib/analytics.ts`: PostHog 래퍼 — 명시적 `track()`만 전송, 자동수집·세션리플레이·서베이 등 원격 토글 가능 경로 전부 코드로 차단, **유저 원문 대신 메타데이터(길이·개수·enum key)만**, 토큰 없으면 SDK 미로드(no-op), 초기화 전 이벤트 큐잉.
  - `instrumentation-client.ts`: hydration 전 초기화(Next.js 16 컨벤션 유효 — 확인).
  - `.env.example`·package 의존성.
- **주의**: 이 브랜치는 `components/split/SplitChat.tsx`도 수정한다(계측 + providerRef 버그 수정). 03의 `useSplitFlow` 추출과 충돌하므로, **브랜치 머지/폐기 결정을 리팩터링 전에 정리**할 것. 권장: `lib/analytics.ts`·`instrumentation-client.ts`·env만 선별 반영하고 SplitChat 수정분은 훅 추출에 흡수.

## 3. 퍼널 이벤트 정의 (`demo_*` — 기존 `split_*` 명명 관례 준용, 원문 미전송)

| 이벤트 | 속성 | 시점 |
| --- | --- | --- |
| `demo_enter` | `source: "hero"\|"experience"\|"direct"` | `/demo` 최초 렌더 (진입점은 쿼리 또는 referrer로 구분) |
| `demo_resumed` | `phase` | 저장 상태에서 "이어서 하기" 선택 |
| `demo_braindump_submitted` | `length` | 브레인덤프 전송 |
| `demo_candidates_shown` | `count, bigCount` | 후보 표시 |
| `demo_retry_shown` | — | retry(예시 제시) 표시 |
| `demo_todos_confirmed` | `count, bigCount` | 1~3개 확정 |
| `demo_split_started` | `source: "offer"\|"today_card"` | 쪼갤 카드 선택 |
| `demo_split_skipped` | — | "바로 시작할게요" |
| `demo_split_capped` | `kind: "soft"\|"hard"` | 질문 상한 가드 발동(03 §3.2-2·3) — 상한 메커니즘 실효성 측정 |
| (쪼개기 내부) | 기존 `split_*` 이벤트 재사용 + `context: "demo"` 속성 추가 | clarify·result·resplit·확정 |
| `demo_task_checked` | `kind: "first_step"\|"subtask"\|"card", remaining` | 체크 토글(on) — `card`는 미분해 카드만(04 §3.2) |
| `demo_first_check` | — | 전 카드 통틀어 최초 체크 1회 |
| `demo_all_done` | — | 모든 카드 완료 |
| `demo_register_cta_clicked` | `from: "slideup"\|"bar"\|"complete"` | 소감 CTA 클릭 |
| `demo_exit` | `phase, hasResults` | X로 종료 |
| `demo_error` | `step, kind: "api"\|"network"` | 에러 배너 표시 |

- 성공 지표(제안): 데모 진입률, 데모 완주율(첫 체크 도달), 완주자 소감 제출률, 부분 체험자 소감 제출률.
- `/register?from=demo`: 서버 액션 저장 스키마 변경 없이 클라이언트 이벤트로만 구분(시트 컬럼 추가는 미결 — 00 열린 질문).

## 4. 공통 에러·대기 방침

### 4.1 서버

- **공통**(`/api/braindump`, `/api/split`): body 파싱 실패 → 400. 빈 입력(braindump/goal) → 400.
- **`/api/braindump` 전용**: `braindump` 길이 상한(2,000자) 초과 → 400 (02 §4).
- **`/api/split`**: 길이 상한 검사는 **현행대로 없음**(빈 goal 400만) — 상한 추가는 03 §7의 계약 변경 제외 방침에 따라 v1 범위 아님. goal은 후보 title에서 오므로 실질 위험도 낮다.
- `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` 부재 → 500 + `.env.local` 안내 한국어 메시지(기존 문구 재사용).
- `AuthenticationError` → 500, `RateLimitError` → 429, LLM JSON 파싱 실패 → 재시도 유도 메시지, Claude `refusal` → 다른 내용 유도 메시지.
- 응답은 전부 `{ error: string }` 형태(한국어) — 기존 `/api/split` 매핑 재사용.

### 4.2 클라이언트 (전 단계 공통 — `SplitChat` 검증 패턴을 훅·데모로 이관)

- **대기 연출(모든 LLM 대기 공통 — 횡단 방침)**: `/api/braindump`·advance·resplit의 모든 대기에 **마이크로카피 순환(2.5초 간격) + 8초 초과 시 "조금만 더 걸려요" 안내**를 적용한다. 정적 스피너·무언 인디케이터 금지 — 기존 `SplitChat`의 바운스 점 3개만 두는 것도 여기 해당한다. 단계별 카피는 02 §3.1(브레인덤프)·03 §3.2(쪼개기). 숨은 대기가 생기는 전이(카드 선택 직후 등)는 즉시 표시되는 로컬 안내 문장으로 예고한다(03 §3.1).
- `error` 상태 + `retry` 클로저(마지막 요청 재실행) — 배너 + "다시 시도" 버튼.
- gen-ref 가드: 리셋/처음부터 이후 도착한 스테일 응답 무시.
- IME 조합 중 Enter 미전송.
- 20초 타임아웃 → 에러 배너. 연속 실패에도 **스크립트 폴백 없음**(00 결정 6) — 실제 LLM 호출 원칙 유지.
- 키 미설정 환경에서도 `/demo` 진입은 허용, 제출 시점에만 배너.
- 에러 중 입력 텍스트는 보존한다(기존 `handleSend` 관례 — "다시 시도"가 복구 경로).

## 5. 엣지 케이스

- PostHog 토큰 없음: 모든 `track()` no-op — 기능 동작에 영향 없음.
- SDK 로드 실패: 큐 폐기, 이후 무시(analytics는 절대 제품을 깨지 않는다).
- 광고 차단기: 계측 유실 허용 — 지표 해석 시 감안.

## 6. 구현 범위

- **포함**: analytics 자산 선별 반영, `demo_*` 이벤트 계측(각 구현 단위 PR에 분산 포함 가능), 에러·대기 방침의 훅/공통 컴포넌트화.
- **제외**: 세션당 LLM 호출 상한(00 열린 질문 — 사용량 관찰 후), 서버 사이드 로깅, A/B 테스트.

## 7. 의존 관계

- 01~04 전반에 걸친 횡단 관심사. analytics 브랜치 정리(§2 주의)는 03의 훅 추출보다 먼저.