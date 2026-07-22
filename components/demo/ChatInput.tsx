"use client";

import { useEffect, useRef } from "react";
import { Icon } from "@/components/Icon";

/**
 * Bottom chat input shared by the braindump and split screens.
 * Keeps the SplitChat conventions: IME-composition-safe Enter, Shift+Enter for
 * newline, text preserved while an error banner is up (05 §4.2 관례).
 */
export function ChatInput({
  value,
  onChange,
  onSend,
  placeholder,
  disabled,
  maxLength,
}: {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  placeholder: string;
  disabled?: boolean;
  maxLength?: number;
}) {
  const areaRef = useRef<HTMLTextAreaElement>(null);

  // rows={1} 고정이면 max-h-28은 닿을 수 없는 제약이라 입력창이 늘 한 줄이다.
  // 2,000자까지 쏟아내는 화면에서 방금 쓴 문장을 되돌아볼 수 없어, 내용에 맞춰
  // 높이를 키우고 max-h-28에 닿은 뒤부터 내부 스크롤로 넘긴다.
  useEffect(() => {
    const area = areaRef.current;
    if (!area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
  }, [value]);

  return (
    <div className="flex items-end gap-2 rounded-[16px] border border-sys-line bg-sys-bg px-3 py-1.5">
      {/* 글자 크기가 16px 미만이면 iOS Safari가 포커스 순간 화면을 자동 확대한다.
          확대된 화면에서 안내 문구를 다시 찾아야 하는 이탈 요인이라 16px로 고정. */}
      <textarea
        ref={areaRef}
        value={value}
        rows={1}
        maxLength={maxLength}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          // Don't submit while a Korean/IME composition is in progress —
          // the Enter that commits the last syllable must not send.
          if (e.nativeEvent.isComposing) return;
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
        placeholder={placeholder}
        className="max-h-28 flex-1 resize-none overflow-y-auto bg-transparent py-1.5 text-[16px] leading-[1.5] text-sys-label-strong outline-none placeholder:text-sys-label-alt"
      />
      <button
        type="button"
        onClick={onSend}
        disabled={!value.trim() || disabled}
        aria-label="보내기"
        className="mb-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-sys-primary-dark text-sys-on-primary transition-opacity disabled:opacity-40"
      >
        <Icon name="arrow-up" size={18} strokeWidth={2.4} />
      </button>
    </div>
  );
}
