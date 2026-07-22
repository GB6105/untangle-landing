import type { Answer, Provider } from "@/components/split/types";

/**
 * Shared types for the full-flow demo (docs/features/00-overview.md §5).
 * Used by the client (components/demo/*) and the API route (app/api/braindump).
 */

/** One extracted to-do candidate — a suggestion, not a card (원칙 3). */
export type Candidate = { title: string; big: boolean };

export type DemoSubtask = { id: string; title: string; done: boolean };

/** A confirmed TODO Card — the product's core unit (PRD §4), demo edition. */
export type DemoCard = {
  id: string;
  title: string;
  big: boolean;
  /** Completion for undivided cards; split cards derive it from subtasks. */
  done: boolean;
  /** Present only after the card has been split. */
  firstStep: { title: string; done: boolean } | null;
  /** Empty until a split plan is confirmed. 기본 ≤5, 다시 쪼개기 시 최대 10. */
  subtasks: DemoSubtask[];
  /** Clarify history, kept so "더 쪼개기" resumes the past conversation. */
  splitAnswers: Answer[];
  /**
   * "다시 쪼개기"로 계획을 재생성한 횟수 — 카드당 MAX_RESPLITS까지. 훅의 ref만으로는
   * 패널을 다시 열 때마다 0으로 돌아가 무제한이 되므로 카드에 실어 저장한다.
   * 세는 것은 재생성(LLM 호출)뿐 — 저장된 계획을 열기만 하는 건 세지 않는다.
   */
  resplitCount: number;
};

export type DemoPhase = "braindump" | "candidates" | "split" | "today";

export type DemoState = {
  version: 1;
  phase: DemoPhase;
  /** Raw braindump — always sent as `context` to split advance (03 §4). */
  braindump: string;
  candidates: Candidate[];
  /** Confirmed cards only, 1~3. */
  cards: DemoCard[];
  /** Card being split; null while picking (split phase 첫 화면). */
  splittingCardId: string | null;
  /** Whether the one-shot feedback slide-up has been shown (04 §3.4). */
  slideupShown: boolean;
};

/** POST /api/braindump request body — single action, no `action` field. */
export type BraindumpRequest = { provider?: Provider; braindump: string };

/** POST /api/braindump success bodies (02-demo-braindump.md §4). */
export type BraindumpResult =
  | { status: "ok"; message: string; candidates: Candidate[] }
  | { status: "retry"; message: string; examples: string[] };

export type BraindumpResponse = BraindumpResult | { error: string };
