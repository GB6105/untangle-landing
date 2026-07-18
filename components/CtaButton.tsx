import Link from "next/link";
import { Icon } from "@/components/Icon";

/**
 * Primary "사전 등록하기" call-to-action. Leads to the pre-registration form.
 *
 * Renders an anchor rather than a <button> because it navigates: that keeps the
 * component server-rendered and preserves native link affordances such as
 * middle-click and "open in new tab".
 */
export function CtaButton({
  label = "사전 등록하기",
  className = "",
}: {
  label?: string;
  className?: string;
}) {
  return (
    <Link
      href="/register"
      className={`flex w-full items-center justify-center gap-2 rounded-[14px] bg-sys-primary-dark px-[30px] py-[19px] text-[17px] font-bold text-sys-on-primary shadow-[0_9px_24px_-2px_rgba(106,69,231,0.28)] transition-shadow hover:shadow-[0_12px_28px_-2px_rgba(106,69,231,0.4)] ${className}`}
    >
      {label}
      <Icon name="arrow-right" size={18} strokeWidth={2.2} />
    </Link>
  );
}
