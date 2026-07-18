import { Icon } from "@/components/Icon";
import type { UITask } from "@/components/today/types";

/**
 * One core task card (FEATURE.md 1.2–1.4): editable title, done toggle, delete,
 * a proactive subdivide proposal for big tasks (1.3), a manual 쪼개기 affordance
 * for any task, and nested ordered subtasks once decomposed (1.4).
 */
export function TaskItem({
  task,
  active,
  disabled,
  onTitleChange,
  onToggleDone,
  onToggleSubDone,
  onDelete,
  onSubdivide,
  onDecline,
}: {
  task: UITask;
  active: boolean;
  disabled: boolean;
  onTitleChange: (id: string, title: string) => void;
  onToggleDone: (id: string) => void;
  onToggleSubDone: (taskId: string, subId: string) => void;
  onDelete: (id: string) => void;
  onSubdivide: (id: string) => void;
  onDecline: (id: string) => void;
}) {
  const hasSubs = task.subtasks.length > 0;
  const showActions = !active && !hasSubs;

  return (
    <div className="rounded-[14px] border border-sys-line bg-sys-bg px-[14px] py-3">
      {/* Header row: done + title + delete */}
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => onToggleDone(task.id)}
          role="checkbox"
          aria-checked={task.done}
          aria-label="완료 표시"
          className={`flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-[7px] border-[1.5px] transition-colors ${
            task.done
              ? "border-sys-primary bg-sys-primary text-sys-on-primary"
              : "border-sys-label-alt bg-sys-bg text-transparent"
          }`}
        >
          <Icon name="check" size={14} strokeWidth={2.5} />
        </button>

        <input
          value={task.title}
          onChange={(e) => onTitleChange(task.id, e.target.value)}
          disabled={disabled}
          aria-label="할 일 제목"
          className={`min-w-0 flex-1 bg-transparent text-[15px] font-medium leading-[1.4] outline-none ${
            task.done ? "text-sys-label-alt line-through" : "text-sys-label-strong"
          }`}
        />

        {task.big && !hasSubs && (
          <span className="shrink-0 rounded-full bg-sys-pri-mid-bg px-2 py-0.5 text-[11px] font-bold text-sys-pri-mid">
            큰 일
          </span>
        )}

        <button
          type="button"
          onClick={() => onDelete(task.id)}
          disabled={disabled}
          aria-label="삭제"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sys-label-alt transition-colors hover:bg-sys-bg-gray hover:text-sys-label-neutral disabled:opacity-50"
        >
          <Icon name="x" size={16} />
        </button>
      </div>

      {/* Subtasks (1.4) — ordered */}
      {hasSubs && (
        <ol className="mt-2.5 flex flex-col gap-1.5 border-t border-sys-line pt-2.5">
          {task.subtasks.map((s, i) => (
            <li key={s.id} className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => onToggleSubDone(task.id, s.id)}
                role="checkbox"
                aria-checked={s.done}
                aria-label="완료 표시"
                className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[6px] border-[1.5px] transition-colors ${
                  s.done
                    ? "border-sys-primary bg-sys-primary text-sys-on-primary"
                    : "border-sys-label-alt bg-sys-bg text-transparent"
                }`}
              >
                <Icon name="check" size={11} strokeWidth={2.5} />
              </button>
              <span className="shrink-0 text-[12px] font-bold text-sys-primary-dark">
                {i + 1}
              </span>
              <span
                className={`text-[14px] leading-[1.45] ${
                  s.done ? "text-sys-label-alt line-through" : "text-sys-label-normal"
                }`}
              >
                {s.title}
              </span>
            </li>
          ))}
        </ol>
      )}

      {/* Active subdivide indicator */}
      {active && (
        <div className="mt-2 flex items-center gap-1.5 text-[12.5px] text-sys-primary-dark">
          <Icon name="scissors" size={13} strokeWidth={2} />
          쪼개는 중…
        </div>
      )}

      {/* Subdivide affordance (1.3) */}
      {showActions &&
        (task.big && !task.declined ? (
          <div className="mt-2.5 flex flex-col gap-2 rounded-[12px] bg-sys-primary-lighter px-3 py-2.5">
            <p className="text-[13px] leading-[1.5] text-sys-primary-dark">
              이 일, 어떻게 끝낼지 막막하지 않아요? 같이 작은 단계로 쪼개볼까요?
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => onSubdivide(task.id)}
                disabled={disabled}
                className="flex items-center gap-1.5 rounded-[10px] bg-sys-primary-dark px-3 py-2 text-[13px] font-bold text-sys-on-primary disabled:opacity-50"
              >
                <Icon name="scissors" size={14} strokeWidth={2.2} />
                같이 쪼개기
              </button>
              <button
                type="button"
                onClick={() => onDecline(task.id)}
                disabled={disabled}
                className="rounded-[10px] px-3 py-2 text-[13px] font-semibold text-sys-label-neutral disabled:opacity-50"
              >
                괜찮아요
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onSubdivide(task.id)}
            disabled={disabled}
            className="mt-2 flex items-center gap-1.5 text-[12.5px] font-semibold text-sys-label-neutral transition-colors hover:text-sys-primary-dark disabled:opacity-50"
          >
            <Icon name="scissors" size={13} strokeWidth={2} />
            쪼개기
          </button>
        ))}
    </div>
  );
}
