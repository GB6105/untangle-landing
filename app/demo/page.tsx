import type { Metadata } from "next";
import { DemoFlow } from "@/components/demo/DemoFlow";

export const metadata: Metadata = {
  title: "체험 — Untangle",
  description:
    "머릿속을 쏟아내고, 오늘 할 일을 고르고, 작은 첫 단계로 쪼개 실행까지 — Untangle의 하루를 가입 없이 그대로 체험해보세요.",
};

/**
 * 전체 플로우 데모 화면 — the `/demo` route (docs/features/01-demo-shell.md).
 *
 * A server-component shell hosting the interactive `DemoFlow` client component.
 * Follows the app-shell pattern proven by the old `/split` page: `min-h-dvh`
 * so the column fills the viewport and inner chat areas scroll independently.
 */
export default function DemoPage() {
  return (
    <div className="flex min-h-dvh justify-center bg-[var(--backdrop)]">
      <main className="flex min-h-dvh w-full max-w-[480px] flex-col bg-sys-bg shadow-[0_0_60px_-20px_rgba(26,26,36,0.15)]">
        <DemoFlow />
      </main>
    </div>
  );
}
