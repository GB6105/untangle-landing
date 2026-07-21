"use client";

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
  return (
    <div className="flex items-end gap-2 rounded-[16px] border border-sys-line bg-sys-bg px-3 py-1.5">
      <textarea
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
        className="max-h-28 flex-1 resize-none bg-transparent py-1.5 text-[14.5px] leading-[1.5] text-sys-label-strong outline-none placeholder:text-sys-label-alt"
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
