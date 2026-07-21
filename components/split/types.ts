/**
 * Shared types for the 쪼개기 (Split) feature — docs/features/03-demo-split.md.
 * Used by both the client (`useSplitFlow`) and the API route (`app/api/split`).
 *
 * 질문 내용은 모델이 자유롭게 정한다 — 고정된 맥락 항목(key) 체계는 없다.
 */

/** One clarify turn the user has already answered. */
export type Answer = {
  question: string;
  answer: string;
};

/** A clarify question with pick-first options (free-text answers also allowed). */
export type Question = {
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
