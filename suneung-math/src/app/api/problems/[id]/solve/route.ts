import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

/** 풀이 기록 추가 (회독 트래킹) */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { correct, timeSec, note } = await req.json();
  const ok = Boolean(correct);
  const [log] = await prisma.$transaction([
    prisma.solveLog.create({
      data: { problemId: id, correct: ok, timeSec: Number.isFinite(timeSec) ? timeSec : null, note: note || null },
    }),
    prisma.problem.update({
      where: { id },
      data: { solveCount: { increment: 1 }, wrongCount: ok ? undefined : { increment: 1 }, lastSolvedAt: new Date() },
    }),
  ]);
  return NextResponse.json(log, { status: 201 });
}

/** 풀이 기록 삭제: ?logId= */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const logId = req.nextUrl.searchParams.get("logId");
  if (!logId) return NextResponse.json({ error: "logId required" }, { status: 400 });
  await prisma.solveLog.delete({ where: { id: logId } });
  const logs = await prisma.solveLog.findMany({ where: { problemId: id }, orderBy: { solvedAt: "desc" } });
  await prisma.problem.update({
    where: { id },
    data: {
      solveCount: logs.length,
      wrongCount: logs.filter((l) => !l.correct).length,
      lastSolvedAt: logs[0]?.solvedAt ?? null,
    },
  });
  return NextResponse.json({ ok: true });
}
