import { PrismaClient, type Prisma } from "@prisma/client";
import type { ProblemData } from "./types";

const g = globalThis as unknown as { prisma?: PrismaClient };
export const prisma = g.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== "production") g.prisma = prisma;

export const problemInclude = { tags: true } satisfies Prisma.ProblemInclude;
type ProblemRow = Prisma.ProblemGetPayload<{ include: typeof problemInclude }>;

function parseArr(s: string): string[] {
  try {
    const v = JSON.parse(s);
    return Array.isArray(v) ? v.map(String) : [];
  } catch {
    return [];
  }
}

export function toProblemData(p: ProblemRow): ProblemData {
  return {
    ...p,
    type: p.type === "short" ? "short" : "multiple",
    choices: parseArr(p.choices),
    bogi: parseArr(p.bogi),
    choiceLayout: (["auto", "row", "grid", "column"].includes(p.choiceLayout)
      ? p.choiceLayout
      : "auto") as ProblemData["choiceLayout"],
    figureAlign: p.figureAlign === "right" ? "right" : "center",
    tags: p.tags.map((t) => t.name).sort(),
    lastSolvedAt: p.lastSolvedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  };
}

const int = (v: unknown, d: number | null = null) => {
  const n = typeof v === "number" ? v : parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : d;
};
const clamp = (n: number, a: number, b: number) => Math.max(a, Math.min(b, n));

/** 클라이언트 입력 → Prisma 데이터 (태그 제외) */
export function toProblemRow(d: Partial<ProblemData>) {
  const type = d.type === "short" ? "short" : "multiple";
  return {
    title: d.title || null,
    body: String(d.body ?? ""),
    type,
    choices: JSON.stringify(type === "multiple" ? (d.choices ?? []).slice(0, 5).map(String) : []),
    choiceLayout: d.choiceLayout ?? "auto",
    bogi: JSON.stringify((d.bogi ?? []).map(String).filter((s) => s.trim() !== "")),
    points: clamp(int(d.points, 3)!, 1, 4),
    answer: d.answer ?? null,
    explanation: d.explanation ?? null,
    memo: d.memo ?? null,
    sourceNumber: int(d.sourceNumber),
    sourceYear: int(d.sourceYear),
    sourceMonth: int(d.sourceMonth),
    sourceOrg: d.sourceOrg || "자작",
    sourceName: d.sourceName || null,
    curriculum: d.curriculum === "2015" ? "2015" : "2028",
    unitMajor: d.unitMajor ?? "",
    unitMiddle: d.unitMiddle ?? "",
    unitDetail: d.unitDetail ?? "",
    originalImage: d.originalImage || null,
    figureImage: d.figureImage || null,
    figureWidth: clamp(int(d.figureWidth, 60)!, 10, 100),
    figureAlign: d.figureAlign === "right" ? "right" : "center",
    difficulty: clamp(int(d.difficulty, 3)!, 1, 5),
    importance: clamp(int(d.importance, 3)!, 1, 5),
    handwriting: d.handwriting || null,
  };
}

export function normalizeTags(tags: unknown): string[] {
  if (!Array.isArray(tags)) return [];
  return Array.from(
    new Set(
      tags
        .map((t) => String(t).trim().replace(/^#/, "").replace(/\s+/g, "_"))
        .filter(Boolean),
    ),
  );
}

export function tagConnect(tags: string[]) {
  return tags.map((name) => ({ where: { name }, create: { name } }));
}

export async function getSetting(key: string, fallback = ""): Promise<string> {
  const s = await prisma.setting.findUnique({ where: { key } });
  return s?.value ?? fallback;
}
