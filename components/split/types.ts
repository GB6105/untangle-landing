/**
 * Shared types for the 쪼개기 (Split) feature — FEATURE.md §3.
 * Used by both the client (`SplitChat`) and the API route (`app/api/split`).
 */

/** The 5 context items the Co-Planner clarifies before decomposing (F3-2). */
export type ContextKey = "why" | "current" | "done" | "capacity" | "blocker";

export const CONTEXT_LABELS: Record<ContextKey, string> = {
  why: "왜 하는가",
  current: "지금 어디까지 왔나",
  done: "무엇이 되면 끝인가",
  capacity: "지금 낼 수 있는 여력",
  blocker: "시작을 막는 것",
};

/** One clarify turn the user has already answered. */
export type Answer = {
  key: ContextKey;
  question: string;
  answer: string;
};

/** A clarify question with pick-first options (free-text answers also allowed). */
export type Question = {
  key: ContextKey;
  text: string;
  options: string[];
};

export type Task = { title: string };

/** Which LLM provider backs the Co-Planner for a given request. */
export type Provider = "claude" | "gpt";

/** POST /api/split request bodies. */
export type SplitRequest =
  | {
      action: "advance";
      provider?: Provider;
      goal: string;
      answers: Answer[];
      /**
       * 이미 파악된 오늘의 맥락(예: 데모의 브레인덤프 원문). 주어지면 그 안에서
       * 드러난 항목은 다시 묻지 않는다 — 하위 호환 확장 (docs/features/03-demo-split.md §4).
       */
      context?: string;
    }
  | {
      action: "resplit";
      provider?: Provider;
      goal: string;
      answers: Answer[];
      taskToSplit: string;
      otherTasks: string[];
    };

/** POST /api/split success/error response bodies. */
export type SplitResult =
  | { status: "need_more"; message: string; question: Question }
  | { status: "ready"; message: string; tasks: Task[]; firstStep: Task }
  | { status: "resplit"; message: string; tasks: Task[]; firstStep: Task };

export type SplitResponse = SplitResult | { error: string };
