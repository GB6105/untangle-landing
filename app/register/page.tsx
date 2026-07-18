import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import { RegisterForm } from "@/app/register/RegisterForm";

export const metadata: Metadata = {
  title: "사전 등록 — Untangle",
  description: "출시되면 가장 먼저 알려드릴게요. Untangle 사전 등록 페이지.",
};

/**
 * Pre-registration form — the `Screen · Registration · System` frame in DESIGN.pen.
 *
 * Stays a Server Component so it keeps its `metadata` export and server-renders
 * the static shell; the interactive form (validation, submit, success state) is
 * isolated in the `RegisterForm` Client Component. Submitting runs the
 * `submitRegistration` Server Action, which appends a row to the target sheet.
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
            사전 등록
          </p>
          <h1 className="text-[30px] font-bold leading-[1.3] tracking-[-0.5px] text-sys-label-strong">
            사전 등록하기
          </h1>
          <p className="text-[15px] leading-[1.5] text-sys-label-neutral">
            출시되면 가장 먼저 알려드릴게요.
          </p>
        </div>

        <RegisterForm />
      </main>
    </div>
  );
}
