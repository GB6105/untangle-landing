"use client";

import { useEffect, useState } from "react";

const SLOW_NOTICE = "조금만 더 걸려요. 그대로 있어 주세요.";
const ROTATE_MS = 2500;
const SLOW_MS = 8000;

/**
 * Shared LLM-wait treatment (02 §3.1, 03 §3.2): rotating microcopy every 2.5s,
 * plus a reassurance line after 8s. A bare spinner/bounce-dots-only indicator
 * is banned — the copy is what keeps an ADHD-leaning user from bailing.
 */
export function WaitingIndicator({ messages }: { messages: string[] }) {
  const [index, setIndex] = useState(0);
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    const rotate = setInterval(
      () => setIndex((i) => (i + 1) % messages.length),
      ROTATE_MS,
    );
    const slowTimer = setTimeout(() => setSlow(true), SLOW_MS);
    return () => {
      clearInterval(rotate);
      clearTimeout(slowTimer);
    };
  }, [messages.length]);

  return (
    <div className="flex justify-start">
      <div className="flex flex-col gap-1 rounded-[16px] rounded-tl-[5px] bg-sys-bg-gray px-[15px] py-[11px]">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="h-[5px] w-[5px] animate-bounce rounded-full bg-sys-label-alt"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
          <span className="text-[13.5px] text-sys-label-neutral">
            {messages[index % messages.length]}
          </span>
        </div>
        {slow && (
          <span className="text-[12px] text-sys-label-alt">{SLOW_NOTICE}</span>
        )}
      </div>
    </div>
  );
}
