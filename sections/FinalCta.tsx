import Link from "next/link";
import { CtaButton } from "@/components/CtaButton";
import { Icon } from "@/components/Icon";

export function FinalCta() {
  return (
    <section className="flex flex-col items-center gap-[14px] bg-sys-bg px-6 pt-[50px] pb-[58px]">
      <h2 className="text-center text-[23px] font-bold leading-[1.36] tracking-[-0.3px] text-sys-label-strong">
        지금, 첫 칸을 같이 만들어요
      </h2>

      <p className="text-center text-[14px] leading-[1.6] text-sys-label-neutral">
        출시되면 등록하신 번호로 가장 먼저 알려드릴게요.
      </p>

      <div className="w-full pt-2.5">
        <CtaButton />
      </div>

      <Link
        href="/today"
        className="flex w-full items-center justify-center gap-2 rounded-[14px] border border-sys-primary px-[30px] py-[17px] text-[15px] font-bold text-sys-primary-dark transition-colors hover:bg-sys-primary-lighter"
      >
        <Icon name="sparkles" size={17} strokeWidth={2.2} />
        지금 오늘의 계획 세워보기
      </Link>

      <div className="flex justify-center gap-[18px] pt-1.5">
        <button type="button" className="text-[13px] text-sys-label-neutral">
          개인정보 처리방침
        </button>
        <button type="button" className="text-[13px] text-sys-label-neutral">
          문의하기
        </button>
      </div>
    </section>
  );
}
