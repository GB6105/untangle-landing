"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { capturePageview } from "@/lib/analytics";

/**
 * App Router 페이지뷰 추적기. PostHog의 자동 페이지뷰는 SPA 클라이언트 전환을
 * 놓치므로(capture_pageview를 끔), pathname/searchParams 변화마다 직접 쏜다.
 *
 * useSearchParams는 Next 16에서 Suspense 경계를 요구하므로, 부모(PostHogProvider)
 * 에서 <Suspense>로 감싼다.
 */
export function Pageviews() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    if (!pathname) return;
    let url = window.location.origin + pathname;
    const qs = searchParams?.toString();
    if (qs) url += `?${qs}`;
    capturePageview(url);
  }, [pathname, searchParams]);

  return null;
}
