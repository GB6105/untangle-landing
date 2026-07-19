import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { Logo } from "@/components/Logo";
import { SplitChat } from "@/components/split/SplitChat";

export const metadata: Metadata = {
  title: "쪼개기 — Untangle",
  description:
    "목표만 있는 큰 일을, 몇 가지 질문으로 맥락을 맞춘 뒤 지금 할 수 있는 작은 단계로 쪼개주는 Co-Planner 체험.",
};

/**
 * 쪼개기(Split) 체험 화면 — the `Split Example` frame in DESIGN.pen.
 *
 * A server-component shell (topbar + brand header) hosting the interactive
 * `SplitChat` client component. Uses `min-h-dvh` so the chat column fills the
 * viewport and the input bar pins to the bottom on mobile.
 */
export default function SplitPage() {
  return (
    <div className="flex min-h-dvh justify-center bg-[var(--backdrop)]">
      <main className="flex min-h-dvh w-full max-w-[480px] flex-col bg-sys-bg shadow-[0_0_60px_-20px_rgba(26,26,36,0.15)]">
        <header className="flex items-center justify-between border-b border-sys-line px-5 py-3">
          <div className="flex items-center gap-2.5">
            <Logo size={30} />
            <span className="text-[16px] font-bold tracking-[-0.2px] text-sys-label-strong">
              Co-Planner
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

        <SplitChat />
      </main>
    </div>
  );
}
