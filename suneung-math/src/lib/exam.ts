import type { Prisma } from "@prisma/client";
import { prisma, problemInclude, toProblemData } from "./db";
import type { ExamData } from "./types";

export const examInclude = {
  items: { orderBy: { order: "asc" }, include: { problem: { include: problemInclude } } },
} satisfies Prisma.ExamPaperInclude;

type ExamRow = Prisma.ExamPaperGetPayload<{ include: typeof examInclude }>;

export function toExamData(e: ExamRow): ExamData {
  return {
    id: e.id,
    title: e.title,
    period: e.period,
    area: e.area,
    paperSize: e.paperSize === "A4" ? "A4" : "B4",
    distribute: e.distribute,
    showSource: e.showSource,
    footer: e.footer,
    updatedAt: e.updatedAt.toISOString(),
    items: e.items.map((it) => ({
      id: it.id,
      problemId: it.problemId,
      order: it.order,
      spacing: it.spacing,
      breakBefore: it.breakBefore === "column" || it.breakBefore === "page" ? it.breakBefore : "none",
      problem: toProblemData(it.problem),
    })),
  };
}

/** 배점에 따른 기본 풀이 공간(mm) */
export function defaultSpacing(points: number) {
  return points >= 4 ? 70 : points === 3 ? 45 : 30;
}

export async function createExamFromProblems(problemIds: string[], title?: string) {
  const probs = await prisma.problem.findMany({ where: { id: { in: problemIds } }, select: { id: true, points: true } });
  const byId = new Map(probs.map((p) => [p.id, p]));
  const ordered = problemIds.map((id) => byId.get(id)).filter((p): p is NonNullable<typeof p> => Boolean(p));
  const exam = await prisma.examPaper.create({
    data: {
      ...(title ? { title } : {}),
      items: {
        create: ordered.map((p, i) => ({ problemId: p.id, order: i, spacing: defaultSpacing(p.points) })),
      },
    },
  });
  return exam;
}
