import { Header } from "@/sections/Header";
import { Hero } from "@/sections/Hero";
import { Problem } from "@/sections/Problem";
import { Differentiation } from "@/sections/Differentiation";
import { WhoFor } from "@/sections/WhoFor";
import { FinalCta } from "@/sections/FinalCta";
import { LandingTracker } from "@/components/analytics/LandingTracker";

export default function Home() {
  return (
    <div className="flex min-h-full justify-center bg-[var(--backdrop)]">
      <main className="w-full max-w-[480px] bg-sys-bg shadow-[0_0_60px_-20px_rgba(26,26,36,0.15)]">
        <Header />
        <Hero />
        <Problem />
        <Differentiation />
        <WhoFor />
        <FinalCta />
      </main>
      {/* 섹션 스크롤 도달(section_viewed) 계측 — DOM만 관찰, 섹션은 서버 렌더 유지 */}
      <LandingTracker />
    </div>
  );
}
