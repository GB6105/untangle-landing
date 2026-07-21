"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/Icon";
import { ChatInput } from "@/components/demo/ChatInput";
import { WaitingIndicator } from "@/components/demo/WaitingIndicator";
import type { DemoCard } from "@/components/demo/types";
import { ChatBubble } from "@/components/split/ChatBubble";
import { OptionChips } from "@/components/split/OptionChips";
import type { Answer, Task } from "@/components/split/types";
import { SKIP_ANSWER, useSplitFlow } from "@/components/split/useSplitFlow";

/**
 * Split phase screens (docs/features/03-demo-split.md).
 *
 * `splittingCardId === null` → pick-a-card screen (§3.1): one question, the
 * confirmed cards as chips + a skip chip, and a "가장 막막해 보여요" nudge when
 * a big card exists — never auto-selected (원칙 3).
 * Otherwise → DemoSplitPanel keyed by card id so switching cards remounts the
 * flow. Clarify/result are driven by useSplitFlow; the result's include pills
 * deliberately look nothing like Today's done checkboxes (§3.2 — "내 선택이
 * 날아갔다" 오독 방지).
 */

const PICK_QUESTION =
  "이 중 가장 막막한 일이 있나요? 하나만 골라주시면 같이 쪼개볼게요.";
const SKIP_CHIP = "괜찮아요, 바로 시작할게요";
const LEAVE_LABEL = "지금은 넘어가기";
const CONFIRM_LABEL = "이 계획으로 시작";
const OVER_CAP_NOTICE = "오늘 카드에는 5개까지만 담을 수 있어요";
const ANSWER_PLACEHOLDER = "직접 답을 적어도 돼요";
const WAIT_MESSAGES = [
  "이 일을 찬찬히 살펴보는 중…",
  "작은 단계로 나누는 중…",
  "거의 다 됐어요",
];

export function SplitPhase({
  braindump,
  cards,
  splittingCardId,
  onPick,
  onSkip,
  onLeave,
  onConfirm,
}: {
  /** 쪼개기 advance의 context로 항상 전달 (03 §4 필수 확장). */
  braindump: string;
  cards: DemoCard[];
  /** null = 쪼갤 카드 고르기 화면. */
  splittingCardId: string | null;
  onPick: (cardId: string) => void;
  onSkip: () => void;
  /** 패널의 "지금은 넘어가기" — 확정 없이 Today로. */
  onLeave: () => void;
  onConfirm: (cardId: string, tasks: Task[], firstStep: Task, answers: Answer[]) => void;
}) {
  const card = splittingCardId
    ? (cards.find((c) => c.id === splittingCardId) ?? null)
    : null;

  if (!card) {
    return <SplitPicker cards={cards} onPick={onPick} onSkip={onSkip} />;
  }

  return (
    <DemoSplitPanel
      key={card.id}
      braindump={braindump}
      card={card}
      onLeave={onLeave}
      onConfirm={(result) =>
        onConfirm(card.id, result.tasks, result.firstStep, result.answers)
      }
    />
  );
}

/** 쪼갤 카드 고르기 (03 §3.1) — big 카드는 추천 문구로만 민다, 자동 선택 금지. */
function SplitPicker({
  cards,
  onPick,
  onSkip,
}: {
  cards: DemoCard[];
  onPick: (cardId: string) => void;
  onSkip: () => void;
}) {
  const big = cards.find((c) => c.big);

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-3">
          <ChatBubble role="ai">{PICK_QUESTION}</ChatBubble>
          {big && (
            <ChatBubble role="ai">
              <span className="font-semibold">{big.title}</span>
              이(가) 가장 막막해 보여요.
            </ChatBubble>
          )}

          <div className="flex flex-col gap-[7px] pt-0.5">
            {cards.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => onPick(c.id)}
                className="flex items-center gap-2 rounded-[12px] border border-sys-line bg-sys-bg px-4 py-[13px] text-left text-[14.5px] leading-[1.4] text-sys-label-strong transition-colors hover:border-sys-primary hover:bg-sys-primary-lighter"
              >
                <span className="min-w-0 flex-1">{c.title}</span>
                {/* 이미 쪼갠 카드는 저장된 계획을 다시 여는 동선 (03 §3.3) */}
                {c.subtasks.length > 0 && (
                  <span className="shrink-0 rounded-full bg-sys-primary-lighter px-2 py-[2px] text-[11px] font-semibold text-sys-primary-dark">
                    다시 열기
                  </span>
                )}
              </button>
            ))}
            <button
              type="button"
              onClick={onSkip}
              className="rounded-[12px] border border-sys-line bg-sys-bg px-4 py-[13px] text-left text-[14.5px] leading-[1.4] text-sys-label-neutral transition-colors hover:border-sys-primary hover:bg-sys-primary-lighter"
            >
              {SKIP_CHIP}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/** clarify → result 쪼개기 패널 (03 §3.2) — 카드 전환 시 key로 리마운트된다. */
function DemoSplitPanel({
  braindump,
  card,
  onLeave,
  onConfirm,
}: {
  braindump: string;
  card: DemoCard;
  onLeave: () => void;
  onConfirm: (result: { tasks: Task[]; firstStep: Task; answers: Answer[] }) => void;
}) {
  const flow = useSplitFlow({
    goal: card.title,
    initialAnswers: card.splitAnswers,
    // 쪼갠 카드 재진입: 저장된 계획으로 result를 재구성, advance는 안 돈다 (03 §3.3).
    initialResult:
      card.subtasks.length > 0
        ? {
            tasks: card.subtasks.map((s) => ({ title: s.title, done: s.done })),
            firstStep: { title: card.firstStep!.title },
          }
        : null,
    context: braindump,
    onConfirm,
  });
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  const waiting = flow.loading || flow.resplittingId !== null;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [flow.log, flow.pending, flow.loading, flow.resplittingId, flow.phase, flow.error]);

  const sendAnswer = () => {
    const text = input.trim();
    if (!text || !flow.pending || flow.loading) return;
    setInput("");
    flow.answerPending(text);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      {/* 어떤 카드를 쪼개는 중인지 잃지 않게 (원칙 4) */}
      <div className="flex items-center gap-1.5 border-b border-sys-line px-5 py-[9px]">
        <Icon
          name="scissors"
          size={13}
          strokeWidth={2}
          className="shrink-0 text-sys-primary-dark"
        />
        <span className="truncate text-[12.5px] font-semibold text-sys-label-neutral">
          {card.title}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="flex flex-col gap-3">
          {flow.log.map((item) => (
            <ChatBubble key={item.id} role={item.role}>
              {item.text}
            </ChatBubble>
          ))}

          {/* 매 질문에 스킵 칩 상시 노출 (03 §3.2) */}
          {flow.pending && !flow.loading && (
            <div className="pt-0.5">
              <OptionChips
                options={[...flow.pending.options, SKIP_ANSWER]}
                onPick={flow.answerPending}
                disabled={flow.loading}
              />
            </div>
          )}

          {flow.phase === "result" && flow.firstStep && (
            <div className="flex flex-col gap-[9px] pt-1">
              {/* 지금 할 첫 단계 — 체크박스 없음, 항상 카드에 붙는다 (03 §3.2) */}
              <div className="rounded-[14px] bg-sys-primary-lighter px-[14px] py-[13px]">
                <div className="mb-1.5 flex items-center gap-1.5 text-[11.5px] font-bold tracking-[0.4px] text-sys-primary-dark">
                  <Icon name="sparkles" size={13} strokeWidth={2} />
                  지금 할 첫 단계
                </div>
                <span className="text-[14.5px] font-medium leading-[1.45] text-sys-label-strong">
                  {flow.firstStep.title}
                </span>
              </div>

              {flow.tasks.map((task) => {
                const included = !!flow.selected[task.id];
                const resplitting = flow.resplittingId === task.id;
                return (
                  <div
                    key={task.id}
                    className={`flex items-center gap-2.5 rounded-[14px] border bg-sys-bg px-[14px] py-[11px] transition-colors ${
                      included ? "border-sys-primary-light" : "border-sys-line"
                    }`}
                  >
                    {/* 담기 토글 — Today의 완료 체크박스와 다른 형태 (03 §3.2) */}
                    <button
                      type="button"
                      onClick={() => flow.toggleSelected(task.id)}
                      aria-pressed={included}
                      aria-label={`계획에 담기: ${task.title}`}
                      className={`flex shrink-0 items-center gap-1 rounded-full border px-2.5 py-[5px] text-[11.5px] transition-colors ${
                        included
                          ? "border-sys-primary-dark bg-sys-primary-dark font-bold text-sys-on-primary"
                          : "border-sys-line bg-sys-bg font-semibold text-sys-label-neutral"
                      }`}
                    >
                      {included && <Icon name="check" size={11} strokeWidth={3} />}
                      {included ? "담김" : "담기"}
                    </button>

                    <span
                      className={`min-w-0 flex-1 text-[14px] leading-[1.45] ${
                        task.done
                          ? "text-sys-label-alt line-through"
                          : "text-sys-label-strong"
                      }`}
                    >
                      {task.title}
                    </span>

                    <button
                      type="button"
                      onClick={() => flow.runResplit(task)}
                      disabled={task.done || waiting}
                      className={`flex shrink-0 items-center gap-1 text-[12px] font-semibold transition-colors disabled:opacity-40 ${
                        resplitting
                          ? "text-sys-primary-dark"
                          : "text-sys-label-neutral hover:text-sys-primary-dark"
                      }`}
                    >
                      <Icon name="scissors" size={13} strokeWidth={2} />
                      {resplitting ? "쪼개는 중…" : "더 잘게"}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* 공통 대기 연출 — advance·resplit 모두 (03 §3.2, 05 §4.2) */}
          {waiting && <WaitingIndicator messages={WAIT_MESSAGES} />}

          {flow.error && (
            <div className="rounded-[12px] border border-sys-pri-high/30 bg-sys-pri-high-bg px-[14px] py-2.5 text-[13px] leading-[1.5] text-sys-pri-high">
              {flow.error}
              {flow.canRetry && (
                <button
                  type="button"
                  onClick={flow.retryNow}
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

      {flow.phase === "result" ? (
        <div className="flex flex-col gap-2 border-t border-sys-line px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 px-1">
            <span className="text-[12.5px] font-semibold text-sys-label-neutral">
              {flow.selectedCount}개 선택됨
            </span>
            {flow.overCap && (
              <span className="text-[12px] font-semibold text-sys-pri-high">
                {OVER_CAP_NOTICE}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={flow.confirm}
            disabled={flow.selectedCount === 0 || flow.overCap || waiting}
            className="w-full rounded-[12px] bg-sys-primary-dark py-[13px] text-[14.5px] font-bold text-sys-on-primary transition-opacity disabled:opacity-40"
          >
            {CONFIRM_LABEL}
          </button>
          <LeaveButton onLeave={onLeave} disabled={waiting} />
        </div>
      ) : (
        <div className="flex flex-col gap-1.5 border-t border-sys-line px-4 py-3">
          <ChatInput
            value={input}
            onChange={setInput}
            onSend={sendAnswer}
            placeholder={ANSWER_PLACEHOLDER}
            disabled={!flow.pending || flow.loading}
          />
          <LeaveButton onLeave={onLeave} disabled={waiting} />
        </div>
      )}
    </div>
  );
}

/** 하단 보조 동선 — 확정 없이 Today로 (03 §5 "확정 or 뒤로"). */
function LeaveButton({
  onLeave,
  disabled,
}: {
  onLeave: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onLeave}
      disabled={disabled}
      className="self-center px-2 py-1 text-[12.5px] font-semibold text-sys-label-neutral transition-colors hover:text-sys-label-strong disabled:opacity-50"
    >
      {LEAVE_LABEL}
    </button>
  );
}
