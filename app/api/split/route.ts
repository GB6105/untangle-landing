import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type {
  Answer,
  Provider,
  SplitRequest,
  SplitResult,
  Task,
} from "@/components/split/types";

/**
 * 쪼개기(Split) feature backend — docs/features/03-demo-split.md.
 *
 * Drives the Co-Planner conversation with an LLM: on each `advance` turn it
 * decides which of the 5 context items are still unclear and either asks the
 * next adaptive question or decomposes the goal into ≤5 tasks plus an
 * immediate first step. `resplit` breaks one chosen task down further.
 *
 * Questions are hard-capped at 3 per conversation (PRD 5.2 "최대 2~3번") — the
 * prompt targets 2 and the client adds soft/hard guards on top (03 §3.2).
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
const CONTEXT_KEYS = ["why", "current", "done", "capacity", "blocker"] as const;
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
          required: ["key", "text", "options"],
          properties: {
            key: { type: "string", enum: CONTEXT_KEYS },
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

const ADVANCE_SYSTEM = `당신은 "Untangle"의 Co-Planner예요. 사용자가 '목표만 있는 큰 일'을 가져오면, 그 일을 실제로 시작할 수 있도록 맥락을 구체화한 뒤 작은 실행 단위로 쪼개주는 역할을 합니다.

# 파악해야 하는 맥락 5가지 (key와 의미)
- why (왜 하는가): 목적·동기. 우선순위와 의미의 기준.
- current (지금 어디까지 왔나): 현재 진행 상태. 이미 한 일은 분해에서 제외한다.
- done (무엇이 되면 끝인가): 완료 기준·원하는 결과물. 분해의 종착점과 범위를 정한다.
- capacity (지금 낼 수 있는 여력): 가용 시간·에너지. 각 단계의 크기를 실제 가능한 분량으로 맞춘다.
- blocker (시작을 막는 것): 걸림돌·막히는 지점. '지금 할 첫 단계'를 우회 설계하는 근거.

# 진행 방식
1. 사용자의 목표와 지금까지의 답변을 보고, 5가지 항목 중 아직 불명확한 것이 있는지 판단하세요.
2. 첫 입력만으로 이미 충분히 명확한 항목은 질문하지 마세요. [오늘의 맥락]이 주어지면 그 안에서 이미 드러난 항목도 질문하지 마세요. 처음부터 모두 충분하면 곧바로 분해하세요(status: "ready").
3. 아직 불명확한 항목이 있으면 status를 "need_more"로 하고, 가장 도움이 되는 다음 질문 '하나만' 던지세요.
   - 앞선 답변에 따라 질문과 선택지를 자연스럽게 조정하세요. 질문 순서는 고정이 아니에요.
   - 사용자가 바로 고를 수 있는 짧은 선택지(options)를 반드시 2~4개 함께 제시하세요. (options는 절대 빈 배열이면 안 됩니다.)
   - 이미 답변된 항목(key)은 다시 묻지 마세요. question.key는 이번에 묻는 항목의 key여야 해요.
4. 질문 수 상한: 질문은 이 대화 전체에서 2회를 목표로 하고, 3회를 절대 넘기지 마세요.
   - 답변이 2개 이상 쌓였으면 남은 불명확한 항목은 합리적으로 가정하고 되도록 분해로 넘어가세요.
   - 답변이 3개 쌓였다면 더 묻지 말고 반드시 분해하세요(status: "ready").
   - 사용자가 "그냥 이대로 쪼개줘"처럼 바로 분해를 원하면, 즉시 남은 항목을 합리적으로 가정하고 분해하세요(status: "ready").
5. 맥락이 충분히 파악되면 status를 "ready"로 하고, 그 일을 작은 실행 단위로 분해하세요.
   - tasks: 5개 이하의, 한눈에 부담 없는 작은 할 일. 각 title은 구체적인 행동으로.
   - firstStep: 지금 당장 고민 없이 할 수 있는 아주 작은 첫 행동 하나. tasks와는 별개로, 걸림돌을 우회하는 행동이어야 해요. (예: "책상에 앉기", "노트북 펼치기", "OOO 검색해보기")

# 말투
- 따뜻하고 담백한 해요체. 재촉하지 않고 부담 주지 않기. message는 질문/결과 앞에 붙는 한두 문장으로 짧게.

# 출력 형식
반드시 아래 JSON 형태 하나로만 응답하세요. JSON 외 다른 텍스트는 절대 덧붙이지 마세요.
{
  "status": "need_more" | "ready",
  "message": string,
  "question": { "key": "why"|"current"|"done"|"capacity"|"blocker", "text": string, "options": string[] } | null,
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
        .map((a) => `- (${a.key}) 질문: ${a.question}\n  답변: ${a.answer}`)
        .join("\n")
    : "아직 없음";
  return `[목표]\n${goal}\n\n[지금까지 파악된 맥락]\n${lines}`;
}

function advanceUser(goal: string, answers: Answer[], context?: string): string {
  const daily = context?.trim()
    ? `[오늘의 맥락]\n${context.trim()}\n\n`
    : "";
  return `${daily}${contextBlock(goal, answers)}\n\n위 정보를 바탕으로, 아직 불명확한 맥락이 있으면 다음 질문 하나를 옵션과 함께 제시하고(status: "need_more"), 충분히 명확하면 할 일로 분해하세요(status: "ready"). 질문 상한(전체 2~3회)을 지키세요.`;
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

  const provider: Provider = body?.provider === "gpt" ? "gpt" : "claude";

  if (provider === "claude" && !process.env.ANTHROPIC_API_KEY) {
    return Response.json(
      {
        error:
          "ANTHROPIC_API_KEY가 설정되지 않았어요. 프로젝트 루트의 .env.local에 키를 추가한 뒤 개발 서버를 다시 시작해 주세요.",
      },
      { status: 500 },
    );
  }
  if (provider === "gpt" && !process.env.OPENAI_API_KEY) {
    return Response.json(
      {
        error:
          "OPENAI_API_KEY가 설정되지 않았어요. 프로젝트 루트의 .env.local에 키를 추가한 뒤 개발 서버를 다시 시작해 주세요.",
      },
      { status: 500 },
    );
  }

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

    const q = parsed.question as
      | { key?: unknown; text?: unknown; options?: unknown }
      | null;
    if (
      !q ||
      typeof q.text !== "string" ||
      typeof q.key !== "string" ||
      !CONTEXT_KEYS.includes(q.key as (typeof CONTEXT_KEYS)[number])
    ) {
      throw new Error("응답 형식이 올바르지 않아요.");
    }
    const result: SplitResult = {
      status: "need_more",
      message: typeof parsed.message === "string" ? parsed.message : "",
      question: {
        key: q.key as (typeof CONTEXT_KEYS)[number],
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
