import { NextRequest, NextResponse } from "next/server";
import { prisma, problemInclude, toProblemData } from "@/lib/db";

/** 유사 문항: 같은 태그 수 + 같은 세부유형/중단원 + 번호 근접도로 점수화 */
export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const base = await prisma.problem.findUnique({ where: { id }, include: problemInclude });
  if (!base) return NextResponse.json([], { status: 404 });
  const tagNames = base.tags.map((t) => t.name);
  const cands = await prisma.problem.findMany({
    where: {
      id: { not: id },
      OR: [
        { tags: { some: { name: { in: tagNames.length ? tagNames : ["__none__"] } } } },
        ...(base.unitMiddle ? [{ unitMiddle: base.unitMiddle }] : []),
      ],
    },
    include: problemInclude,
    take: 100,
  });
  const scored = cands
    .map((c) => {
      const shared = c.tags.filter((t) => tagNames.includes(t.name)).length;
      let score = shared * 3;
      if (base.unitDetail && c.unitDetail === base.unitDetail) score += 3;
      if (c.unitMiddle === base.unitMiddle) score += 1;
      if (base.sourceNumber && c.sourceNumber) score += Math.max(0, 2 - Math.abs(base.sourceNumber - c.sourceNumber) / 3);
      return { score, p: c };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
  return NextResponse.json(scored.map((s) => ({ score: Math.round(s.score * 10) / 10, ...toProblemData(s.p) })));
}
