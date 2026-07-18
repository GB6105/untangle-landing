import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type {
  PlanRequest,
  Provider,
  QA,
  Subtask,
} from "@/components/today/types";

/**
 * "오늘의 계획"(daily top-3) backend — FEATURE.md §1.
 *
 * - `extract`   : 브레인덤프에서 오늘 핵심 할 일 3개를 추출한다(1.2). 각 항목은
 *                 시작이 막막한 '큰 일'인지 big으로 표시한다(1.3).
 * - `subdivide` : 큰 일을 짧은 문답으로 맥락을 확인한 뒤(1.4) 서브태스크를
 *                 실행 순서대로 반환한다. 정보가 부족하면 다음 질문을 먼저 던진다.
 *
 * provider로 GPT(gpt-4o, 기본) 또는 Claude를 고를 수 있다. 대화는 무상태:
 * 클라이언트가 매 요청에 브레인덤프·문답을 함께 보낸다. (1.5 영구 저장은 보류)
 */

export const runtime = "nodejs";

const CLAUDE_MODEL = "claude-sonnet-5";
const OPENAI_MODEL = "gpt-4o"; // change here to use another GPT model
const MAX_CORE = 3;
const MAX_SUBTASKS = 5;

const EXTRACT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["message", "tasks"],
  properties: {
    message: { type: "string" },
    tasks: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        required: ["title", "big"],
        properties: { title: { type: "string" }, big: { type: "boolean" } },
      },
    },
  },
};

const SUBDIVIDE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["status", "message", "question", "subtasks"],
  properties: {
    status: { type: "string", enum: ["need_more", "ready"] },
    message: { type: "string" },
    question: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          required: ["text", "options"],
          properties: {
            text: { type: "string" },
            options: { type: "array", items: { type: "string" } },
          },
        },
      ],
    },
    subtasks: {
      anyOf: [
        { type: "null" },
        {
          type: "array",
          items: {
            type: "object",
            additionalProperties: false,
            required: ["title"],
            properties: { title: { type: "string" } },
          },
        },
      ],
    },
  },
};

const EXTRACT_SYSTEM = `당신은 "Untangle"의 Co-Planner예요. 사용자가 오늘 해야 할 것 같은 일들을 정리되지 않은 채로 자유롭게 쏟아냈어요(브레인덤프).

# 할 일
- 흩어진 입력 속에서 '오늘 끝낼 핵심 할 일'을 정확히 3개 골라내세요. 입력이 빈약해도 오늘 할 만한 일로 3개를 합리적으로 구성해요.
- 밀린 목록의 압도감을 줄이기 위해 3개로 제한해요.
- 각 할 일이 '크게 느껴져 시작이 막막한 일'이면 big을 true, 바로 손댈 수 있는 작은 일이면 false로 표시하세요.
- 각 title은 오늘 실제로 손댈 수 있는 구체적인 행동으로.

# 말투
- 따뜻하고 담백한 해요체. message는 3개를 건네는 한두 문장으로 짧게.

# 출력 형식
반드시 아래 JSON 하나로만 응답하세요. JSON 외 다른 텍스트는 덧붙이지 마세요.
{ "message": string, "tasks": [ { "title": string, "big": boolean } ] }
- tasks는 정확히 3개.`;

const SUBDIVIDE_SYSTEM = `당신은 "Untangle"의 Co-Planner예요. 사용자가 오늘의 핵심 할 일 중 하나가 커서 막막해하고 있어요. 그 일을 시작할 수 있게 작은 서브태스크로 쪼개주려 합니다.

# 진행 방식
1. 쪼개기에 꼭 필요한 정보가 부족하면 status를 "need_more"로 하고 짧은 질문 하나를 던지세요.
   - 사용자가 바로 고를 수 있는 선택지(options)를 반드시 2~4개 함께 제시하세요. (options는 빈 배열이면 안 됩니다.)
   - 질문은 최대 2~3개면 충분해요. 이미 충분하면 곧바로 쪼개세요.
2. 정보가 충분하면 status를 "ready"로 하고, 그 일을 작은 서브태스크로 나눠 '무엇부터 할지' 실행 순서대로 정렬해 제시하세요.
   - subtasks: 실행 순서대로. 첫 항목은 지금 당장 금방 끝낼 수 있는 아주 작은 첫 단계로.
   - 5개 이하로.

# 말투
- 따뜻한 해요체. message는 한두 문장.

# 출력 형식
반드시 아래 JSON 하나로만 응답하세요. JSON 외 다른 텍스트는 덧붙이지 마세요.
{ "status": "need_more" | "ready", "message": string, "question": { "text": string, "options": string[] } | null, "subtasks": [ { "title": string } ] | null }
- need_more면 question을 채우고(options 2~4개) subtasks는 null.
- ready면 subtasks(실행 순서대로, 5개 이하)를 채우고 question은 null.`;

function extractUser(braindump: string): string {
  return `[브레인덤프]\n${braindump}\n\n위 내용에서 오늘 끝낼 핵심 할 일 3개를 골라 정리해 주세요.`;
}

function subdivideUser(braindump: string, task: string, answers: QA[]): string {
  const qa = answers.length
    ? answers.map((a) => `- 질문: ${a.question}\n  답변: ${a.answer}`).join("\n")
    : "아직 없음";
  return `[오늘의 맥락 (브레인덤프)]\n${braindump}\n\n[쪼갤 일]\n${task}\n\n[지금까지의 문답]\n${qa}\n\n이 일을 시작할 수 있게 서브태스크로 쪼개주세요. 정보가 부족하면 질문(need_more), 충분하면 실행 순서대로 쪼개기(ready).`;
}

function firstText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

const asSubtasks = (value: unknown): Subtask[] =>
  (Array.isArray(value) ? value : [])
    .filter((t): t is Subtask => !!t && typeof t.title === "string")
    .slice(0, MAX_SUBTASKS);

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
  let body: PlanRequest;
  try {
    body = (await request.json()) as PlanRequest;
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const provider: Provider = body?.provider === "claude" ? "claude" : "gpt";

  if (provider === "gpt" && !process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY가 설정되지 않았어요. 프로젝트 루트의 .env.local에 키를 추가한 뒤 개발 서버를 다시 시작해 주세요.",
      },
      { status: 500 },
    );
  }
  if (provider === "claude" && !process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "ANTHROPIC_API_KEY가 설정되지 않았어요. 프로젝트 루트의 .env.local에 키를 추가한 뒤 개발 서버를 다시 시작해 주세요.",
      },
      { status: 500 },
    );
  }

  if (!body?.braindump?.trim()) {
    return Response.json(
      { error: "오늘 떠오르는 일들을 먼저 적어 주세요." },
      { status: 400 },
    );
  }

  try {
    if (body.action === "subdivide") {
      if (!body.task?.trim()) {
        return Response.json(
          { error: "쪼갤 일을 지정해 주세요." },
          { status: 400 },
        );
      }
      const answers = Array.isArray(body.answers) ? body.answers : [];
      const parsed = await callLLM(
        provider,
        SUBDIVIDE_SYSTEM,
        subdivideUser(body.braindump, body.task, answers),
        SUBDIVIDE_SCHEMA,
      );

      if (parsed.status === "ready") {
        return Response.json({
          status: "ready",
          message:
            typeof parsed.message === "string" ? parsed.message : "이렇게 쪼개봤어요.",
          subtasks: asSubtasks(parsed.subtasks),
        });
      }

      const q = parsed.question as { text?: unknown; options?: unknown } | null;
      if (!q || typeof q.text !== "string") {
        throw new Error("응답 형식이 올바르지 않아요.");
      }
      return Response.json({
        status: "need_more",
        message: typeof parsed.message === "string" ? parsed.message : "",
        question: {
          text: q.text,
          options: Array.isArray(q.options)
            ? q.options.filter((o): o is string => typeof o === "string")
            : [],
        },
      });
    }

    // action: "extract"
    const parsed = await callLLM(
      provider,
      EXTRACT_SYSTEM,
      extractUser(body.braindump),
      EXTRACT_SCHEMA,
    );
    const tasks = (Array.isArray(parsed.tasks) ? parsed.tasks : [])
      .filter(
        (t): t is { title: string; big?: unknown } =>
          !!t && typeof t.title === "string",
      )
      .slice(0, MAX_CORE)
      .map((t) => ({ title: t.title, big: t.big === true }));

    return Response.json({
      message: typeof parsed.message === "string" ? parsed.message : "오늘은 이 3가지에 집중해봐요.",
      tasks,
    });
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
