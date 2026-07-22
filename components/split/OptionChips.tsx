/**
 * Pick-first answer options for a clarify question (FEATURE.md F3-2).
 * The user can tap an option or type a free-text answer in the input bar; both
 * feed the same answer slot, so these are a shortcut, not the only path.
 *
 * 눌러야 하는 표면이므로 배경(흰색)과 확실히 분리한다 — 옅은 회색 채움과 진한
 * 선을 함께 쓴다. sys-line만으로는 흰 배경 위에서 거의 보이지 않는다.
 */
export function OptionChips({
  options,
  onPick,
  disabled,
}: {
  options: string[];
  onPick: (option: string) => void;
  disabled?: boolean;
}) {
  if (options.length === 0) return null;
  return (
    <div className="flex flex-col gap-[7px]">
      {options.map((option) => (
        <button
          key={option}
          type="button"
          disabled={disabled}
          onClick={() => onPick(option)}
          className="rounded-[12px] border border-sys-line-strong bg-sys-bg-gray px-4 py-[13px] text-left text-[14.5px] leading-[1.4] text-sys-label-strong transition-colors hover:border-sys-primary hover:bg-sys-primary-lighter disabled:cursor-not-allowed disabled:opacity-50"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
