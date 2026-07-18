import Link from "next/link";
import { Logo } from "@/components/Logo";

export function Header() {
  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-sys-line bg-sys-bg/90 px-6 py-[13px] backdrop-blur-md">
      <div className="flex items-center gap-2">
        <Logo size={30} />
        <span className="text-[18px] font-bold tracking-[-0.36px] text-sys-label-strong">
          Untangle
        </span>
      </div>
      <Link
        href="/register"
        className="text-[13px] font-semibold text-sys-primary-dark"
      >
        사전 등록
      </Link>
    </header>
  );
}
