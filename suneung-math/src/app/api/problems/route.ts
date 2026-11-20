import { NextRequest, NextResponse } from "next/server";
import { normalizeTags, prisma, problemInclude, tagConnect, toProblemData, toProblemRow } from "@/lib/db";
import { buildOrder, buildProblemWhere } from "@/lib/problemQuery";

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const where = buildProblemWhere(sp);
  const take = Math.min(parseInt(sp.get("limit") ?? "200", 10) || 200, 1000);
  const [rows, total] = await Promise.all([
    prisma.problem.findMany({ where, include: problemInclude, orderBy: buildOrder(sp.get("sort")), take }),
    prisma.problem.count({ where }),
  ]);
  return NextResponse.json({ total, items: rows.map(toProblemData) });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!String(body.body ?? "").trim()) return NextResponse.json({ error: "문제 본문을 입력하세요." }, { status: 400 });
  const tags = normalizeTags(body.tags);
  const row = await prisma.problem.create({
    data: { ...toProblemRow(body), tags: { connectOrCreate: tagConnect(tags) } },
    include: problemInclude,
  });
  return NextResponse.json(toProblemData(row), { status: 201 });
}
