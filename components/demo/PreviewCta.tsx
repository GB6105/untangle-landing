"use client";

import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { isResumable, loadDemoState } from "@/components/demo/state";

/**
 * Bottom CTA of the Experience preview card (01 §3.3). 만들다 만 데모가 있으면
 * "직접 해보기" 문구를 "이어서 하기"로 교체한다 — 별도 요소 추가가 아니라 교체.
 * Client-only: the saved demo state lives in localStorage, so the decision has
 * to happen after mount; until then it renders the default label (SSR과 일치).
 * 시각 요소일 뿐 앵커가 아니다 — 카드 전체가 /demo 링크다(중첩 앵커 금지).
 */
export function PreviewCta() {
  const [cardCount, setCardCount] = useState(0);

  useEffect(() => {
    const saved = loadDemoState();
    if (saved && isResumable(saved) && saved.cards.length > 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- syncing from persistent storage on mount
      setCardCount(saved.cards.length);
    }
  }, []);

  return (
    <span className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-sys-primary-dark py-[13px] text-[14.5px] font-bold text-sys-on-primary">
      {cardCount > 0
        ? `만들던 오늘 할 일 ${cardCount}개가 있어요 — 이어서 하기`
        : "직접 해보기"}
      <Icon name="arrow-right" size={16} strokeWidth={2.2} />
    </span>
  );
}
