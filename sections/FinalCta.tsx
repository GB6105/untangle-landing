import { CtaButton } from "@/components/CtaButton";

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
        <CtaButton label="사전 등록하기" />
      </div>

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
