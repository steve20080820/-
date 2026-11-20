import "server-only";
import { parseProblemText } from "./textParser";
import { suggestUnits, UNITS_2028 } from "./units";
import type { ProblemData } from "./types";

export type AiProvider = "anthropic" | "openai" | "demo";

export function activeProvider(): AiProvider {
  if (process.env.ANTHROPIC_API_KEY) return "anthropic";
  if (process.env.OPENAI_API_KEY) return "openai";
  return "demo";
}

const unitList = UNITS_2028.map(
  (m) => `- ${m.name}: ${(m.children ?? []).map((c) => `${c.name}(${(c.children ?? []).map((d) => d.name).join("/")})`).join(", ")}`,
).join("\n");

const SYSTEM_PROMPT = `너는 대한민국 수능 수학 시험지 조판 전문가다. 주어진 수학 문제(이미지 또는 텍스트)를 읽고 아래 JSON 하나만 출력한다. 설명, 코드펜스 금지.

{
  "body": "문제 본문. 수식은 반드시 KaTeX 호환 LaTeX로 인라인 $...$, 독립 수식은 $$...$$. 분수는 \\\\dfrac, 극한·적분·시그마는 \\\\displaystyle 사용. 조건 (가),(나) 박스는 [box]...[/box]로 감싼다. 문항 번호와 배점은 본문에서 제거.",
  "type": "multiple" 또는 "short",
  "choices": ["①의 내용", "②", "③", "④", "⑤"] (단답형이면 []),
  "bogi": ["ㄱ의 내용", "ㄴ의 내용", "ㄷ의 내용"] (<보기>가 없으면 []),
  "points": 2 | 3 | 4,
  "sourceNumber": 원래 문항 번호 정수 또는 null,
  "unitMajor": 대단원, "unitMiddle": 중단원, "unitDetail": 세부유형,
  "tags": ["핵심개념_태그", ...] (2~5개, 공백 대신 _),
  "hasFigure": 그래프/도형이 있으면 true,
  "answer": 확실할 때만 정답(선지 번호 1~5 또는 단답 수), 아니면 null
}

2028 수능 단원 체계:
${unitList}`;

function extractJson(text: string): Record<string, unknown> {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("AI 응답에서 JSON을 찾지 못했습니다.");
  return JSON.parse(text.slice(start, end + 1));
}

function normalize(j: Record<string, unknown>): Partial<ProblemData> & { hasFigure?: boolean } {
  const arr = (v: unknown) => (Array.isArray(v) ? v.map(String) : []);
  const type = j.type === "short" ? "short" : "multiple";
  const body = String(j.body ?? "");
  const fallback = suggestUnits(body);
  return {
    body,
    type,
    choices: type === "multiple" ? [0, 1, 2, 3, 4].map((i) => arr(j.choices)[i] ?? "") : [],
    bogi: arr(j.bogi),
    points: [2, 3, 4].includes(Number(j.points)) ? Number(j.points) : 3,
    sourceNumber: Number.isFinite(Number(j.sourceNumber)) && j.sourceNumber !== null ? Number(j.sourceNumber) : null,
    unitMajor: String(j.unitMajor || fallback.unitMajor),
    unitMiddle: String(j.unitMiddle || fallback.unitMiddle),
    unitDetail: String(j.unitDetail || fallback.unitDetail),
    tags: Array.from(new Set([...arr(j.tags), ...fallback.tags])).map((t) => t.replace(/^#/, "").replace(/\s+/g, "_")),
    answer: j.answer == null ? "" : String(j.answer),
    hasFigure: Boolean(j.hasFigure),
  };
}

async function callAnthropic(image?: { data: string; mime: string }, text?: string) {
  const content: unknown[] = [];
  if (image) content.push({ type: "image", source: { type: "base64", media_type: image.mime, data: image.data } });
  content.push({ type: "text", text: text ? `다음 문제를 변환하라:\n${text}` : "이 이미지의 수학 문제를 변환하라." });
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": process.env.ANTHROPIC_API_KEY!,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: process.env.ANTHROPIC_MODEL || "claude-sonnet-5-5",
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content }],
    }),
  });
  if (!res.ok) throw new Error(`Anthropic API 오류 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { content: { type: string; text?: string }[] };
  return json.content.filter((c) => c.type === "text").map((c) => c.text).join("");
}

async function callOpenAI(image?: { data: string; mime: string }, text?: string) {
  const content: unknown[] = [
    { type: "text", text: text ? `다음 문제를 변환하라:\n${text}` : "이 이미지의 수학 문제를 변환하라." },
  ];
  if (image) content.push({ type: "image_url", image_url: { url: `data:${image.mime};base64,${image.data}` } });
  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.OPENAI_API_KEY}` },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o",
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content },
      ],
    }),
  });
  if (!res.ok) throw new Error(`OpenAI API 오류 ${res.status}: ${(await res.text()).slice(0, 300)}`);
  const json = (await res.json()) as { choices: { message: { content: string } }[] };
  return json.choices[0]?.message?.content ?? "";
}

export async function parseProblem(input: { imageDataUrl?: string; text?: string }) {
  const provider = activeProvider();
  let image: { data: string; mime: string } | undefined;
  if (input.imageDataUrl) {
    const m = /^data:([\w/+.-]+);base64,(.+)$/s.exec(input.imageDataUrl);
    if (m) image = { mime: m[1], data: m[2] };
  }

  if (provider === "demo") {
    if (input.text?.trim()) {
      return { provider, result: parseProblemText(input.text), notice: "데모 파서(규칙 기반)로 텍스트를 구조화했습니다." };
    }
    return {
      provider,
      result: {} as Partial<ProblemData>,
      notice:
        "AI 키(ANTHROPIC_API_KEY 또는 OPENAI_API_KEY)가 없어 이미지 OCR은 건너뛰었습니다. 원본 이미지를 보며 텍스트/LaTeX를 직접 입력하거나, 문제 텍스트를 붙여넣고 '텍스트 파싱'을 사용하세요.",
    };
  }

  const raw = provider === "anthropic" ? await callAnthropic(image, input.text) : await callOpenAI(image, input.text);
  return { provider, result: normalize(extractJson(raw)), notice: `${provider === "anthropic" ? "Claude" : "OpenAI"} Vision으로 변환했습니다. 수식을 원본과 비교해 확인하세요.` };
}
