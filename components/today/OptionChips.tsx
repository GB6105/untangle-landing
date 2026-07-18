/**
 * Pick-first answer options for a subdivide question (FEATURE.md 1.4).
 * The user can tap an option or type a free answer; both feed the same slot.
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
          className="rounded-[12px] border border-sys-line bg-sys-bg px-4 py-[13px] text-left text-[14.5px] leading-[1.4] text-sys-label-strong transition-colors hover:border-sys-primary hover:bg-sys-primary-lighter disabled:cursor-not-allowed disabled:opacity-50"
        >
          {option}
        </button>
      ))}
    </div>
  );
}
