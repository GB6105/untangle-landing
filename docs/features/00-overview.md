> 요약: 랜딩 전체 플로우 데모(/demo)의 전체 그림 — 범위·플로우 지도·핵심 결정과 근거·공통 상태 설계·제품 원칙 매핑·문서 지도 — 데모 관련 작업을 시작하기 전 가장 먼저 읽는다.

# 데모 모드 개요

## 1. 배경과 목표

- 현재 랜딩은 Experience 섹션의 인라인 `SplitChat`으로 **쪼개기만** 체험 가능하다.
- 이 기획은 PRD의 핵심 흐름 **"진입 → 오늘 할 일 정하기 → 서브 테스크 생성 → 실행"** 전체를 방문자가 **자기 할 일**로 끝까지 체험하게 한다.
- 종착점: 실행(완료 체크) 체험 후 `/register`(체험 소감) CTA로 자연스럽게 전환.
- "앱 축소판"이 아니라 **핵심 가치 경로의 원형**을 재현한다. 생략하는 것은 부가 기능(카드 상세 편집·예상 소요 시간·메모)이고, 왜곡하지 않는 것은 단계 순서와 정보량 상한(후보 ≤10, 선택 1~3, 서브태스크 ≤5, 실행은 한 번에 하나), "사용자 확정 전 미반영" 규칙이다.

## 2. 체험 범위 (확정)

- **포함**: 브레인덤프 → 후보 추출(최대 10개, 실제 LLM 호출) → 오늘 할 일 1~3개 선택·확정 → 쪼개기(선택적, `/api/split` 소폭 수정 재사용 — §7) → Today 화면 실행(완료 체크) → `/register` 소감 CTA.
- **제외**: **재방문(다음날 재제안) 단계 — 완전 제외. 연출·설명·예고 문구도 만들지 않는다.** 카드 상세 편집, 예상 소요 시간, 메모, 통계·스트릭·달력.
- **목표 소요 시간 — 표준 경로(쪼개기 포함) 약 1:20~3:10, 에러 재시도 1회 포함 시 3:40 안팎까지 가능**:
  - 브레인덤프 입력 30~60초 · 후보 추출 호출 5~10초 · **후보 읽기(≤10, 스태거)·1~3개 선택·확정 15~30초**
  - 쪼개기 20~75초 = 초기 advance 호출 5~10초 + clarify 회당 10~20초(호출 5~10초 + 읽고 답하기 5~10초) × 0~2회(**상한 보장 — 03 §3.2**) + 결과 검토·확정 15~25초. 건너뛰면 0초.
  - Today 도착·첫 체크 10~15초.
  - **총 LLM 호출: 표준 2~4회**(후보 추출 1 + advance 1~3). resplit·상한 하드 가드 자동 호출·에러 재시도마다 +1회.
- 상단이 3분 언저리를 오가므로 **진입 CTA에는 검증 가능한 시간 약속("3분" 등)을 쓰지 않는다**(01 §3.2). "짧게 끝난다"는 안심 신호는 진행 점 3개가 담당한다. 시간 약속 위반은 ADHD 타깃에게 중도 이탈 요인.

## 3. 전체 플로우 지도

```
진입(Hero CTA / Experience 카드 / 직접 URL)
  → /demo
     braindump ──(후보 ok)──▶ candidates ──(1~3개 확정)──▶ split ──(계획 확정 or 건너뛰기)──▶ today
        │  ▲                                                 ▲                                  │
        │  └─(retry: 예시 제시 후 재입력)                     └──(카드의 "쪼개기/더 쪼개기")──────┘
        └─(언제든 X: 종료 — 상태는 localStorage에 저장, 재진입 시 이어하기)
  → today에서 첫 체크 이후 "소감 한 마디 남기기" CTA → /register?from=demo
```

- 상태 머신: `phase: "braindump" | "candidates" | "split" | "today"`. 쪼갤 카드 고르기/건너뛰기는 `split` phase의 첫 화면(`splittingCardId === null`)으로 표현한다.

## 4. 핵심 결정과 근거 (세 관점 초안의 충돌 판정 포함)

| # | 쟁점 | 결정 | 근거 (판정 기준: PRD 제품 원칙 + 사용자 확정 결정) |
| --- | --- | --- | --- |
| 1 | 라우트 vs 오버레이 | **별도 라우트 `/demo`** (세 초안 일치) | 몰입감(랜딩 문맥 제거) / 뒤로가기·새로고침이 브라우저 기본 동작과 일치 / 라우트 단위 코드 스플리팅으로 랜딩 첫 로드 경량 / 페이지뷰 단위 퍼널 측정 / `/register`·(과거) `/split`과 동일한 관례. Intercepting+Parallel Routes는 "soft nav일 때만 모달" 용도라 항상 풀스크린인 데모엔 순수 오버헤드 — 일반 라우트로 충분 |
| 2 | 기존 Experience 인라인 카드 | **데모 진입점화 — 스크립트 프리뷰 카드 + 진입 CTA로 교체** (초안 2·3 채택) | 확정 결정 "전체 화면 데모 모드"와 정합(첫 입력도 데모 안에서 시작) / 입력 지점 단일화 = 압도하지 않기 / 인라인에서 쪼개기를 끝내면 풀데모 동기가 사라지고 "쪼개기만 본 소감"이 수집됨 / 랜딩 번들에서 SplitChat·fetch 로직 제거 / LLM 호출 이중 발생 차단. 초안 1의 "라이브 입력 + seed 핸드오프"는 미채택하되, **모조 입력창 탭 시 즉시 `/demo` 브레인덤프 화면으로 전환**으로 낮은 진입 장벽 이점은 수용 |
| 3 | 상태 저장소 | **`localStorage` 키 `untangle:demo:v1`** (초안 1·3 채택, 초안 2의 sessionStorage 기각) | 맥락 유지 원칙 — 탭을 닫았다 와도 이어하기 가능. 스테일 문제는 재진입 시 "이어서 할까요? / 처음부터" 선택으로 해소 |
| 4 | 후보 추출 API | **신규 `POST /api/braindump`** (초안 2·3 채택, 초안 1의 `/api/split` action 확장 기각) | `/api/split`에 액션을 덧붙이지 않고 분리(단, `/api/split` 자체는 "무수정"이 아니라 03 §4의 필수 소폭 수정 2가지가 있다 — §7) / 단일 액션이라 계약 단순 / `origin/feat/daily-top3`의 `app/api/plan/route.ts` `EXTRACT_SYSTEM`이 개작 출발점(단, "정확히 3개 확정" → "후보 최대 10개 + 사용자 선택"으로 변경 필수 — 검증 완료) |
| 5 | 소감 CTA 노출 시점 | **Today에서 첫 체크 이후** (초안 1·2 채택, 초안 3의 상시 노출 기각) | 확정 결정 5 "실행 체험 후 전환" / 가치 실감 이후의 CTA가 전환율·진정성 모두 우위 / 실행을 가로막는 모달 금지 |
| 6 | LLM 장애 시 스크립트 폴백 | **v1 제외** (초안 2 제안 기각) | 확정 결정 3 "실제 LLM 호출" / 가짜 결과로 흐름을 잇는 것은 신뢰 훼손. 대신 기존 에러 배너 + "다시 시도" 패턴 유지. 열린 질문으로만 남김 |
| 7 | 후보의 `big`(막막한 일) 표시 | **데이터로는 유지, 후보 리스트 UI에는 표시하지 않음** (초안 1·3 절충) | 압도하지 않기 — 후보 화면은 제목 한 줄만. `big`은 쪼개기 제안 단계에서 "이 일이 가장 막막해 보여요" 추천 문구에만 활용 (PRD 5.2) |
| 8 | 진행 표시 | **점 3개: 정하기 · 쪼개기 · 실행** (초안 1 채택, 초안 2의 4점 기각) | PRD 기능 구분(5.1 Today-todo / 5.2 Subtask-split / 실행)과 일치, 정보 최소. "짧게 끝난다"는 안심 신호 역할 — 숫자 카운트다운·타이머류 금지 |
| 9 | 진입점 | **Hero 직하 Primary CTA 신설 + Experience 프리뷰 카드** (초안 2 채택) | 현재 Hero에 CTA 없음(확인) — above-the-fold 행동 요청 부재는 이탈 요인. FinalCta 직전 보조 진입점은 v2 선택 사항 |
| 10 | 완료 연출 강도 | **절제된 체크 마이크로 애니메이션** (컨페티 등 과한 연출 금지) | 압도하지 않기 + 시스템 톤(따뜻·담백)과의 정합 |

## 5. 공통 상태·데이터 설계

- 신규 `components/demo/types.ts` (기존 `components/split/types.ts` 관례대로 클라이언트·API 공유):

```ts
import type { Answer, Provider } from "@/components/split/types";

export type Candidate = { title: string; big: boolean };

export type DemoSubtask = { id: string; title: string; done: boolean };
export type DemoCard = {
  id: string;
  title: string;
  big: boolean;
  done: boolean;
  firstStep: { title: string; done: boolean } | null; // 쪼갠 카드만
  subtasks: DemoSubtask[];                             // 쪼개기 확정 전엔 []
  splitAnswers: Answer[]; // 다시 쪼개기 시 이전 문답 재전송 — stateless 서버와 정합
};

export type DemoPhase = "braindump" | "candidates" | "split" | "today";
export type DemoState = {
  version: 1;
  phase: DemoPhase;
  braindump: string;              // 원문 — 쪼개기 advance의 context로 항상 전달(03 §4, 필수)
  candidates: Candidate[];        // 확정 전 제안 — 카드 아님 (원칙 3)
  cards: DemoCard[];              // 확정된 것만, 1~3개
  splittingCardId: string | null; // split phase의 대상 카드 (null = 고르는 중)
  slideupShown: boolean;          // Today 첫 체크 슬라이드업의 1회성 노출 여부 (04 §3.4)
};
```

- **저장**: `localStorage("untangle:demo:v1")`에 `DemoState` 전체 직렬화. 마운트 후 `useEffect`에서 복원(기존 `SplitChat`의 SSR-하이드레이션 주석 패턴 준용), 저장 실패는 무시.
- **채팅 대화 로그는 저장하지 않는다** — phase별 컴포넌트 로컬 상태로 두고 `DemoState`에는 결과물만 저장. 복원 시 현재 phase에 맞는 요약 안내 1문장으로 재개한다(저장 크기·복원 복잡도 절감). 이로 인한 원칙 4의 보존 범위 한계는 §6에 명시.
- 기존 `untangle:todos`(flat string[]) 키와 **섞지 않는다** — Experience 진입점화와 함께 자연 소멸.
- 오케스트레이션: `components/demo/DemoFlow.tsx`("use client")에서 `useReducer` 단일 리듀서 권장 — 단계 전이가 명시적이고 직렬화가 한 번에 된다.

## 6. 제품 원칙 4가지 ↔ 데모 반영

| 원칙 | 데모 반영 지점 |
| --- | --- |
| 압도하지 않기 | 후보 ≤10, 화면엔 제목 한 줄만 · 선택 1~3 · 서브태스크 ≤5(resplit 후에도 확정은 최대 5개 선택 — 03 §3.2) · 진행 표시는 점 3개 · Today는 확정 카드만, 한 번에 한 장만 펼침 · 화면당 주 행동 1개 · 완료 연출 절제 · 금지 카피: 타이머/카운트다운, "3개 채우세요", "아직 N개 남았어요", 밀린 목록 |
| 질문은 꼭 필요한 만큼만 | clarify 질문 상한을 **프롬프트 지시 + 클라이언트 가드로 강제**(목표 2회·최대 3회 — 03 §3.2. 기존 `ADVANCE_SYSTEM`은 5개 맥락 키를 채울 때까지 묻는 구조로 상한이 없어 **수정 필수**) · 브레인덤프 원문을 `context`로 항상 전달해 이미 파악된 맥락 재질문 차단(필수 — 03 §4) · 한 번에 하나, 옵션 칩 우선 · "그냥 이대로 쪼개줘" 스킵 칩 상시 · 쪼개기 확정 후 "다른 카드도 쪼갤까요?"를 **묻지 않음** · 브레인덤프 실패 시 되묻는 대신 예시 제시(PRD 5.1) |
| 사용자가 결정하게 하기 | 후보는 확정 전 어떤 목록에도 미반영 · 서브태스크는 "이 계획으로 시작" 전 카드 미부착 · resplit 결과도 확정해야 대체 · 1개면 충분(3개 강요 없음) · 쪼개기 건너뛰기 상시 · 완료 체크를 시스템이 대신하지 않음(쪼갠 카드에 일괄 완료용 카드 체크를 두지 않는 이유 — 04 §3.2) |
| 맥락을 잃지 않기 | `untangle:demo:v1` 저장 + 재진입 이어하기 · 전 단계가 한 흐름(라우트 하나) 안에서 진행 · 브레인덤프 원문을 쪼개기 `context`로 전달(필수 — 03 §4) · 카드별 `splitAnswers` 보존으로 다시 쪼개기 시 이전 문답에 이어감 · **단, 보존 범위는 의도적으로 결과물 수준까지다**: 후보·카드·`splitAnswers`·phase는 저장하지만, 진행 중이던 clarify 개별 문답과 미전송 브레인덤프 입력은 데모에서 유실을 허용한다(저장 크기·복원 복잡도와의 트레이드오프 — §5, 03 §6). 저비용 보완(초안·진행 중 문답의 `DemoState` 포함)은 §9 열린 질문 |

## 7. 기존 자산 재사용 지도 (코드베이스 검증 완료)

- **무수정 재사용**: `components/split/ChatBubble.tsx`·`OptionChips.tsx`·`TaskCard.tsx`, `components/Icon.tsx`.
- **소폭 수정 재사용**:
  - `app/api/split/route.ts` — 계약의 액션·응답 스키마(advance/resplit)는 그대로 두되 **필수 수정 2가지**(03 §4): ① `ADVANCE_SYSTEM`에 질문 상한(목표 2회·최대 3회)·잔여 항목 합리적 가정·스킵 지시 추가 — 현행 프롬프트는 5개 맥락 키(why/current/done/capacity/blocker)를 모두 채울 때까지 묻는 구조로 상한이 없다(코드 확인, 최대 5회 가능). ② advance 요청에 `context?: string`(브레인덤프 원문) 하위 호환 필드 추가. 완료 현황 전달은 필드 추가 없이 `otherTasks` 문자열 표기 컨벤션으로(03 §3.3).
  - `components/CtaButton.tsx` — 현재 `href="/register"` 하드코딩, props는 label·className뿐(코드 확인)이라 "무수정"이 성립하지 않는다. **`href` prop 추가(기본값 `"/register"`)** 후 01(Experience 진입 CTA → `/demo`)·04(`/register?from=demo`)에서 재사용.
- **분리 후 재사용**: `components/split/SplitChat.tsx` — 대화 로직을 `useSplitFlow` 훅으로 추출(03 문서). 인라인 카드는 Experience 진입점화로 제거되므로 소비자는 데모 내부 패널 하나.
- **개작 출발점**: `origin/feat/daily-top3`의 `app/api/plan/route.ts` `EXTRACT_SYSTEM`·스키마(정확히 3개 → 후보 ≤10 + retry 상태로 개작), `components/today/types.ts`의 `UITask` 중첩 구조.
- **선별 반영**: `origin/feat/split-analytics`의 `lib/analytics.ts` + `instrumentation-client.ts`(05 문서). **주의: 이 브랜치는 `SplitChat.tsx`도 수정하므로, 머지/폐기 결정을 SplitChat 리팩터링 전에 정리해야 충돌을 피한다.**
- **셸 전례**: PR #5에서 삭제된 `app/split/page.tsx`(`min-h-dvh` 풀스크린, 서버 컴포넌트 + metadata + 닫기 링크 + 클라이언트 채팅) — `/demo` 셸의 검증된 패턴.
- 신규 파일 위치(STRUCTURE.md 컨벤션): `app/demo/page.tsx`, `app/api/braindump/route.ts`, `components/demo/*`, `lib/analytics.ts`. 구현 시 STRUCTURE.md 갱신은 별도 허락이 필요하다.

## 8. 문서 지도와 읽는 순서 / 구현 순서

| 순서 | 문서 | 내용 | 의존 |
| --- | --- | --- | --- |
| 00 | `00-overview.md` (이 문서) | 전체 그림·결정·공통 설계 | — |
| 01 | `01-demo-shell.md` | `/demo` 셸, 진입점(Hero·Experience), 진행 표시, 저장/복원, 중도 종료 | — |
| 02 | `02-demo-braindump.md` | 브레인덤프 + `/api/braindump` + 후보 표시 + 1~3개 선택·확정 | 01과 병렬 가능 |
| 03 | `03-demo-split.md` | 쪼갤 카드 고르기/건너뛰기, `useSplitFlow` 추출, 데모 쪼개기 패널, 질문 상한 보장, Today 재진입 | 01 (02와 병렬 착수 가능) |
| 04 | `04-demo-today.md` | Today 실행 화면, TODO Card 스펙, 완료 연출, `/register` CTA 전환 | 02, 03 |
| 05 | `05-demo-logging.md` | analytics 반영, `demo_*` 이벤트, 공통 에러·대기 연출 방침 | 01~04 (계측 자체는 각 단위에 포함 가능) |

- 구현 순서: **(01 ∥ 02) → 03(훅 추출 선행) → 04 → 05**. 04가 유일하게 02·03 모두를 요구하는 합류점.

## 9. 열린 질문

- 방문자당 LLM 호출 상한(표준 2~4회 + resplit·재시도 — §2): v1은 상한 없이 PostHog 사용량 관찰 후 필요 시 도입.
- LLM 장애 시 스크립트 폴백(결정 6에서 v1 제외): 장애가 실측되면 재론.
- `/register` 폼에 데모 결과 요약 자동 첨부(소감 품질↑ vs 개인정보·구현 비용): 미결.
- FinalCta 직전 보조 진입점(미체험 스크롤러용): v2 선택 사항.
- 브레인덤프 미전송 초안·진행 중 clarify 문답의 `DemoState` 보존(원칙 4 보존 범위 확대 — §6): v1은 결과물 수준 보존. 이탈 지표가 필요성을 보이면 재론.