/**
 * Shared types for the "오늘의 계획" (daily top-3) feature — FEATURE.md §1.
 * Used by the client (`PlanChat`) and the API route (`app/api/plan`).
 */

/** Which LLM provider backs the Co-Planner. GPT is the default this round. */
export type Provider = "claude" | "gpt";

/** A core task extracted from the brain dump (1.2). `big` flags a daunting one (1.3). */
export type CoreTask = { title: string; big: boolean };

export type Subtask = { title: string };

/** One answered turn in the subdivide Q&A (1.4). */
export type QA = { question: string; answer: string };

/** A subdivide clarify question with pick-first options (free text also allowed). */
export type PlanQuestion = { text: string; options: string[] };

/** POST /api/plan request bodies. */
export type PlanRequest =
  | { action: "extract"; provider?: Provider; braindump: string }
  | {
      action: "subdivide";
      provider?: Provider;
      braindump: string;
      task: string;
      answers: QA[];
    };

/** Response for `extract` (1.2). */
export type ExtractResponse = { message: string; tasks: CoreTask[] };

/** Response for `subdivide` (1.3/1.4) — multi-turn until `ready`. */
export type SubdivideResponse =
  | { status: "need_more"; message: string; question: PlanQuestion }
  | { status: "ready"; message: string; subtasks: Subtask[] };

export type PlanResponse = ExtractResponse | SubdivideResponse | { error: string };

/** Client-side UI state for a subtask (in-memory only; 1.5 persistence deferred). */
export type UISubtask = { id: string; title: string; done: boolean };

/** Client-side UI state for a core task. */
export type UITask = {
  id: string;
  title: string;
  big: boolean;
  done: boolean;
  subtasks: UISubtask[];
  subdivided: boolean;
  declined: boolean;
};
