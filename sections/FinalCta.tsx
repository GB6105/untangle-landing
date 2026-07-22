import { CtaButton } from "@/components/CtaButton";

export function FinalCta() {
  return (
    <section className="flex flex-col items-center gap-[14px] bg-sys-bg px-6 pt-[50px] pb-[58px]">
      {/* 스크롤 마무리도 체험으로 닫는다 — 소감 요청은 체험 이후에만 (실사용자
          피드백: 체험 전 소감 노출이 "왜 있지?" 이탈을 만들었다). */}
      <h2 className="whitespace-pre-line text-center text-[23px] font-bold leading-[1.36] tracking-[-0.3px] text-sys-label-strong">
        {"지금 가장 막막한 일,\n하나만 같이 쪼개봐요"}
      </h2>

      <p className="text-center text-[14px] leading-[1.6] text-sys-label-neutral">
        가입 없이 바로 시작해요. 하나만 해보고 닫아도 괜찮아요.
      </p>

      <div className="w-full pt-2.5">
        <CtaButton />
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
