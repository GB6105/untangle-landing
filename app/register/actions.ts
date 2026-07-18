"use server";

/**
 * Experience-feedback submit action.
 *
 * Collects a 5-point satisfaction rating (and, only for low scores, an optional
 * reason) from someone who just tried the product, then forwards it to a Google
 * Apps Script Web App that appends one row to the target sheet. No contact info
 * is required. The webhook URL and shared token live only in server env vars.
 */

export type FeedbackState = {
  status: "idle" | "success" | "error";
  message?: string;
  errors?: { rating?: string };
};

export const initialFeedbackState: FeedbackState = { status: "idle" };

/** 1–5 → human-readable label stored alongside the score. */
const RATING_LABELS: Record<number, string> = {
  1: "아쉬웠어요",
  2: "그저 그랬어요",
  3: "괜찮았어요",
  4: "좋았어요",
  5: "정말 좋았어요",
};

export async function submitFeedback(
  _prev: FeedbackState,
  formData: FormData,
): Promise<FeedbackState> {
  // Honeypot: real users never fill a hidden field. Pretend success so bots
  // get no signal, but skip the write.
  if (((formData.get("company") as string) || "").trim() !== "") {
    return { status: "success" };
  }

  const ratingRaw = ((formData.get("rating") as string) || "").trim();
  const rating = Number(ratingRaw);
  if (!ratingRaw || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { status: "error", errors: { rating: "만족도를 선택해 주세요." } };
  }

  // Reason is only asked (and only meaningful) for low scores (1–3). The inputs
  // are unmounted for high scores, so nothing stale is submitted, but gate on
  // the score anyway. "기타" swaps in the free-text value.
  const reasonSel = ((formData.get("reason") as string) || "").trim();
  const reasonEtc = ((formData.get("reasonEtc") as string) || "").trim();
  const reason =
    rating <= 3 ? (reasonSel === "기타" ? reasonEtc : reasonSel) : "";

  // Optional free-form comment, always allowed regardless of the score.
  const comment = ((formData.get("comment") as string) || "").trim();

  const url = process.env.SHEETS_WEBHOOK_URL;
  const token = process.env.SHEETS_WEBHOOK_TOKEN;
  if (!url || !token) {
    console.error(
      "[feedback] SHEETS_WEBHOOK_URL / SHEETS_WEBHOOK_TOKEN 환경변수가 설정되지 않았습니다.",
    );
    return {
      status: "error",
      message: "일시적인 오류로 전송에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        token,
        rating,
        ratingLabel: RATING_LABELS[rating] ?? "",
        reason,
        comment,
      }),
      cache: "no-store",
      signal: controller.signal,
    }).finally(() => clearTimeout(timeout));

    const text = await res.text();
    let ok = false;
    try {
      ok = res.ok && JSON.parse(text)?.ok === true;
    } catch {
      ok = false;
    }
    if (!ok) {
      console.error(
        `[feedback] 웹훅 응답 오류 status=${res.status} body=${text.slice(0, 200)}`,
      );
      return {
        status: "error",
        message:
          "소감 전송에 실패했어요. 잠시 후 다시 시도하거나 문의해 주세요.",
      };
    }
  } catch (err) {
    console.error("[feedback] 웹훅 요청 실패", err);
    return {
      status: "error",
      message: "네트워크 오류로 전송에 실패했어요. 잠시 후 다시 시도해 주세요.",
    };
  }

  return { status: "success" };
}
