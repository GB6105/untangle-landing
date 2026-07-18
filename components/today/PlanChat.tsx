"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { Bubble } from "@/components/today/Bubble";
import { OptionChips } from "@/components/today/OptionChips";
import { TaskItem } from "@/components/today/TaskItem";
import type {
  CoreTask,
  ExtractResponse,
  PlanQuestion,
  PlanResponse,
  QA,
  Subtask,
  SubdivideResponse,
  UISubtask,
  UITask,
} from "@/components/today/types";

const WELCOME =
  "오늘 해야 할 것 같은 일들을 떠오르는 대로 편하게 적어보세요. 정리가 안 돼도 괜찮아요. 제가 오늘 집중할 핵심 3가지를 골라드릴게요.";
const NETWORK_ERROR = "연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";
const PROVIDER = "gpt" as const;

type Phase = "intro" | "plan";
type LogItem = { id: number; role: "user" | "ai"; text: string };

async function postPlan(body: object): Promise<PlanResponse> {
  const res = await fetch("/api/plan", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as PlanResponse;
}

export function PlanChat() {
  const [phase, setPhase] = useState<Phase>("intro");
  const [log, setLog] = useState<LogItem[]>([{ id: 0, role: "ai", text: WELCOME }]);
  const [tasks, setTasks] = useState<UITask[]>([]);
  const [input, setInput] = useState(""); // brain dump (intro) or subdivide answer
  const [addInput, setAddInput] = useState(""); // add-task row
  const [loading, setLoading] = useState(false); // extract in flight
  const [subId, setSubId] = useState<string | null>(null); // task being subdivided
  const [subPending, setSubPending] = useState<PlanQuestion | null>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<(() => void) | null>(null);

  const logCounter = useRef(1);
  const taskCounter = useRef(0);
  const subCounter = useRef(0);
  const genRef = useRef(0); // bumped on reset — invalidates in-flight responses
  const subReqRef = useRef(0); // per-subdivide-request token; guards stale/cancelled responses
  const braindumpRef = useRef("");
  const subAnswersRef = useRef<QA[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log, tasks, loading, subLoading, subPending, error]);

  const appendAi = (text: string) => {
    if (!text?.trim()) return;
    setLog((prev) => [...prev, { id: logCounter.current++, role: "ai", text }]);
  };
  const appendUser = (text: string) =>
    setLog((prev) => [...prev, { id: logCounter.current++, role: "user", text }]);

  const makeUITasks = (core: CoreTask[]): UITask[] =>
    core.map((t) => ({
      id: `t${taskCounter.current++}`,
      title: t.title,
      big: t.big,
      done: false,
      subtasks: [],
      subdivided: false,
      declined: false,
    }));
  const makeSubtasks = (subs: Subtask[]): UISubtask[] =>
    subs.map((s) => ({ id: `s${subCounter.current++}`, title: s.title, done: false }));

  async function runExtract(braindump: string) {
    const gen = genRef.current;
    setLoading(true);
    setError(null);
    setRetry(null);
    try {
      const data = await postPlan({ action: "extract", provider: PROVIDER, braindump });
      if (gen !== genRef.current) return;
      if ("error" in data) {
        setError(data.error);
        setRetry(() => () => runExtract(braindump));
        return;
      }
      const r = data as ExtractResponse;
      appendAi(r.message);
      setTasks(makeUITasks(r.tasks));
      setPhase("plan");
    } catch {
      if (gen !== genRef.current) return;
      setError(NETWORK_ERROR);
      setRetry(() => () => runExtract(braindump));
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }

  async function runSubdivide(taskId: string, answers: QA[]) {
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    const gen = genRef.current;
    const reqId = ++subReqRef.current;
    // Fresh only while this exact request is still the active one (not reset,
    // not cancelled, not superseded by a newer subdivide). Guards loading/apply.
    const fresh = () => gen === genRef.current && reqId === subReqRef.current;
    setSubLoading(true);
    setError(null);
    setRetry(null);
    try {
      const data = await postPlan({
        action: "subdivide",
        provider: PROVIDER,
        braindump: braindumpRef.current,
        task: task.title,
        answers,
      });
      if (!fresh()) return;
      if ("error" in data) {
        setError(data.error);
        setRetry(() => () => runSubdivide(taskId, answers));
        return;
      }
      const sd = data as SubdivideResponse;
      if (sd.status === "need_more") {
        appendAi(sd.message);
        appendAi(sd.question.text);
        setSubPending(sd.question);
      } else {
        appendAi(sd.message);
        const subs = makeSubtasks(sd.subtasks);
        setTasks((prev) =>
          prev.map((t) =>
            t.id === taskId ? { ...t, subtasks: subs, subdivided: true } : t,
          ),
        );
        setSubId(null);
        setSubPending(null);
        subAnswersRef.current = [];
      }
    } catch {
      if (!fresh()) return;
      setError(NETWORK_ERROR);
      setRetry(() => () => runSubdivide(taskId, answers));
    } finally {
      if (fresh()) setSubLoading(false);
    }
  }

  function startSubdivide(taskId: string) {
    if (subId || loading) return;
    setSubId(taskId);
    setSubPending(null);
    subAnswersRef.current = [];
    void runSubdivide(taskId, []);
  }

  function answerSub(answer: string) {
    if (!subId || !subPending || subLoading) return;
    const q = subPending;
    setInput("");
    appendUser(answer);
    setSubPending(null);
    const next = [...subAnswersRef.current, { question: q.text, answer }];
    subAnswersRef.current = next;
    void runSubdivide(subId, next);
  }

  function cancelSubdivide() {
    subReqRef.current++; // invalidate any in-flight subdivide request
    setSubId(null);
    setSubPending(null);
    setSubLoading(false);
    setError(null);
    setRetry(null);
    setInput("");
    subAnswersRef.current = [];
  }

  function handleSend() {
    const text = input.trim();
    if (!text) return;
    if (phase === "intro") {
      if (loading) return;
      setInput("");
      braindumpRef.current = text;
      appendUser(text);
      void runExtract(text);
    } else if (subId && subPending && !subLoading) {
      setInput("");
      answerSub(text);
    }
  }

  function addTask() {
    const title = addInput.trim();
    if (!title || subId || loading) return;
    setTasks((prev) => [
      ...prev,
      {
        id: `t${taskCounter.current++}`,
        title,
        big: false,
        done: false,
        subtasks: [],
        subdivided: false,
        declined: false,
      },
    ]);
    setAddInput("");
  }

  function reset() {
    genRef.current++;
    subReqRef.current++;
    setLog([{ id: logCounter.current++, role: "ai", text: WELCOME }]);
    setTasks([]);
    setInput("");
    setAddInput("");
    setLoading(false);
    setSubId(null);
    setSubPending(null);
    setSubLoading(false);
    setError(null);
    setRetry(null);
    setPhase("intro");
    braindumpRef.current = "";
    subAnswersRef.current = [];
  }

  const locked = subId !== null || loading;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-3">
          {log.map((item) => (
            <Bubble key={item.id} role={item.role}>
              {item.text}
            </Bubble>
          ))}

          {(loading || subLoading) && (
            <div className="flex justify-start">
              <div className="flex items-center gap-1 rounded-[16px] rounded-tl-[5px] bg-sys-bg-gray px-4 py-3">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-[6px] w-[6px] animate-bounce rounded-full bg-sys-label-alt"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
            </div>
          )}

          {phase === "plan" && (
            <div className="flex flex-col gap-2.5 pt-1">
              <div className="flex items-center gap-1.5 text-[12px] font-bold tracking-[0.4px] text-sys-primary-dark">
                <Icon name="sparkles" size={13} strokeWidth={2} />
                오늘의 핵심 할 일
              </div>

              {tasks.map((t) => (
                <TaskItem
                  key={t.id}
                  task={t}
                  active={subId === t.id}
                  disabled={locked}
                  onTitleChange={(id, title) =>
                    setTasks((prev) =>
                      prev.map((x) => (x.id === id ? { ...x, title } : x)),
                    )
                  }
                  onToggleDone={(id) =>
                    setTasks((prev) =>
                      prev.map((x) => (x.id === id ? { ...x, done: !x.done } : x)),
                    )
                  }
                  onToggleSubDone={(taskId, subId2) =>
                    setTasks((prev) =>
                      prev.map((x) =>
                        x.id === taskId
                          ? {
                              ...x,
                              subtasks: x.subtasks.map((s) =>
                                s.id === subId2 ? { ...s, done: !s.done } : s,
                              ),
                            }
                          : x,
                      ),
                    )
                  }
                  onDelete={(id) =>
                    setTasks((prev) => prev.filter((x) => x.id !== id))
                  }
                  onSubdivide={startSubdivide}
                  onDecline={(id) =>
                    setTasks((prev) =>
                      prev.map((x) => (x.id === id ? { ...x, declined: true } : x)),
                    )
                  }
                />
              ))}

              {/* Add task (1.2 자유 편집) */}
              <div className="flex items-center gap-2 rounded-[12px] border border-dashed border-sys-line px-3 py-1.5">
                <Icon name="arrow-right" size={15} className="shrink-0 text-sys-label-alt" />
                <input
                  value={addInput}
                  onChange={(e) => setAddInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing) return;
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addTask();
                    }
                  }}
                  disabled={locked}
                  placeholder="할 일 직접 추가"
                  className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] text-sys-label-strong outline-none placeholder:text-sys-label-alt disabled:opacity-50"
                />
                <button
                  type="button"
                  onClick={addTask}
                  disabled={locked || !addInput.trim()}
                  className="shrink-0 rounded-[9px] px-2.5 py-1.5 text-[13px] font-semibold text-sys-primary-dark disabled:opacity-40"
                >
                  추가
                </button>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-[12px] border border-sys-pri-high/30 bg-sys-pri-high-bg px-[14px] py-2.5 text-[13px] leading-[1.5] text-sys-pri-high">
              {error}
              {retry && (
                <button
                  type="button"
                  onClick={() => {
                    const run = retry;
                    setError(null);
                    setRetry(null);
                    run();
                  }}
                  className="ml-2 font-bold underline"
                >
                  다시 시도
                </button>
              )}
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Bottom bar */}
      {phase === "intro" ? (
        <div className="border-t border-sys-line px-4 py-3">
          <div className="flex items-end gap-2 rounded-[16px] border border-sys-line bg-sys-bg px-3 py-2">
            <textarea
              value={input}
              rows={2}
              onChange={(e) => setInput(e.target.value)}
              disabled={loading}
              placeholder="예: 발표 자료도 만들어야 하고 운동도 가야 하는데 이메일 답장이 밀렸어…"
              className="max-h-40 min-h-[44px] flex-1 resize-none bg-transparent py-1 text-[14.5px] leading-[1.5] text-sys-label-strong outline-none placeholder:text-sys-label-alt disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="정리하기"
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sys-primary-dark text-sys-on-primary disabled:opacity-40"
            >
              <Icon name="arrow-up" size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      ) : subId ? (
        <div className="flex flex-col gap-2 border-t border-sys-line px-4 py-3">
          {subPending && !subLoading && (
            <OptionChips options={subPending.options} onPick={answerSub} disabled={subLoading} />
          )}
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-sys-label-neutral">쪼개는 중…</span>
            <button
              type="button"
              onClick={cancelSubdivide}
              className="text-[12px] font-semibold text-sys-label-neutral hover:text-sys-label-strong"
            >
              그만두기
            </button>
          </div>
          <div className="flex items-end gap-2 rounded-[16px] border border-sys-line bg-sys-bg px-3 py-1.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter") {
                  e.preventDefault();
                  handleSend();
                }
              }}
              disabled={!subPending || subLoading}
              placeholder="직접 답을 적어도 돼요"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[14.5px] text-sys-label-strong outline-none placeholder:text-sys-label-alt disabled:opacity-50"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || !subPending || subLoading}
              aria-label="보내기"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sys-primary-dark text-sys-on-primary disabled:opacity-40"
            >
              <Icon name="arrow-up" size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      ) : (
        <div className="border-t border-sys-line px-5 py-3">
          <button
            type="button"
            onClick={reset}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-sys-line py-[13px] text-[14px] font-semibold text-sys-label-neutral transition-colors hover:border-sys-primary hover:text-sys-primary-dark"
          >
            <Icon name="brain" size={15} strokeWidth={2} />
            다시 브레인덤프하기
          </button>
        </div>
      )}
    </div>
  );
}
