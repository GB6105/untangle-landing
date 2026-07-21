import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { Provider } from "@/components/split/types";
import type {
  BraindumpRequest,
  BraindumpResult,
  Candidate,
} from "@/components/demo/types";
import { asRequestedProvider, resolveProvider } from "@/lib/llm";

/**
 * 브레인덤프 후보 추출 backend — docs/features/02-demo-braindump.md §4.
 *
 * Single stateless action: the user's raw braindump goes in, up to 10
 * actionable to-do *candidates* come out (PRD 5.1). Deciding is the user's job
 * (원칙 3), so this never confirms anything. Inputs the model can't turn into
 * candidates come back as `retry` with concrete examples instead of a
 * counter-question (PRD 5.1 — 되묻지 않고 예시로 돕는다).
 *
 * Mirrors the /api/split conventions: provider 이중 지원(Claude 기본), 한국어
 * error mapping, client resends everything so no server session is needed.
 */

export const runtime = "nodejs";

const CLAUDE_MODEL = "claude-sonnet-5";
const OPENAI_MODEL = "gpt-4o"; // change here to use another GPT model
const MAX_CANDIDATES = 10;
const MAX_BRAINDUMP_LENGTH = 2000;

const FALLBACK_EXAMPLES = [
  "과제 2개랑 빨래가 밀렸어",
  "자소서 써야 하는데 손이 안 가",
  "시험공부 뭐부터 할지 모르겠어",
];

const BRAINDUMP_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["status", "message", "candidates", "examples"],
  properties: {
    status: { type: "string", enum: ["ok", "retry"] },
    message: { type: "string" },
    candidates: {
      anyOf: [
        { type: "null" },
        {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title", "big"],
            properties: {
              title: { type: "string" },
              big: { type: "boolean" },
            },
          },
        },
      ],
    },
    examples: {
      anyOf: [{ type: "null" }, { type: "array", items: { type: "string" } }],
    },
  },
};

const BRAINDUMP_SYSTEM = `당신은 "Untangle"의 Co-Planner예요. 사용자가 머릿속에 있는 일들을 정리되지 않은 채로 자유롭게 쏟아냈어요(브레인덤프).

# 할 일
- 이 단계는 '고르기'가 아니라 '펼쳐놓기'예요. 입력에 담긴 할 일 거리를 빠짐없이 찾아 최대 10개까지 전부 후보로 만드세요. 무엇을 오늘 할지는 다음 단계에서 사용자가 1~3개만 직접 고르니, 후보를 미리 몇 개로 추려주지 마세요.
- 서로 다른 일은 절대 하나로 합치지 마세요. 여러 일이 한 문장에 섞여 있으면 각각 별도의 후보로 분리하세요. (예: "과제 2개랑 빨래가 밀렸어" → 과제별 후보 2개 + 빨래 후보 1개)
- 찾을 수 있는 게 많으면 많이(10개까지), 적으면 적게 — 억지로 만들어 채우지는 마세요. 1개여도 괜찮아요.
- 이것은 확정이 아니라 '후보 제시'예요. 고르라고 재촉하는 말은 하지 마세요.
- 각 title은 오늘 실제로 손댈 수 있는 구체적인 행동 한 줄로 쓰세요.
- 순수한 감정 토로나 고민은 후보로 만들지 마세요. 다만 실행형으로 바꿀 수 있으면 바꿔서 제안하세요. (예: "운동 다시 시작하고 싶다" → "오늘 20분 산책하기")
- 각 후보가 '크게 느껴져 시작이 막막한 일'이면 big을 true, 바로 손댈 수 있는 작은 일이면 false로 표시하세요.
- 후보를 만들기 어려운 입력(잡담·너무 짧음·의미 없는 텍스트)이면 status를 "retry"로 하고, 사용자가 참고할 구체적인 브레인덤프 예시를 2~3개 제시하세요. 되묻지 말고 예시로 도우세요.

# 말투
- 따뜻하고 담백한 해요체. 재촉하지 않고 부담 주지 않기. message는 한두 문장으로 짧게.

# 출력 형식
반드시 아래 JSON 하나로만 응답하세요. JSON 외 다른 텍스트는 절대 덧붙이지 마세요.
{
  "status": "ok" | "retry",
  "message": string,
  "candidates": [ { "title": string, "big": boolean } ] | null,
  "examples": string[] | null
}
- status가 "ok"면 candidates(1~10개)를 채우고 examples는 null.
- status가 "retry"면 examples(2~3개)를 채우고 candidates는 null.`;

function braindumpUser(braindump: string): string {
  return `[브레인덤프]\n${braindump}\n\n위 내용에서 실행 가능한 할 일 후보를 빠짐없이, 최대 10개까지 전부 뽑아 주세요. 미리 추려주지 말고 찾은 만큼 다 보여주세요 — 고르는 건 다음 단계에서 사용자가 해요. 후보를 만들기 어려운 입력이면 구체적인 예시 2~3개로 다시 쏟아내도록 도와주세요.`;
}

function firstText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

const asCandidates = (value: unknown): Candidate[] =>
  (Array.isArray(value) ? value : [])
    .filter(
      (c): c is { title: string; big?: unknown } =>
        !!c &&
        typeof (c as Candidate).title === "string" &&
        (c as Candidate).title.trim().length > 0,
    )
    .slice(0, MAX_CANDIDATES)
    .map((c) => ({ title: c.title.trim(), big: c.big === true }));

const asExamples = (value: unknown): string[] => {
  const list = (Array.isArray(value) ? value : []).filter(
    (e): e is string => typeof e === "string" && e.trim().length > 0,
  );
  return list.length > 0 ? list.slice(0, 3) : FALLBACK_EXAMPLES;
};

async function callLLM(
  provider: Provider,
  system: string,
  user: string,
  schema: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  let text: string;

  if (provider === "gpt") {
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 2048,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    });
    text = completion.choices[0]?.message?.content ?? "";
  } else {
    const client = new Anthropic();
    const message = await client.messages.create({
      model: CLAUDE_MODEL,
      max_tokens: 2048,
      thinking: { type: "disabled" },
      system,
      messages: [{ role: "user", content: user }],
      output_config: { format: { type: "json_schema", schema } },
    });
    if (message.stop_reason === "refusal") {
      throw new Error("요청을 처리할 수 없어요. 다른 내용으로 다시 시도해 주세요.");
    }
    text = firstText(message);
  }

  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    throw new Error("AI 응답을 해석하지 못했어요. 잠시 후 다시 시도해 주세요.");
  }
}

export async function POST(request: Request): Promise<Response> {
  let body: BraindumpRequest;
  try {
    body = (await request.json()) as BraindumpRequest;
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const resolved = resolveProvider(asRequestedProvider(body?.provider));
  if ("error" in resolved) {
    return Response.json({ error: resolved.error }, { status: 500 });
  }
  const provider = resolved.provider;

  const braindump = body?.braindump?.trim();
  if (!braindump) {
    return Response.json(
      { error: "머릿속에 있는 일들을 먼저 적어 주세요." },
      { status: 400 },
    );
  }
  if (braindump.length > MAX_BRAINDUMP_LENGTH) {
    return Response.json(
      { error: "한 번에 담기엔 조금 길어요. 2,000자 안으로 나눠서 적어 주세요." },
      { status: 400 },
    );
  }

  try {
    const parsed = await callLLM(
      provider,
      BRAINDUMP_SYSTEM,
      braindumpUser(braindump),
      BRAINDUMP_SCHEMA,
    );
    const message = typeof parsed.message === "string" ? parsed.message : "";

    if (parsed.status === "ok") {
      const candidates = asCandidates(parsed.candidates);
      // 후보가 하나도 없는 "ok"는 성립하지 않는다 — 예시 제시로 폴백 (02 §4 서버 방어)
      if (candidates.length > 0) {
        const result: BraindumpResult = {
          status: "ok",
          message: message || "오늘 할 일 후보를 뽑아봤어요.",
          candidates,
        };
        return Response.json(result);
      }
    }

    const result: BraindumpResult = {
      status: "retry",
      message:
        message || "아직 할 일 모양이 잘 안 보여요. 이런 식으로 쏟아내 볼까요?",
      examples: asExamples(parsed.examples),
    };
    return Response.json(result);
  } catch (error) {
    if (
      error instanceof Anthropic.AuthenticationError ||
      error instanceof OpenAI.AuthenticationError
    ) {
      return Response.json(
        { error: "AI API 인증에 실패했어요. API 키를 확인해 주세요." },
        { status: 500 },
      );
    }
    if (
      error instanceof Anthropic.RateLimitError ||
      error instanceof OpenAI.RateLimitError
    ) {
      return Response.json(
        { error: "요청이 잠시 몰렸어요. 잠깐 뒤에 다시 시도해 주세요." },
        { status: 429 },
      );
    }
    const message = error instanceof Error ? error.message : "알 수 없는 오류가 발생했어요.";
    return Response.json({ error: message }, { status: 500 });
  }
}
