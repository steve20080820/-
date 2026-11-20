import { NextRequest, NextResponse } from "next/server";
import { normalizeTags, prisma, problemInclude, tagConnect, toProblemData, toProblemRow } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const row = await prisma.problem.findUnique({
    where: { id },
    include: { ...problemInclude, solveLogs: { orderBy: { solvedAt: "desc" }, take: 50 } },
  });
  if (!row) return NextResponse.json({ error: "not found" }, { status: 404 });
  return NextResponse.json({
    ...toProblemData(row),
    solveLogs: row.solveLogs.map((l) => ({ ...l, solvedAt: l.solvedAt.toISOString() })),
  });
}

export async function PUT(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const tags = normalizeTags(body.tags);
  const row = await prisma.problem.update({
    where: { id },
    data: { ...toProblemRow(body), tags: { set: [], connectOrCreate: tagConnect(tags) } },
    include: problemInclude,
  });
  // 어디에도 쓰이지 않는 태그 정리
  await prisma.tag.deleteMany({ where: { problems: { none: {} } } });
  return NextResponse.json(toProblemData(row));
}

/** 부분 수정 (별점, 메모, 손글씨 등 오답관리 필드) */
export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  const body = await req.json();
  const allowed = ["difficulty", "importance", "memo", "handwriting", "answer", "explanation"] as const;
  const data: Record<string, unknown> = {};
  for (const k of allowed) if (k in body) data[k] = body[k];
  const row = await prisma.problem.update({ where: { id }, data, include: problemInclude });
  return NextResponse.json(toProblemData(row));
}

export async function DELETE(_: NextRequest, { params }: Ctx) {
  const { id } = await params;
  await prisma.problem.delete({ where: { id } });
  await prisma.tag.deleteMany({ where: { problems: { none: {} } } });
  return NextResponse.json({ ok: true });
}
