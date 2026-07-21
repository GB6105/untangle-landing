"use client";

import { useEffect, useRef, useState } from "react";
import type {
  Answer,
  Provider,
  Question,
  SplitRequest,
  SplitResponse,
  Task,
} from "@/components/split/types";

/**
 * Co-Planner 쪼개기 대화 로직 — extracted from the old inline SplitChat so the
 * demo can drive it with an injected goal (docs/features/03-demo-split.md §4).
 *
 * Differences from the old component: no intro phase (the goal is the card
 * title), `context` (브레인덤프 원문) rides along on every advance, and the
 * PRD's "최대 2~3번" question cap is actually enforced here:
 *  - soft guard: the 3rd answer is sent with an "assume the rest" suffix;
 *  - hard guard: a `need_more` after 3 answers is never shown — one silent
 *    skip-advance is retried, then an error banner. A 4th question cannot
 *    reach the screen (03 §3.2).
 *
 * The caller must keep `goal`/`initialAnswers`/`initialResult`/`context`
 * stable for the hook's lifetime — remount (e.g. key by card id) to change them.
 */

export const SKIP_ANSWER = "그냥 이대로 쪼개줘";
const SOFT_GUARD_SUFFIX = " (남은 건 알아서 가정하고 이대로 쪼개주세요)";
const IMMEDIATE_ACK = "좋아요. 몇 가지만 짧게 여쭤볼게요.";
const REOPEN_NOTE = "저장해둔 계획이에요. 더 잘게 쪼갤 항목이 있으면 눌러 주세요.";
const NETWORK_ERROR = "연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
const HARD_GUARD_ERROR =
  "질문이 길어지지 않게 여기서 바로 쪼개볼게요. 다시 시도를 눌러 주세요.";

const QUESTION_CAP = 3;
const MAX_TASKS = 5;
export const MAX_SELECTED = 5;

export type FlowTask = { id: string; title: string; done: boolean };
export type FlowLogItem = { id: number; role: "user" | "ai"; text: string };

export type UseSplitFlowArgs = {
  /** 데모는 claude 고정. */
  provider?: Provider;
  /** 카드 title이 주입된다 — 목표 입력(intro) 단계는 없다. */
  goal: string;
  /** 다시 쪼개기: 이전 clarify 문답에 이어간다 (원칙 4). */
  initialAnswers?: Answer[];
  /**
   * 쪼갠 카드 재진입: 저장된 계획으로 result 화면을 재구성하고 항목별
   * resplit만 허용한다 — advance는 다시 돌지 않는다 (03 §3.3).
   */
  initialResult?: { tasks: { title: string; done: boolean }[]; firstStep: Task } | null;
  /** 브레인덤프 원문 — 데모는 항상 전달 (03 §4 필수 확장). */
  context?: string;
  onConfirm: (result: { tasks: Task[]; firstStep: Task; answers: Answer[] }) => void;
};

async function postSplit(body: SplitRequest): Promise<SplitResponse> {
  const res = await fetch("/api/split", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as SplitResponse;
}

export function useSplitFlow({
  provider = "claude",
  goal,
  initialAnswers,
  initialResult,
  context,
  onConfirm,
}: UseSplitFlowArgs) {
  const reopening = !!initialResult;

  const [phase, setPhase] = useState<"clarify" | "result">(
    reopening ? "result" : "clarify",
  );
  const [log, setLog] = useState<FlowLogItem[]>([
    { id: 0, role: "ai", text: reopening ? REOPEN_NOTE : IMMEDIATE_ACK },
  ]);
  const [pending, setPending] = useState<Question | null>(null);
  const [loading, setLoading] = useState(false);
  const [tasks, setTasks] = useState<FlowTask[]>(() =>
    (initialResult?.tasks ?? []).map((t, i) => ({
      id: `t${i}`,
      title: t.title,
      done: t.done,
    })),
  );
  const [firstStep, setFirstStep] = useState<Task | null>(
    initialResult ? { title: initialResult.firstStep.title } : null,
  );
  const [selected, setSelected] = useState<Record<string, boolean>>(() => {
    const all: Record<string, boolean> = {};
    (initialResult?.tasks ?? []).forEach((_, i) => (all[`t${i}`] = true));
    return all;
  });
  const [resplittingId, setResplittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<(() => void) | null>(null);

  const answersRef = useRef<Answer[]>(initialAnswers ?? []);
  const taskCounter = useRef(tasks.length);
  const logCounter = useRef(1);
  const autoSkipUsed = useRef(false);
  const started = useRef(false);

  const appendAi = (text: string) => {
    if (!text?.trim()) return;
    setLog((prev) => [...prev, { id: logCounter.current++, role: "ai", text }]);
  };
  const appendUser = (text: string) =>
    setLog((prev) => [...prev, { id: logCounter.current++, role: "user", text }]);

  const makeTasks = (list: Task[], done = false): FlowTask[] =>
    list
      .slice(0, MAX_TASKS)
      .map((t) => ({ id: `t${taskCounter.current++}`, title: t.title, done }));

  function showResult(taskList: Task[], step: Task) {
    const flow = makeTasks(taskList);
    setTasks(flow);
    setFirstStep({ title: step.title });
    const all: Record<string, boolean> = {};
    flow.forEach((t) => (all[t.id] = true));
    setSelected(all);
    setPhase("result");
  }

  async function runAdvance(answers: Answer[]) {
    setLoading(true);
    setError(null);
    setRetry(null);
    try {
      const data = await postSplit({
        action: "advance",
        provider,
        goal,
        answers,
        context,
      });
      if ("error" in data) {
        setError(data.error);
        setRetry(() => () => runAdvance(answers));
        return;
      }
      if (data.status === "ready") {
        appendAi(data.message);
        showResult(data.tasks, data.firstStep);
        return;
      }
      if (data.status !== "need_more") return;

      if (answers.length >= QUESTION_CAP) {
        // 하드 가드: 4번째 질문은 화면에 올리지 않는다 (03 §3.2-3).
        if (!autoSkipUsed.current) {
          autoSkipUsed.current = true;
          const skipAnswers = [
            ...answers,
            { key: data.question.key, question: data.question.text, answer: SKIP_ANSWER },
          ];
          answersRef.current = skipAnswers;
          // await로 이어야 바깥 finally가 자동 스킵 요청 중에 loading을 끄지 않는다.
          await runAdvance(skipAnswers);
        } else {
          // 같은 자동 스킵 호출을 그대로 재실행한다 — 재시도마다 합성 문답을
          // 더 쌓지 않는다 (03 §6).
          setError(HARD_GUARD_ERROR);
          setRetry(() => () => runAdvance(answers));
        }
        return;
      }

      appendAi(data.message);
      appendAi(data.question.text);
      setPending(data.question);
    } catch {
      setError(NETWORK_ERROR);
      setRetry(() => () => runAdvance(answers));
    } finally {
      setLoading(false);
    }
  }

  // Kick off the first advance right after the card is picked (03 §3.1) — the
  // seeded IMMEDIATE_ACK line is already on screen, so the wait is announced.
  useEffect(() => {
    if (reopening || started.current) return;
    started.current = true;
    void runAdvance(answersRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run-once kickoff; args are stable per mount (see contract above)
  }, []);

  function answerPending(text: string) {
    const answer = text.trim();
    if (!pending || loading || !answer) return;
    const question = pending;
    appendUser(answer);
    setPending(null);
    // 소프트 가드: 3번째 답변에는 "남은 건 가정" 문구를 실어 보낸다 (03 §3.2-2).
    const isThird = answersRef.current.length >= QUESTION_CAP - 1;
    const sent =
      isThird && answer !== SKIP_ANSWER ? `${answer}${SOFT_GUARD_SUFFIX}` : answer;
    const next = [
      ...answersRef.current,
      { key: question.key, question: question.text, answer: sent },
    ];
    answersRef.current = next;
    void runAdvance(next);
  }

  async function runResplit(task: FlowTask) {
    if (resplittingId || loading || task.done) return;
    setResplittingId(task.id);
    setError(null);
    setRetry(null);
    const remaining = tasks.filter((t) => t.id !== task.id);
    try {
      const data = await postSplit({
        action: "resplit",
        provider,
        goal,
        answers: answersRef.current,
        taskToSplit: task.title,
        // 완료 현황은 "(완료)" 표기 컨벤션으로 전달 — 계약 변경 없음 (03 §3.3).
        otherTasks: remaining.map((t) => (t.done ? `${t.title} (완료)` : t.title)),
      });
      if ("error" in data) {
        setError(data.error);
        setRetry(() => () => runResplit(task));
        return;
      }
      if (data.status !== "resplit") return;
      appendAi(data.message);
      const subs = makeTasks(data.tasks);
      setTasks([...subs, ...remaining]);
      setFirstStep({ title: data.firstStep.title });
      // 기본 선택은 새 하위 항목 우선으로 5개까지 (03 §3.2 — 5개 상한 규칙).
      setSelected((prev) => {
        const next: Record<string, boolean> = {};
        let count = 0;
        for (const s of subs) {
          if (count >= MAX_SELECTED) break;
          next[s.id] = true;
          count++;
        }
        for (const t of remaining) {
          if (count >= MAX_SELECTED) break;
          if (prev[t.id]) {
            next[t.id] = true;
            count++;
          }
        }
        return next;
      });
    } catch {
      setError(NETWORK_ERROR);
      setRetry(() => () => runResplit(task));
    } finally {
      setResplittingId(null);
    }
  }

  const toggleSelected = (taskId: string) =>
    setSelected((prev) => ({ ...prev, [taskId]: !prev[taskId] }));

  const selectedCount = tasks.filter((t) => selected[t.id]).length;
  const overCap = selectedCount > MAX_SELECTED;

  function confirm() {
    if (!firstStep || selectedCount === 0 || overCap) return;
    onConfirm({
      tasks: tasks.filter((t) => selected[t.id]).map((t) => ({ title: t.title })),
      firstStep,
      answers: answersRef.current,
    });
  }

  function retryNow() {
    if (!retry) return;
    const run = retry;
    setError(null);
    setRetry(null);
    run();
  }

  return {
    phase,
    log,
    pending,
    loading,
    tasks,
    firstStep,
    selected,
    selectedCount,
    overCap,
    resplittingId,
    error,
    canRetry: retry !== null,
    answerPending,
    runResplit,
    toggleSelected,
    confirm,
    retryNow,
  };
}
