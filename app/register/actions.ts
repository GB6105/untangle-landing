"use server";

/**
 * Pre-registration submit action.
 *
 * Validates the phone / email / consent fields on the server, then forwards the
 * record to a Google Apps Script Web App (deployed against the target sheet),
 * which appends one row. The webhook URL and shared token live only in server
 * env vars — they are never sent to the browser — so the sheet stays writable
 * only through this action.
 */

export type RegisterState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Field-level errors, keyed by input name. */
  errors?: { phone?: string; email?: string; consent?: string };
  /** Echo the user's input back so the form can repopulate on error. */
  values?: { phone: string; email: string };
};

export const initialRegisterState: RegisterState = { status: "idle" };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Normalize a Korean mobile number to `010-1234-5678` form.
 * Returns null when the digits don't look like a KR mobile number.
 */
function normalizePhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (!/^01[0-9]{8,9}$/.test(digits)) return null;
  return digits.length === 11
    ? `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`
    : `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export async function submitRegistration(
  _prev: RegisterState,
  formData: FormData,
): Promise<RegisterState> {
  // Honeypot: real users never fill a hidden field. Pretend success so bots
  // get no signal, but skip the write.
  if (((formData.get("company") as string) || "").trim() !== "") {
    return { status: "success" };
  }

  const phoneRaw = ((formData.get("phone") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim();
  const consent = formData.get("consent") === "on";
  const values = { phone: phoneRaw, email };

  const errors: NonNullable<RegisterState["errors"]> = {};
  const phone = normalizePhone(phoneRaw);
  if (!phoneRaw) errors.phone = "휴대폰 번호를 입력해 주세요.";
  else if (!phone) errors.phone = "휴대폰 번호 형식을 확인해 주세요.";
  if (email && !EMAIL_RE.test(email))
    errors.email = "이메일 형식을 확인해 주세요.";
  if (!consent) errors.consent = "개인정보 수집·이용에 동의해 주세요.";

  if (Object.keys(errors).length > 0) {
    return { status: "error", errors, values };
  }

  const url = process.env.SHEETS_WEBHOOK_URL;
  const token = process.env.SHEETS_WEBHOOK_TOKEN;
  if (!url || !token) {
    console.error(
      "[register] SHEETS_WEBHOOK_URL / SHEETS_WEBHOOK_TOKEN 환경변수가 설정되지 않았습니다.",
    );
    return {
      status: "error",
      message: "일시적인 오류로 등록에 실패했어요. 잠시 후 다시 시도해 주세요.",
      values,
    };
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, phone, email, consent: true }),
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
        `[register] 웹훅 응답 오류 status=${res.status} body=${text.slice(0, 200)}`,
      );
      return {
        status: "error",
        message:
          "등록 처리에 실패했어요. 잠시 후 다시 시도하거나 문의해 주세요.",
        values,
      };
    }
  } catch (err) {
    console.error("[register] 웹훅 요청 실패", err);
    return {
      status: "error",
      message: "네트워크 오류로 등록에 실패했어요. 잠시 후 다시 시도해 주세요.",
      values,
    };
  }

  return { status: "success" };
}
