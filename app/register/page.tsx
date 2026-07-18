import type { Metadata } from "next";
import Link from "next/link";
import { Icon } from "@/components/Icon";

export const metadata: Metadata = {
  title: "사전 등록 — Untangle",
  description: "출시되면 가장 먼저 알려드릴게요. Untangle 사전 등록 페이지.",
};

/**
 * Pre-registration form — the `Screen · Registration · System` frame in DESIGN.pen.
 *
 * Stays a Server Component: the consent checkbox draws its checked state from the
 * native input via Tailwind's `peer`, so the screen needs no client JS.
 *
 * Submitting is not wired up — there is no backend yet — so the submit control is
 * a `type="button"` no-op, matching the other placeholder actions in this codebase.
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

        <div className="flex flex-col gap-7 pt-7">
          {/* Fields */}
          <div className="flex flex-col gap-[18px]">
            <label className="flex flex-col gap-2">
              <span className="text-[14px] font-semibold text-sys-label-strong">
                휴대폰 번호
              </span>
              <input
                type="tel"
                name="phone"
                inputMode="tel"
                autoComplete="tel"
                placeholder="010-0000-0000"
                className="h-[52px] rounded-xl border border-sys-line bg-sys-bg px-4 text-[15px] text-sys-label-strong outline-none placeholder:text-sys-label-alt focus:border-sys-primary focus:ring-2 focus:ring-sys-primary-lighter"
              />
            </label>

            <label className="flex flex-col gap-2">
              <span className="text-[14px] font-semibold text-sys-label-strong">
                이메일 (선택)
              </span>
              <input
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                className="h-[52px] rounded-xl border border-sys-line bg-sys-bg px-4 text-[15px] text-sys-label-strong outline-none placeholder:text-sys-label-alt focus:border-sys-primary focus:ring-2 focus:ring-sys-primary-lighter"
              />
            </label>
          </div>

          {/* Consent */}
          <div className="flex items-center gap-2.5 py-0.5">
            <label className="flex flex-1 items-center gap-2.5">
              <input type="checkbox" name="consent" className="peer sr-only" />
              {/* The tick is toggled with opacity, not color: forced-colors mode
                  overrides `color` but not `opacity`, so a transparent glyph would
                  paint there and make an unchecked box look checked. */}
              <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-md border-[1.5px] border-sys-label-alt bg-sys-bg text-sys-on-primary [&>svg]:opacity-0 peer-checked:border-sys-primary peer-checked:bg-sys-primary peer-checked:[&>svg]:opacity-100 peer-focus-visible:ring-2 peer-focus-visible:ring-sys-primary peer-focus-visible:ring-offset-2">
                <Icon name="check" size={14} strokeWidth={2.5} />
              </span>
              <span className="flex-1 text-[13px] leading-[1.4] text-sys-label-neutral">
                개인정보 수집·이용에 동의합니다
              </span>
            </label>
            <button
              type="button"
              className="text-[13px] font-semibold text-sys-primary-dark"
            >
              자세히
            </button>
          </div>

          <button
            type="button"
            className="h-[54px] rounded-xl bg-sys-primary-dark text-[16px] font-bold text-sys-on-primary shadow-[0_9px_24px_-2px_rgba(106,69,231,0.25)] transition-shadow hover:shadow-[0_12px_28px_-2px_rgba(106,69,231,0.4)]"
          >
            사전 등록하기
          </button>

          <p className="text-center text-[12px] leading-[1.5] text-sys-label-alt">
            등록하신 정보는 출시 안내 용도로만 사용돼요.
          </p>
        </div>
      </main>
    </div>
  );
}
