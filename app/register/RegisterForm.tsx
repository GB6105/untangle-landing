"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Icon } from "@/components/Icon";
import {
  submitRegistration,
  initialRegisterState,
} from "@/app/register/actions";

/**
 * Interactive part of the pre-registration screen.
 *
 * Split out as a Client Component so the surrounding page can stay a Server
 * Component (keeping its `metadata` export). `useActionState` drives the
 * pending / error / success states; on success the form is replaced in place
 * with a confirmation, so there is no page navigation.
 */
export function RegisterForm() {
  const [state, formAction, pending] = useActionState(
    submitRegistration,
    initialRegisterState,
  );

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-4 pt-10 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-sys-primary text-sys-on-primary">
          <Icon name="check" size={28} strokeWidth={2.5} />
        </span>
        <h2 className="text-[22px] font-bold tracking-[-0.3px] text-sys-label-strong">
          사전 등록이 완료됐어요
        </h2>
        <p className="text-[15px] leading-[1.6] text-sys-label-neutral">
          출시되면 등록하신 번호로
          <br />
          가장 먼저 알려드릴게요.
        </p>
        <Link
          href="/"
          className="mt-2 text-[14px] font-semibold text-sys-primary-dark"
        >
          홈으로 돌아가기
        </Link>
      </div>
    );
  }

  const { errors, values } = state;

  return (
    <form action={formAction} className="flex flex-col gap-7 pt-7">
      {/* Honeypot — hidden from users; bots that fill it are silently dropped. */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="hidden"
      />

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
            required
            defaultValue={values?.phone}
            aria-invalid={errors?.phone ? true : undefined}
            aria-describedby={errors?.phone ? "phone-error" : undefined}
            placeholder="010-0000-0000"
            className="h-[52px] rounded-xl border border-sys-line bg-sys-bg px-4 text-[15px] text-sys-label-strong outline-none placeholder:text-sys-label-alt focus:border-sys-primary focus:ring-2 focus:ring-sys-primary-lighter aria-[invalid]:border-red-400 aria-[invalid]:focus:ring-red-200"
          />
          {errors?.phone && (
            <span id="phone-error" className="text-[13px] text-red-500">
              {errors.phone}
            </span>
          )}
        </label>

        <label className="flex flex-col gap-2">
          <span className="text-[14px] font-semibold text-sys-label-strong">
            이메일 (선택)
          </span>
          <input
            type="email"
            name="email"
            autoComplete="email"
            defaultValue={values?.email}
            aria-invalid={errors?.email ? true : undefined}
            aria-describedby={errors?.email ? "email-error" : undefined}
            placeholder="you@example.com"
            className="h-[52px] rounded-xl border border-sys-line bg-sys-bg px-4 text-[15px] text-sys-label-strong outline-none placeholder:text-sys-label-alt focus:border-sys-primary focus:ring-2 focus:ring-sys-primary-lighter aria-[invalid]:border-red-400 aria-[invalid]:focus:ring-red-200"
          />
          {errors?.email && (
            <span id="email-error" className="text-[13px] text-red-500">
              {errors.email}
            </span>
          )}
        </label>
      </div>

      {/* Consent */}
      <div className="flex flex-col gap-1.5">
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
        {errors?.consent && (
          <span className="text-[13px] text-red-500">{errors.consent}</span>
        )}
      </div>

      {state.status === "error" && state.message && (
        <p
          role="alert"
          className="rounded-xl bg-red-50 px-4 py-3 text-center text-[13px] leading-[1.5] text-red-600"
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="h-[54px] rounded-xl bg-sys-primary-dark text-[16px] font-bold text-sys-on-primary shadow-[0_9px_24px_-2px_rgba(106,69,231,0.25)] transition-shadow hover:shadow-[0_12px_28px_-2px_rgba(106,69,231,0.4)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? "등록 중…" : "사전 등록하기"}
      </button>

      <p className="text-center text-[12px] leading-[1.5] text-sys-label-alt">
        등록하신 정보는 출시 안내 용도로만 사용돼요.
      </p>
    </form>
  );
}
