import { CtaButton } from "@/components/CtaButton";
import { Icon } from "@/components/Icon";

export function Experience() {
  return (
    <section className="flex flex-col gap-[22px] bg-sys-bg-violet px-5 pt-[52px] pb-14">
      <ChatWindow />
      <CtaButton />
    </section>
  );
}

/**
 * Static preview of the Co-Planner chat. Intentionally non-interactive —
 * it shows the product surface without wiring up any real behavior.
 */
function ChatWindow() {
  return (
    <div className="flex h-[524px] flex-col overflow-hidden rounded-3xl border border-sys-line bg-sys-bg shadow-[0_10px_30px_-6px_rgba(26,26,36,0.09)]">
      {/* Header */}
      <div className="flex items-center gap-2.5 border-b border-sys-line px-4 py-[14px]">
        <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-sys-primary text-white">
          <Icon name="sparkles" size={18} />
        </div>
        <div className="flex flex-col gap-[3px]">
          <span className="text-[15px] font-bold text-sys-label-strong">
            Co-Planner
          </span>
          <span className="flex items-center gap-[5px]">
            <span className="h-[6px] w-[6px] rounded-full bg-[#22c55e]" />
            <span className="text-[11.5px] text-sys-label-neutral">온라인</span>
          </span>
        </div>
      </div>

      {/* Mode switch */}
      <div className="px-4 pt-3 pb-[2px]">
        <div className="flex gap-1 rounded-xl bg-sys-bg-gray p-1">
          <div className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-[9px] bg-white shadow-[0_2px_6px_-1px_rgba(26,26,36,0.08)]">
            <Icon name="brain" size={15} className="text-sys-primary-dark" />
            <span className="text-[13.5px] font-bold text-sys-primary-dark">
              브레인덤프
            </span>
          </div>
          <div className="flex h-[38px] flex-1 items-center justify-center gap-1.5 rounded-[9px]">
            <Icon name="scissors" size={15} className="text-sys-label-neutral" />
            <span className="text-[13.5px] font-semibold text-sys-label-neutral">
              쪼개기
            </span>
          </div>
        </div>
      </div>

      {/* Conversation */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="flex items-start gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-sys-primary text-white">
            <Icon name="sparkles" size={13} />
          </div>
          <div className="max-w-[240px] whitespace-pre-line rounded-[14px] rounded-tl-[4px] bg-sys-bg-gray px-[14px] py-[11px] text-[13.5px] leading-[1.5] text-sys-label-strong">
            {"안녕하세요, Co-Planner예요.\n무엇을 도와드릴까요?"}
          </div>
        </div>
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2.5 border-t border-sys-line px-4 pt-3 pb-4">
        <div className="flex h-[46px] flex-1 items-center rounded-[14px] bg-sys-bg-gray px-4">
          <span className="text-[14px] text-sys-label-alt">
            머릿속에 있는 걸 자유롭게 적어보세요
          </span>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-sys-primary text-white">
          <Icon name="arrow-up" size={20} />
        </div>
      </div>
    </div>
  );
}
