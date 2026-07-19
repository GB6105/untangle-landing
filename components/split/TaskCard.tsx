import { Icon } from "@/components/Icon";

/**
 * One decomposed task in the results list (FEATURE.md F3-4/F3-7).
 * The checkbox controls whether it is added to the to-do list on confirm; the
 * optional "쪼개기" button asks the Co-Planner to break this task down further
 * (F3-6).
 */
export function TaskCard({
  title,
  checked,
  onToggle,
  onResplit,
  resplitting,
}: {
  title: string;
  checked: boolean;
  onToggle: () => void;
  onResplit?: () => void;
  resplitting?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-sys-line bg-sys-bg px-[14px] py-[13px]">
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

      <span className="flex-1 text-[14.5px] leading-[1.45] text-sys-label-strong">
        {title}
      </span>

      {onResplit && (
        <button
          type="button"
          onClick={onResplit}
          disabled={resplitting}
          className="flex shrink-0 items-center gap-1 rounded-full bg-sys-bg-gray px-[10px] py-[6px] text-[12px] font-semibold text-sys-label-neutral transition-colors hover:text-sys-primary-dark disabled:opacity-50"
        >
          <Icon name="scissors" size={13} strokeWidth={2} />
          쪼개기
        </button>
      )}
    </div>
  );
}
