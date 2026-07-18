import type { ReactNode } from "react";

/** A chat message in the daily-planner conversation. */
export function Bubble({
  role,
  children,
}: {
  role: "user" | "ai";
  children: ReactNode;
}) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[82%] whitespace-pre-wrap rounded-[16px] rounded-tr-[5px] bg-sys-primary-dark px-[15px] py-[11px] text-[14.5px] leading-[1.5] text-sys-on-primary">
          {children}
        </div>
      </div>
    );
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[86%] whitespace-pre-wrap rounded-[16px] rounded-tl-[5px] bg-sys-bg-gray px-[15px] py-[11px] text-[14.5px] leading-[1.55] text-sys-label-normal">
        {children}
      </div>
    </div>
  );
}
