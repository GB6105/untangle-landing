import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RegisterForm } from "@/app/register/RegisterForm";

export const metadata: Metadata = {
  title: "체험 소감 — Untangle",
  description:
    "방금 체험한 Untangle, 어떠셨어요? 짧은 소감을 들려주시고, 원하시면 출시 알림도 함께 신청하세요.",
};

/**
 * Experience-feedback screen — the `/register` route, repurposed from
 * pre-registration to a post-trial satisfaction survey.
 *
 * Stays a Server Component so it keeps its `metadata` export and server-renders
 * the static shell; the interactive form (rating, conditional reason, submit,
 * success state) is isolated in the `RegisterForm` Client Component. Submitting
 * runs the `submitFeedback` Server Action, which appends a row to the target sheet.
 *
 * The shell uses `min-h-dvh` rather than the landing page's `min-h-full`: this
 * screen is shorter than the viewport, and a percentage min-height collapses
 * against the auto-height body, leaving the backdrop showing under the column.
 */
export default function Register() {
  return (
    <div className="flex min-h-dvh justify-center bg-[var(--backdrop)]">
      <main className="flex w-full max-w-[480px] flex-col bg-sys-bg px-6 pt-3 pb-8 shadow-[0_0_60px_-20px_rgba(26,26,36,0.15)]">
        {/* Topbar */}
        <div className="flex justify-end pb-1">
          <Link
            href="/"
            aria-label="닫기"
            className="flex h-10 w-10 items-center justify-center text-sys-label-neutral"
          >
            <Icon name="x" size={22} />
          </Link>
        </div>

        {/* Form header */}
        <div className="flex flex-col gap-2.5 pt-2">
          <p className="text-[13px] font-semibold tracking-[2px] text-sys-primary-dark">
            체험 소감
          </p>
          <h1 className="text-[30px] font-bold leading-[1.3] tracking-[-0.5px] text-sys-label-strong">
            방금 함께한 첫 걸음, 어땠어요?
          </h1>
          <p className="text-[15px] leading-[1.5] text-sys-label-neutral">
            같이 첫 칸을 만들어봐 주셔서 고마워요. 지금 느낌만 살짝 들려주시면,
            다음 걸음을 더 다정하게 만들어볼게요.
          </p>
        </div>

        <RegisterForm />
      </main>
    </div>
  );
}
