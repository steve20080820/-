import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createExamFromProblems } from "@/lib/exam";

export async function GET() {
  const exams = await prisma.examPaper.findMany({
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { items: true } }, items: { select: { problem: { select: { points: true } } } } },
  });
  return NextResponse.json(
    exams.map((e) => ({
      id: e.id,
      title: e.title,
      paperSize: e.paperSize,
      count: e._count.items,
      totalPoints: e.items.reduce((s, i) => s + i.problem.points, 0),
      updatedAt: e.updatedAt.toISOString(),
    })),
  );
}

export async function POST(req: NextRequest) {
  const { problemIds, title } = await req.json();
  if (!Array.isArray(problemIds) || problemIds.length === 0)
    return NextResponse.json({ error: "담긴 문항이 없습니다." }, { status: 400 });
  const exam = await createExamFromProblems(problemIds.map(String), title);
  return NextResponse.json({ id: exam.id }, { status: 201 });
}
