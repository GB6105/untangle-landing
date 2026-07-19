import { CtaButton } from "@/components/CtaButton";
import { Icon } from "@/components/Icon";
import { SplitChat } from "@/components/split/SplitChat";

/**
 * 체험 섹션 — 랜딩 페이지 안에서 바로 쪼개기(Split)를 체험한다.
 *
 * DESIGN.pen의 "Experience" 프레임처럼 Co-Planner 채팅 카드 안에 실제로 동작하는
 * `SplitChat`을 그대로 얹었다. 예전처럼 별도 `/split` 페이지로 이동하지 않고,
 * 이 카드에서 곧바로 대화하며 일을 쪼갤 수 있다. (쪼개기 전용 — 브레인덤프 없음)
 */
export function Experience() {
  return (
    <section className="flex flex-col gap-[22px] bg-sys-bg-violet px-5 pt-[52px] pb-14">
      <div className="flex h-[524px] flex-col overflow-hidden rounded-3xl border border-sys-line bg-sys-bg shadow-[0_10px_30px_-6px_rgba(26,26,36,0.09)]">
        {/* Header */}
        <div className="flex items-center gap-2.5 border-b border-sys-line px-4 py-[14px]">
          <div className="flex h-[34px] w-[34px] items-center justify-center rounded-[11px] bg-sys-primary text-white">
            <Icon name="sparkles" size={18} />
          </div>
          <div className="flex flex-col gap-[3px]">
            <div className="flex items-center gap-2">
              <span className="text-[15px] font-bold text-sys-label-strong">
                Co-Planner
              </span>
              <span className="rounded-full bg-sys-primary-lighter px-2 py-[2px] text-[11px] font-semibold text-sys-primary-dark">
                쪼개기
              </span>
            </div>
            <span className="flex items-center gap-[5px]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#22c55e]" />
              <span className="text-[11.5px] text-sys-label-neutral">온라인</span>
            </span>
          </div>
        </div>

        <SplitChat />
      </div>

      <CtaButton />
    </section>
  );
}
