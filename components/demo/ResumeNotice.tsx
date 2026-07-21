"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { isResumable, loadDemoState } from "@/components/demo/state";

/**
 * "이어서 하기" line under the Experience preview card (01 §3.3).
 * Client-only: the saved demo state lives in localStorage, so the decision has
 * to happen after mount; until then (and with nothing saved) renders nothing.
 */
export function ResumeNotice() {
  const [cardCount, setCardCount] = useState(0);

  useEffect(() => {
    const saved = loadDemoState();
    if (saved && isResumable(saved) && saved.cards.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from persistent storage on mount
      setCardCount(saved.cards.length);
    }
  }, []);

  if (cardCount === 0) return null;

  return (
    <Link
      href="/demo"
      className="flex items-center justify-center gap-1.5 rounded-[12px] bg-sys-primary-lighter px-4 py-[11px] text-[13.5px] font-semibold text-sys-primary-dark"
    >
      만들던 오늘 할 일 {cardCount}개가 있어요 — 이어서 하기
    </Link>
  );
}
