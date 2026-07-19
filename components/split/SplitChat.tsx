"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { ChatBubble } from "@/components/split/ChatBubble";
import { OptionChips } from "@/components/split/OptionChips";
import { TaskCard } from "@/components/split/TaskCard";
import type {
  Answer,
  Provider,
  Question,
  SplitRequest,
  SplitResponse,
  Task,
} from "@/components/split/types";

const WELCOME =
  "쪼개고 싶은 큰 일을 하나 알려주세요. 목표만 있어도 괜찮아요. 제가 몇 가지 여쭤보고, 지금 할 수 있는 작은 단계로 나눠드릴게요.";
const TODOS_KEY = "untangle:todos";
const NETWORK_ERROR = "연결에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.";

type Phase = "intro" | "clarify" | "result";
type LogItem = { id: number; role: "user" | "ai"; text: string };
type ResultTask = { id: string; title: string };

async function postSplit(body: SplitRequest): Promise<SplitResponse> {
  const res = await fetch("/api/split", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as SplitResponse;
}

export function SplitChat() {
  // 인라인 체험 카드(DESIGN "Experience" 프레임)에는 모델 선택 UI가 없으므로
  // 공급자는 Claude로 고정한다. (백엔드 /api/split은 두 공급자를 모두 지원한다.)
  const provider: Provider = "claude";
  const [phase, setPhase] = useState<Phase>("intro");
  const [log, setLog] = useState<LogItem[]>([{ id: 0, role: "ai", text: WELCOME }]);
  const [pending, setPending] = useState<Question | null>(null);
  const [tasks, setTasks] = useState<ResultTask[]>([]);
  const [firstStep, setFirstStep] = useState<ResultTask | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [confirmed, setConfirmed] = useState<string[]>([]);
  const [addedNote, setAddedNote] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [resplittingId, setResplittingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [retry, setRetry] = useState<(() => void) | null>(null);

  const logCounter = useRef(1);
  const taskCounter = useRef(0);
  const genRef = useRef(0); // bumped on reset to invalidate in-flight responses
  const goalRef = useRef("");
  const answersRef = useRef<Answer[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);

  // Hydrate the saved to-do list from localStorage after mount. A lazy
  // useState initializer can't do this — it runs during SSR where there is no
  // localStorage, and the server value would win at hydration.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(TODOS_KEY);
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from persistent storage on mount
      if (raw) setConfirmed(JSON.parse(raw) as string[]);
    } catch {
      // ignore storage errors (private mode, etc.)
    }
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [log, pending, loading, tasks, firstStep, addedNote, error]);

  const appendAi = (text: string) => {
    if (!text?.trim()) return;
    setLog((prev) => [...prev, { id: logCounter.current++, role: "ai", text }]);
  };
  const appendUser = (text: string) =>
    setLog((prev) => [...prev, { id: logCounter.current++, role: "user", text }]);

  const makeTasks = (list: Task[]): ResultTask[] =>
    list.slice(0, 5).map((t) => ({ id: `t${taskCounter.current++}`, title: t.title }));
  const makeStep = (step: Task): ResultTask => ({ id: "first", title: step.title });

  const showResult = (taskList: Task[], step: Task) => {
    const rt = makeTasks(taskList);
    const fs = makeStep(step);
    setTasks(rt);
    setFirstStep(fs);
    const next: Record<string, boolean> = { [fs.id]: true };
    rt.forEach((t) => (next[t.id] = true));
    setChecked(next);
    setAddedNote(null);
    setPhase("result");
  };

  async function runAdvance(goal: string, answers: Answer[]) {
    const gen = genRef.current;
    setLoading(true);
    setError(null);
    setRetry(null);
    try {
      const data = await postSplit({ action: "advance", provider, goal, answers });
      if (gen !== genRef.current) return; // a reset happened while we waited
      if ("error" in data) {
        setError(data.error);
        setRetry(() => () => runAdvance(goal, answers));
        return;
      }
      if (data.status === "need_more") {
        appendAi(data.message);
        appendAi(data.question.text);
        setPending(data.question);
      } else if (data.status === "ready") {
        appendAi(data.message);
        showResult(data.tasks, data.firstStep);
      }
    } catch {
      if (gen !== genRef.current) return;
      setError(NETWORK_ERROR);
      setRetry(() => () => runAdvance(goal, answers));
    } finally {
      if (gen === genRef.current) setLoading(false);
    }
  }

  function answerPending(answer: string) {
    if (!pending || loading) return;
    const q = pending;
    appendUser(answer);
    setPending(null);
    const next = [...answersRef.current, { key: q.key, question: q.text, answer }];
    answersRef.current = next;
    void runAdvance(goalRef.current, next);
  }

  function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    if (phase === "intro") {
      setInput("");
      goalRef.current = text;
      answersRef.current = [];
      appendUser(text);
      setPhase("clarify");
      void runAdvance(text, []);
    } else if (phase === "clarify" && pending) {
      setInput("");
      answerPending(text);
    }
    // Otherwise keep the text: nothing to dispatch (e.g. an error is pending —
    // the "다시 시도" button is the recovery path).
  }

  async function runResplit(task: ResultTask) {
    if (resplittingId) return;
    const gen = genRef.current;
    setResplittingId(task.id);
    setError(null);
    setRetry(null);
    const remaining = tasks.filter((t) => t.id !== task.id);
    try {
      const data = await postSplit({
        action: "resplit",
        provider,
        goal: goalRef.current,
        answers: answersRef.current,
        taskToSplit: task.title,
        otherTasks: remaining.map((t) => t.title),
      });
      if (gen !== genRef.current) return;
      if ("error" in data) {
        setError(data.error);
        setRetry(() => () => runResplit(task));
        return;
      }
      if (data.status !== "resplit") return;
      appendAi(data.message);
      const subs = makeTasks(data.tasks);
      const fs = makeStep(data.firstStep);
      // F3-6: new sub-tasks + the remaining tasks (minus the one we split).
      setTasks([...subs, ...remaining]);
      setFirstStep(fs);
      setChecked((prev) => {
        const next: Record<string, boolean> = { ...prev, [fs.id]: true };
        delete next[task.id];
        subs.forEach((s) => (next[s.id] = true));
        return next;
      });
    } catch {
      if (gen !== genRef.current) return;
      setError(NETWORK_ERROR);
      setRetry(() => () => runResplit(task));
    } finally {
      if (gen === genRef.current) setResplittingId(null);
    }
  }

  function confirmAdd() {
    const picked: string[] = [];
    if (firstStep && checked[firstStep.id]) picked.push(firstStep.title);
    tasks.forEach((t) => {
      if (checked[t.id]) picked.push(t.title);
    });
    if (picked.length === 0) return;
    const next = Array.from(new Set([...confirmed, ...picked]));
    const added = next.length - confirmed.length;
    setConfirmed(next);
    try {
      localStorage.setItem(TODOS_KEY, JSON.stringify(next));
    } catch {
      // ignore storage errors
    }
    // Uncheck after adding so a second press can't re-report phantom adds.
    setChecked({});
    setAddedNote(
      added > 0 ? `${added}개를 할 일 목록에 추가했어요.` : "이미 할 일 목록에 있어요.",
    );
  }

  function reset() {
    genRef.current++; // invalidate any in-flight advance/resplit response
    setLog([{ id: logCounter.current++, role: "ai", text: WELCOME }]);
    setPending(null);
    setTasks([]);
    setFirstStep(null);
    setChecked({});
    setAddedNote(null);
    setError(null);
    setRetry(null);
    setResplittingId(null);
    setLoading(false);
    setInput("");
    setPhase("intro");
    goalRef.current = "";
    answersRef.current = [];
  }

  const selectedCount =
    (firstStep && checked[firstStep.id] ? 1 : 0) +
    tasks.filter((t) => checked[t.id]).length;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-3">
          {log.map((item) => (
            <ChatBubble key={item.id} role={item.role}>
              {item.text}
            </ChatBubble>
          ))}

          {pending && !loading && (
            <div className="pt-0.5">
              <OptionChips
                options={pending.options}
                onPick={answerPending}
                disabled={loading}
              />
            </div>
          )}

          {loading && (
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

          {phase === "result" && firstStep && (
            <div className="flex flex-col gap-[9px] pt-1">
              {/* First step now (F3-5) */}
              <div className="rounded-[14px] bg-sys-primary-lighter px-[14px] py-[13px]">
                <div className="mb-2 flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.4px] text-sys-primary-dark">
                  <Icon name="sparkles" size={13} strokeWidth={2} />
                  지금 할 첫 단계
                </div>
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={!!checked[firstStep.id]}
                    onToggle={() =>
                      setChecked((p) => ({ ...p, [firstStep.id]: !p[firstStep.id] }))
                    }
                  />
                  <span className="flex-1 text-[14.5px] font-medium leading-[1.45] text-sys-label-strong">
                    {firstStep.title}
                  </span>
                </div>
              </div>

              {/* Decomposed tasks (F3-4) */}
              {tasks.map((t) => (
                <TaskCard
                  key={t.id}
                  title={t.title}
                  checked={!!checked[t.id]}
                  onToggle={() => setChecked((p) => ({ ...p, [t.id]: !p[t.id] }))}
                  onResplit={() => runResplit(t)}
                  resplitting={resplittingId === t.id}
                />
              ))}

              {/* Confirm bar (F3-7) */}
              <div className="flex items-center gap-3 pt-1">
                <span className="text-[13px] text-sys-label-neutral">
                  {selectedCount}개 선택됨
                </span>
                <button
                  type="button"
                  onClick={confirmAdd}
                  disabled={selectedCount === 0}
                  className="ml-auto rounded-[12px] bg-sys-primary-dark px-5 py-[11px] text-[14px] font-bold text-sys-on-primary transition-shadow hover:shadow-[0_9px_24px_-6px_rgba(106,69,231,0.5)] disabled:opacity-40 disabled:hover:shadow-none"
                >
                  할 일 목록에 추가
                </button>
              </div>

              {addedNote && (
                <div className="rounded-[12px] bg-sys-bg-gray px-[14px] py-2.5 text-[13px] text-sys-label-neutral">
                  {addedNote}
                </div>
              )}
            </div>
          )}

          {confirmed.length > 0 && (
            <div className="mt-1 rounded-[14px] border border-sys-line bg-sys-bg-gray px-[14px] py-3">
              <div className="mb-2 text-[12px] font-bold text-sys-label-neutral">
                내 할 일 ({confirmed.length})
              </div>
              <ul className="flex flex-col gap-1.5">
                {confirmed.map((t, i) => (
                  <li
                    key={`${i}-${t}`}
                    className="flex items-start gap-2 text-[14px] leading-[1.45] text-sys-label-normal"
                  >
                    <span className="mt-[7px] h-[5px] w-[5px] shrink-0 rounded-full bg-sys-primary" />
                    {t}
                  </li>
                ))}
              </ul>
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

      {phase === "result" ? (
        <div className="border-t border-sys-line px-5 py-3">
          <button
            type="button"
            onClick={reset}
            disabled={!!resplittingId}
            className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-sys-line py-[13px] text-[14px] font-semibold text-sys-label-neutral transition-colors hover:border-sys-primary hover:text-sys-primary-dark disabled:opacity-50"
          >
            <Icon name="scissors" size={15} strokeWidth={2} />
            새로운 일 쪼개기
          </button>
        </div>
      ) : (
        <div className="border-t border-sys-line px-4 py-3">
          <div className="flex items-end gap-2 rounded-[16px] border border-sys-line bg-sys-bg px-3 py-1.5">
            <textarea
              value={input}
              rows={1}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                // Don't submit while a Korean/IME composition is in progress —
                // the Enter that commits the last syllable must not send.
                if (e.nativeEvent.isComposing) return;
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder={
                phase === "intro"
                  ? "예: 포트폴리오 사이트 만들기"
                  : "직접 답을 적어도 돼요"
              }
              className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-[14.5px] leading-[1.5] text-sys-label-strong outline-none placeholder:text-sys-label-alt"
            />
            <button
              type="button"
              onClick={handleSend}
              disabled={!input.trim() || loading}
              aria-label="보내기"
              className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sys-primary-dark text-sys-on-primary transition-opacity disabled:opacity-40"
            >
              <Icon name="arrow-up" size={18} strokeWidth={2.4} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Checkbox({
  checked,
  onToggle,
}: {
  checked: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      role="checkbox"
      aria-checked={checked}
      className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] transition-colors ${
        checked
          ? "border-sys-primary bg-sys-primary text-sys-on-primary"
          : "border-sys-label-alt bg-sys-bg text-transparent"
      }`}
    >
      <Icon name="check" size={14} strokeWidth={2.5} />
    </button>
  );
}
