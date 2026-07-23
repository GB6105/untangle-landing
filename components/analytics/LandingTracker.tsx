"use client";

import { useEffect } from "react";
import { track } from "@/lib/analytics";

/**
 * 랜딩 섹션 스크롤 도달 추적기. app/page.tsx에 한 번 마운트되어,
 * [data-track-section] 을 가진 섹션이 화면에 들어오면 section_viewed 를 한 번씩
 * 쏜다. 섹션들을 client로 바꾸지 않고 IntersectionObserver로만 관찰한다.
 *
 * 이 섹션별 도달률이 "랜딩이 데모까지 이끄는가"(목표 1)의 스크롤 깊이 지표다.
 */
export function LandingTracker() {
  useEffect(() => {
    const sections = Array.from(
      document.querySelectorAll<HTMLElement>("[data-track-section]"),
    );
    if (sections.length === 0) return;

    const seen = new Set<string>();
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          const name = (entry.target as HTMLElement).dataset.trackSection;
          if (!name || seen.has(name)) continue;
          seen.add(name);
          track("section_viewed", { section: name });
          io.unobserve(entry.target);
        }
      },
      // 섹션 상단이 뷰포트 위쪽 70% 안으로 들어오면 "도달"로 본다.
      { threshold: 0.01, rootMargin: "0px 0px -30% 0px" },
    );

    sections.forEach((s) => io.observe(s));
    return () => io.disconnect();
  }, []);

  return null;
}
