"use client"; // 에러 경계는 반드시 클라이언트 컴포넌트

import { useEffect } from "react";
import Link from "next/link";

/**
 * `/register` 세그먼트의 에러 경계.
 *
 * 이 화면은 체험을 끝까지 마친 사람이 소감을 남기러 오는 마지막 지점이라,
 * 서버 예외 하나로 Next 기본 500 화면("This page couldn't load")이 뜨면 그 방문자는
 * 그대로 영구 이탈한다. 경계가 없으면 예외가 루트까지 올라가 페이지 전체가 날아가므로
 * 여기서 받아 한국어 화면과 복구 경로를 준다 (05 §4.2의 "막다른 길 금지"와 같은 취지).
 *
 * prop은 `reset`이 아니라 `unstable_retry`다 — Next 16.2.0에서 추가됐고 문서가
 * 기본으로 권한다. `reset`은 재요청 없이 상태만 지운다.
 */
export default function RegisterError({
  error,
  unstable_retry,
}: {
  error: Error & { digest?: string };
  unstable_retry: () => void;
}) {
  useEffect(() => {
    // 프로덕션에서는 message가 가려지므로 digest로 서버 로그와 맞춘다.
    console.error("[register] 소감 화면에서 오류", error);
  }, [error]);

  return (
    <div className="flex min-h-dvh justify-center bg-[var(--backdrop)]">
      <main className="flex w-full max-w-[480px] flex-col items-center justify-center gap-4 bg-sys-bg px-8 text-center shadow-[0_0_60px_-20px_rgba(26,26,36,0.15)]">
        <h1 className="text-[22px] font-bold leading-[1.4] tracking-[-0.3px] text-sys-label-strong">
          소감을 보내는 중에 문제가 생겼어요
        </h1>
        <p className="text-[15px] leading-[1.6] text-sys-label-neutral">
          잠시 후 다시 시도해 주세요.
          <br />
          적어주신 내용이 사라졌다면 정말 죄송해요.
        </p>
        <button
          type="button"
          onClick={() => unstable_retry()}
          className="mt-2 h-[52px] w-full rounded-xl bg-sys-primary-dark text-[16px] font-bold text-sys-on-primary"
        >
          다시 시도
        </button>
        <Link
          href="/"
          className="text-[14px] font-semibold text-sys-primary-dark"
        >
          홈으로 돌아가기
        </Link>
        {error.digest && (
          <p className="pt-1 text-[12px] text-sys-label-alt">
            오류 코드 {error.digest}
          </p>
        )}
      </main>
    </div>
  );
}
