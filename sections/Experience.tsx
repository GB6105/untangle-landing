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

const PREVIEW_TASKS = [
  { title: "팀 발표 자료 초안 작성", big: true },
  { title: "헬스장 가서 30분 운동", big: false },
  { title: "중요한 이메일 3개 답장", big: false },
];

/**
 * Static preview of the Co-Planner "오늘의 계획" flow — intentionally
 * non-interactive. Shows a brain dump turning into today's core 3 tasks (with
 * a "큰 일" flag on the daunting one). Mirrors the Experience frame in DESIGN.pen.
 */
function ChatWindow() {
  return (
    <div className="flex flex-col overflow-hidden rounded-3xl border border-sys-line bg-sys-bg shadow-[0_10px_30px_-6px_rgba(26,26,36,0.09)]">
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

      {/* Conversation */}
      <div className="flex flex-col gap-3 p-4">
        {/* User brain dump */}
        <div className="flex justify-end">
          <div className="max-w-[250px] rounded-[14px] rounded-tr-[4px] bg-sys-primary-dark px-[13px] py-2.5 text-[13.5px] leading-[1.5] text-sys-on-primary">
            발표 자료 만들어야 하고, 운동도 가야 하고, 이메일 답장도 밀렸어…
          </div>
        </div>

        {/* AI reply */}
        <div className="flex items-start gap-2">
          <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-sys-primary text-white">
            <Icon name="sparkles" size={13} />
          </div>
          <div className="rounded-[14px] rounded-tl-[4px] bg-sys-bg-gray px-[13px] py-2.5 text-[13.5px] leading-[1.5] text-sys-label-strong">
            오늘은 이 3가지에 집중해봐요.
          </div>
        </div>

        {/* Today's core 3 */}
        {PREVIEW_TASKS.map((t) => (
          <div
            key={t.title}
            className="flex items-center gap-[9px] rounded-xl border border-sys-line bg-sys-bg px-3 py-[11px]"
          >
            <span className="h-5 w-5 shrink-0 rounded-md border-[1.5px] border-sys-label-alt" />
            <span className="flex-1 text-[13.5px] font-medium text-sys-label-strong">
              {t.title}
            </span>
            {t.big && (
              <span className="shrink-0 rounded-full bg-sys-pri-mid-bg px-[7px] py-0.5 text-[10.5px] font-bold text-sys-pri-mid">
                큰 일
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2.5 border-t border-sys-line px-4 pt-3 pb-4">
        <div className="flex h-[46px] flex-1 items-center rounded-[14px] bg-sys-bg-gray px-4">
          <span className="text-[14px] text-sys-label-alt">
            오늘 떠오르는 일들을 편하게 적어보세요
          </span>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-[14px] bg-sys-primary text-white">
          <Icon name="arrow-up" size={20} />
        </div>
      </div>
    </div>
  );
}
