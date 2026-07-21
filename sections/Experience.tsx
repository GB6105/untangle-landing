import Link from "next/link";
import { CtaButton } from "@/components/CtaButton";
import { Icon } from "@/components/Icon";
import { ResumeNotice } from "@/components/demo/ResumeNotice";

/**
 * 체험 섹션 — 전체 플로우 데모(/demo)의 진입점 (docs/features/01-demo-shell.md §3.3).
 *
 * 예전의 실동작 인라인 SplitChat 대신, "쏟아내기 → 오늘 할 일 고르기 → 첫 단계
 * 받기" 흐름을 보여주는 정적 스크립트 프리뷰 카드를 둔다. 입력 지점을 데모
 * 하나로 단일화하기 위한 교체다(00-overview.md 결정 2). 카드 전체가 /demo로
 * 이어지는 링크이므로 내부의 모조 입력창·버튼은 시각 요소다(중첩 앵커 금지).
 */
export function Experience() {
  return (
    <section
      id="experience"
      className="flex flex-col gap-[22px] bg-sys-bg-violet px-5 pt-[52px] pb-14"
    >
      <Link
        href="/demo"
        className="flex flex-col overflow-hidden rounded-3xl border border-sys-line bg-sys-bg shadow-[0_10px_30px_-6px_rgba(26,26,36,0.09)] transition-shadow hover:shadow-[0_14px_36px_-6px_rgba(106,69,231,0.18)]"
      >
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
                오늘 정하기
              </span>
            </div>
            <span className="flex items-center gap-[5px]">
              <span className="h-[6px] w-[6px] rounded-full bg-[#22c55e]" />
              <span className="text-[11.5px] text-sys-label-neutral">온라인</span>
            </span>
          </div>
        </div>

        {/* 스크립트 프리뷰 — 쏟아내기 → 고르기 → 첫 단계 (정적 스냅샷) */}
        <div className="flex flex-col gap-3 px-5 py-5">
          <div className="flex justify-end">
            <div className="max-w-[82%] rounded-[16px] rounded-tr-[5px] bg-sys-primary-dark px-[15px] py-[11px] text-[14px] leading-[1.5] text-sys-on-primary">
              과제도 밀렸고 방도 엉망이고… 뭐부터 해야 할지 모르겠어
            </div>
          </div>

          <div className="flex justify-start">
            <div className="max-w-[86%] rounded-[16px] rounded-tl-[5px] bg-sys-bg-gray px-[15px] py-[11px] text-[14px] leading-[1.55] text-sys-label-normal">
              오늘 할 일 후보를 뽑아봤어요. 다 고르지 않아도 돼요 — 1개면
              충분해요.
            </div>
          </div>

          <div className="flex flex-col gap-[7px]">
            <div className="flex items-center gap-2.5 rounded-[12px] border border-sys-primary bg-sys-primary-lighter px-[14px] py-[11px]">
              <span className="flex h-[19px] w-[19px] items-center justify-center rounded-[6px] bg-sys-primary text-sys-on-primary">
                <Icon name="check" size={12} strokeWidth={3} />
              </span>
              <span className="text-[13.5px] font-medium text-sys-label-strong">
                과제 초안 잡기
              </span>
            </div>
            <div className="flex items-center gap-2.5 rounded-[12px] border border-sys-line bg-sys-bg px-[14px] py-[11px]">
              <span className="h-[19px] w-[19px] rounded-[6px] border-[1.5px] border-sys-label-alt" />
              <span className="text-[13.5px] text-sys-label-normal">
                책상 위만 정리하기
              </span>
            </div>
          </div>

          <div className="rounded-[14px] bg-sys-primary-lighter px-[14px] py-[12px]">
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold tracking-[0.4px] text-sys-primary-dark">
              <Icon name="sparkles" size={12} strokeWidth={2} />
              지금 할 첫 단계
            </div>
            <span className="text-[13.5px] font-medium leading-[1.45] text-sys-label-strong">
              과제 파일 열어서 제목만 쓰기
            </span>
          </div>
        </div>

        {/* 모조 입력창 — 탭하면 카드 링크를 따라 곧장 데모의 브레인덤프로 */}
        <div className="border-t border-sys-line px-4 py-3">
          <div className="flex items-center gap-2 rounded-[16px] border border-sys-line bg-sys-bg px-4 py-[11px]">
            <span className="flex-1 text-[14px] text-sys-label-alt">
              요즘 머릿속에 있는 일들을 쏟아내 보세요
            </span>
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sys-primary-dark text-sys-on-primary">
              <Icon name="arrow-up" size={16} strokeWidth={2.4} />
            </span>
          </div>
        </div>

        {/* 카드 하단 진입 버튼(시각 요소 — 카드 전체가 링크) */}
        <div className="px-5 pb-5">
          <span className="flex w-full items-center justify-center gap-2 rounded-[12px] bg-sys-primary-dark py-[13px] text-[14.5px] font-bold text-sys-on-primary">
            직접 해보기
            <Icon name="arrow-right" size={16} strokeWidth={2.2} />
          </span>
        </div>
      </Link>

      <ResumeNotice />

      <CtaButton label="지금 바로 체험해보기" href="/demo" />
    </section>
  );
}
