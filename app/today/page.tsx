import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { PlanChat } from "@/components/today/PlanChat";

export const metadata: Metadata = {
  title: "오늘의 계획 — Untangle",
  description:
    "떠오르는 대로 적으면 AI가 오늘 집중할 핵심 할 일 3가지를 골라주고, 막막한 일은 작은 단계로 쪼개주는 Co-Planner.",
};

/**
 * "오늘의 계획"(daily top-3) 화면 — FEATURE.md §1.
 *
 * 서버 컴포넌트 셸(브랜드 헤더) + 대화형 클라이언트(PlanChat). 모바일에서 입력
 * 바가 하단에 고정되도록 min-h-dvh로 뷰포트를 채운다.
 */
export default function TodayPage() {
  return (
    <div className="flex min-h-dvh justify-center bg-[var(--backdrop)]">
      <main className="flex min-h-dvh w-full max-w-[480px] flex-col bg-sys-bg shadow-[0_0_60px_-20px_rgba(26,26,36,0.15)]">
        <header className="flex items-center justify-between border-b border-sys-line px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[16px] font-bold tracking-[-0.2px] text-sys-label-strong">
              오늘의 계획
            </span>
          </div>
          <Link
            href="/"
            aria-label="닫기"
            className="flex h-9 w-9 items-center justify-center text-sys-label-neutral transition-colors hover:text-sys-label-strong"
          >
            <Icon name="x" size={22} />
          </Link>
        </header>

        <PlanChat />
      </main>
    </div>
  );
}
