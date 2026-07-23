"use client";

import { Suspense, useEffect } from "react";
import { initAnalytics } from "@/lib/analytics";
import { Pageviews } from "@/components/analytics/Pageviews";

/**
 * 분석 부트스트랩. app/layout.tsx에서 전체를 감싼다(서버 레이아웃이 클라이언트
 * provider를 렌더하는 정상 패턴). PostHog 키가 없으면 initAnalytics가 no-op이므로
 * 미설정 환경에서도 앱은 그대로 동작한다.
 */
export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    initAnalytics();
  }, []);

  return (
    <>
      {children}
      {/* useSearchParams는 Suspense 경계가 필요하다 */}
      <Suspense fallback={null}>
        <Pageviews />
      </Suspense>
    </>
  );
}
