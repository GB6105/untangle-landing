import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type {
  Answer,
  Provider,
  SplitRequest,
  SplitResult,
  Task,
} from "@/components/split/types";
import { asRequestedProvider, resolveProvider } from "@/lib/llm";

/**
 * 쪼개기(Split) feature backend — docs/features/03-demo-split.md.
 *
 * Drives the Co-Planner conversation with an LLM: on each `advance` turn it
 * either asks one freely-chosen clarify question or decomposes the goal into
 * ≤5 tasks plus an immediate first step. `resplit` breaks one chosen task
 * down further.
 *
 * Questions are hard-capped at 2 per conversation — the prompt targets 1,
 * defaults to assuming-and-splitting, and the client adds soft/hard guards on
 * top (03 §3.2). 무엇을 물을지는 모델이 정한다 — 고정된 맥락 체크리스트 없음.
 * `advance` optionally takes `context` (예: 브레인덤프 원문) so items already
 * evident there are never asked again.
 *
 * The user can pick the provider (Claude or GPT); both are asked to return the
 * same JSON shape. The conversation is stateless: the client sends the full
 * goal + answer history on every request, so no server-side session is needed.
 */

export const runtime = "nodejs";

const CLAUDE_MODEL = "claude-sonnet-5";
const OPENAI_MODEL = "gpt-4o"; // change here to use another GPT model
const MAX_TASKS = 5;

const taskSchema = {
  type: "object",
  additionalProperties: false,
  required: ["title"],
  properties: { title: { type: "string" } },
};

const ADVANCE_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["status", "message", "question", "tasks", "firstStep"],
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
    tasks: { anyOf: [{ type: "null" }, { type: "array", items: taskSchema }] },
    firstStep: { anyOf: [{ type: "null" }, taskSchema] },
  },
};

const RESPLIT_SCHEMA: Record<string, unknown> = {
  type: "object",
  additionalProperties: false,
  required: ["message", "tasks", "firstStep"],
  properties: {
    message: { type: "string" },
    tasks: { type: "array", items: taskSchema },
    firstStep: taskSchema,
  },
};

const ADVANCE_SYSTEM = `당신은 "Untangle"의 Co-Planner예요. 사용자가 '목표만 있는 큰 일'을 가져오면, 그 일을 실제로 시작할 수 있도록 작은 실행 단위로 쪼개주는 역할을 합니다.

# 진행 방식
1. 목표, [오늘의 맥락], 지금까지의 문답을 보고 곧바로 분해할 수 있는지 판단하세요. 대부분의 경우 바로 분해할 수 있어요(status: "ready"). 모호한 부분은 합리적으로 가정하고, 그 가정을 결과에 자연스럽게 반영하세요.
2. 분해에 꼭 필요한 정보가 정말로 빠져 있을 때만 status를 "need_more"로 하고, 가장 도움이 되는 질문 '하나만' 던지세요.
   - 무엇을 물을지는 자유롭게 정하세요(예: 지금 어디까지 했는지, 무엇이 되면 끝인지, 지금 낼 수 있는 시간, 막히는 지점 등). 짧고 답하기 쉬운 질문이어야 해요.
   - 사용자가 바로 고를 수 있는 짧은 선택지(options)를 반드시 2~4개 함께 제시하세요. (options는 절대 빈 배열이면 안 됩니다.)
   - 이미 물어본 것과 [오늘의 맥락]에서 드러난 것은 다시 묻지 마세요.
3. 질문 수 상한: 질문은 이 대화 전체에서 1회를 목표로 하고, 2회를 절대 넘기지 마세요.
   - 답변이 2개 쌓였다면 더 묻지 말고 반드시 분해하세요(status: "ready").
   - 사용자가 "그냥 이대로 쪼개줘"처럼 바로 분해를 원하면, 즉시 남은 것을 가정하고 분해하세요(status: "ready").
4. 분해할 때(status: "ready"):
   - tasks: 5개 이하의, 한눈에 부담 없는 작은 할 일. 각 title은 구체적인 행동으로.
   - firstStep: 지금 당장 고민 없이 할 수 있는 아주 작은 첫 행동 하나. tasks와는 별개로, 걸림돌을 우회하는 행동이어야 해요. (예: "책상에 앉기", "노트북 펼치기", "OOO 검색해보기")

# 말투
- 따뜻하고 담백한 해요체. 재촉하지 않고 부담 주지 않기. message는 질문/결과 앞에 붙는 한두 문장으로 짧게.

# 출력 형식
반드시 아래 JSON 형태 하나로만 응답하세요. JSON 외 다른 텍스트는 절대 덧붙이지 마세요.
{
  "status": "need_more" | "ready",
  "message": string,
  "question": { "text": string, "options": string[] } | null,
  "tasks": [ { "title": string } ] | null,
  "firstStep": { "title": string } | null
}
- status가 "need_more"면 question을 채우고(options 2~4개 필수) tasks와 firstStep은 null.
- status가 "ready"면 tasks(5개 이하)와 firstStep을 채우고 question은 null.`;

const RESPLIT_SYSTEM = `당신은 "Untangle"의 Co-Planner예요. 사용자가 이미 분해된 할 일 중 하나가 여전히 크게 느껴져서, 그 일을 더 잘게 쪼개달라고 요청했어요.

# 진행 방식
- 주어진 목표와 맥락을 참고해서 '더 쪼갤 일'을 더 작은 실행 단위(5개 이하)로 나누세요.
- 각 title은 구체적인 행동으로. 이미 존재하는 다른 할 일들과 중복되지 않게 하세요.
- firstStep: 그중 지금 당장 할 수 있는 아주 작은 첫 행동 하나.

# 말투
- 따뜻한 해요체. message는 한두 문장.

# 출력 형식
반드시 아래 JSON 하나로만 응답하세요. JSON 외 다른 텍스트는 덧붙이지 마세요.
{ "message": string, "tasks": [ { "title": string } ], "firstStep": { "title": string } }
- tasks는 5개 이하.`;

function contextBlock(goal: string, answers: Answer[]): string {
  const lines = answers.length
    ? answers
        .map((a) => `- 질문: ${a.question}\n  답변: ${a.answer}`)
        .join("\n")
    : "아직 없음";
  return `[목표]\n${goal}\n\n[지금까지 파악된 맥락]\n${lines}`;
}

function advanceUser(goal: string, answers: Answer[], context?: string): string {
  const daily = context?.trim()
    ? `[오늘의 맥락]\n${context.trim()}\n\n`
    : "";
  return `${daily}${contextBlock(goal, answers)}\n\n위 정보를 바탕으로, 분해에 꼭 필요한 정보가 정말 빠져 있을 때만 질문 하나를 옵션과 함께 제시하고(status: "need_more"), 그렇지 않으면 합리적으로 가정하고 할 일로 분해하세요(status: "ready"). 질문 상한(전체 1~2회)을 지키세요.`;
}

function resplitUser(
  goal: string,
  answers: Answer[],
  taskToSplit: string,
  otherTasks: string[],
): string {
  const others = otherTasks.length ? otherTasks.map((t) => `- ${t}`).join("\n") : "없음";
  return `${contextBlock(goal, answers)}\n\n[더 잘게 쪼갤 일]\n${taskToSplit}\n\n[이미 있는 다른 할 일들]\n${others}\n\n"${taskToSplit}"을(를) 더 작은 실행 단위(5개 이하)로 쪼개고, 지금 당장 할 수 있는 첫 행동(firstStep)을 제시하세요.`;
}

function firstText(message: Anthropic.Message): string {
  const block = message.content.find((b) => b.type === "text");
  return block && block.type === "text" ? block.text : "";
}

const asTasks = (value: unknown): Task[] =>
  (Array.isArray(value) ? value : [])
    .filter((t): t is Task => !!t && typeof t.title === "string")
    .slice(0, MAX_TASKS);

const asStep = (value: unknown): Task =>
  value && typeof (value as Task).title === "string"
    ? { title: (value as Task).title }
    : { title: "일단 시작할 수 있는 아주 작은 행동 하나 정하기" };

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
  let body: SplitRequest;
  try {
    body = (await request.json()) as SplitRequest;
  } catch {
    return Response.json({ error: "요청 형식이 올바르지 않아요." }, { status: 400 });
  }

  const resolved = resolveProvider(asRequestedProvider(body?.provider));
  if ("error" in resolved) {
    return Response.json({ error: resolved.error }, { status: 500 });
  }
  const provider = resolved.provider;

  if (!body?.goal?.trim()) {
    return Response.json({ error: "쪼갤 일을 먼저 입력해 주세요." }, { status: 400 });
  }

  try {
    if (body.action === "resplit") {
      if (!body.taskToSplit?.trim()) {
        return Response.json(
          { error: "더 쪼갤 할 일을 지정해 주세요." },
          { status: 400 },
        );
      }
      const parsed = await callLLM(
        provider,
        RESPLIT_SYSTEM,
        resplitUser(body.goal, body.answers ?? [], body.taskToSplit, body.otherTasks ?? []),
        RESPLIT_SCHEMA,
      );
      const result: SplitResult = {
        status: "resplit",
        message: typeof parsed.message === "string" ? parsed.message : "더 잘게 쪼개봤어요.",
        tasks: asTasks(parsed.tasks),
        firstStep: asStep(parsed.firstStep),
      };
      return Response.json(result);
    }

    const parsed = await callLLM(
      provider,
      ADVANCE_SYSTEM,
      advanceUser(body.goal, body.answers ?? [], body.context),
      ADVANCE_SCHEMA,
    );

    if (parsed.status === "ready") {
      const result: SplitResult = {
        status: "ready",
        message: typeof parsed.message === "string" ? parsed.message : "이렇게 쪼개봤어요.",
        tasks: asTasks(parsed.tasks),
        firstStep: asStep(parsed.firstStep),
      };
      return Response.json(result);
    }

    const q = parsed.question as { text?: unknown; options?: unknown } | null;
    if (!q || typeof q.text !== "string") {
      throw new Error("응답 형식이 올바르지 않아요.");
    }
    const result: SplitResult = {
      status: "need_more",
      message: typeof parsed.message === "string" ? parsed.message : "",
      question: {
        text: q.text,
        options: Array.isArray(q.options)
          ? q.options.filter((o): o is string => typeof o === "string")
          : [],
      },
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
