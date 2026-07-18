export function Hero() {
  return (
    <section className="flex flex-col gap-5 bg-sys-bg px-6 pt-[26px] pb-11">
      <div className="flex w-fit items-center gap-[7px] rounded-full bg-sys-primary-lighter px-[13px] py-[7px]">
        <span className="h-[7px] w-[7px] rounded-full bg-sys-primary" />
        <span className="text-[12.5px] font-semibold text-sys-primary-dark">
          베타 체험 진행 중
        </span>
      </div>

      <h1 className="whitespace-pre-line text-[31px] font-bold leading-[1.32] tracking-[-0.3px] text-sys-label-strong">
        {"해야 할 일은 아는데,\n시작이 안 될 때"}
      </h1>

      <p className="text-[15px] leading-[1.62] text-sys-label-neutral">
        머릿속을 함께 정리하고, 당신이 고른 일을 지금 바로 할 수 있는 작은 첫
        행동으로 쪼개봐요.
      </p>
    </section>
  );
}
